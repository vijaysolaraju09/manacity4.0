const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const EventUpdate = require('../models/EventUpdate');
const Match = require('../models/Match');
const LeaderboardEntry = require('../models/LeaderboardEntry');
const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');

const { Types } = mongoose;

const REGISTRATION_STATUSES_FOR_NOTIFICATIONS = ['registered', 'checked_in'];
const EVENT_STATUS_VALUES = ['draft', 'published', 'ongoing', 'completed', 'canceled'];
const PUBLIC_EVENT_STATUSES = ['published', 'ongoing'];
const LIFECYCLE_STATUS_VALUES = ['upcoming', 'ongoing', 'past'];

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof Types.ObjectId) return value;
  if (Types.ObjectId.isValid(value)) return new Types.ObjectId(value);
  return null;
};

const computeIsRegistrationOpen = (event) => {
  if (!event) return false;
  if (event.status !== 'published') return false;
  const openAt = event.registrationOpenAt?.getTime?.() ?? new Date(event.registrationOpenAt).getTime();
  const closeAt = event.registrationCloseAt?.getTime?.() ?? new Date(event.registrationCloseAt).getTime();
  if (!Number.isFinite(openAt) || !Number.isFinite(closeAt)) return false;
  const now = Date.now();
  return now >= openAt && now <= closeAt;
};

const isAdminUser = (user) => user?.role === 'admin';

const isOrganizer = (event, user) => {
  if (!event || !user) return false;
  if (isAdminUser(user)) return true;
  return String(event.createdBy) === String(user._id);
};

const buildSort = (rawSort = '-startAt') => {
  const sort = typeof rawSort === 'string' && rawSort.trim().length ? rawSort.trim() : '-startAt';
  const sortObj = {};
  const fields = sort.split(',');
  for (const field of fields) {
    const trimmed = field.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('-')) sortObj[trimmed.slice(1)] = -1;
    else sortObj[trimmed] = 1;
  }
  if (!Object.keys(sortObj).length) sortObj.startAt = -1;
  return sortObj;
};

const buildParticipantFromRegistration = (registration, seed) => {
  if (!registration) return null;
  const user = registration.user && registration.user.name ? registration.user : null;
  const displayName =
    registration.teamName || user?.name || user?.username || registration.ign || 'Participant';
  return {
    registration: registration._id,
    user: registration.user?._id || registration.user || undefined,
    teamName: registration.teamName,
    displayName,
    seed,
  };
};

const mapMatchForResponse = (match) => {
  if (!match) return match;
  return {
    id: match._id.toString(),
    _id: match._id,
    event: match.event,
    round: match.round,
    stage: match.stage,
    order: match.order,
    participantA: match.participantA || null,
    participantB: match.participantB || null,
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    winner: match.winner || null,
    status: match.status,
    reports: Array.isArray(match.reports)
      ? match.reports.map((report) => ({
          reportedBy: report.reportedBy,
          scoreA: report.scoreA,
          scoreB: report.scoreB,
          note: report.note,
          createdAt: report.createdAt,
        }))
      : [],
    lobbyInfo: match.lobbyInfo || null,
    advanceTo: match.advanceTo || null,
    createdAt: match.createdAt,
    updatedAt: match.updatedAt,
  };
};

const notifyUsers = async (userIds, message) => {
  if (!message) return;
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  const prepared = [];
  for (const id of ids) {
    const objectId = toObjectId(id);
    if (!objectId) continue;
    prepared.push({ userId: objectId, type: 'event', message });
  }
  if (!prepared.length) return;
  try {
    await Notification.insertMany(prepared, { ordered: false });
  } catch (err) {
    if (err?.code !== 11000) throw err;
  }
};

const notifyRegisteredUsers = async (eventId, message) => {
  if (!message) return;
  const registrations = await EventRegistration.find({
    event: eventId,
    status: { $in: REGISTRATION_STATUSES_FOR_NOTIFICATIONS },
  })
    .select('user')
    .lean();
  const userIds = registrations.map((reg) => reg.user);
  if (userIds.length) await notifyUsers(userIds, message);
};

const loadEventOrThrow = async (id) => {
  const event = await Event.findById(id);
  if (!event) throw AppError.notFound('EVENT_NOT_FOUND', 'Event not found');
  return event;
};

const toDateSafe = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const deriveLifecycleStatus = (event) => {
  if (!event) return 'upcoming';
  if (event.status === 'canceled' || event.status === 'completed') return 'past';
  const start = toDateSafe(event.startAt);
  const end = toDateSafe(event.endAt);
  const now = new Date();
  if (start && start > now) return 'upcoming';
  if (event.status === 'ongoing') return 'ongoing';
  if (start && start <= now && (!end || end >= now)) return 'ongoing';
  return 'past';
};

const buildLifecycleFilters = (statuses) => {
  if (!statuses || !statuses.size) return [];
  const now = new Date();
  const filters = [];
  if (statuses.has('upcoming')) {
    filters.push({
      $and: [
        { startAt: { $gt: now } },
        { status: { $nin: ['completed', 'canceled', 'draft'] } },
      ],
    });
  }
  if (statuses.has('ongoing')) {
    filters.push({
      $or: [
        { status: 'ongoing' },
        {
          $and: [
            { status: { $nin: ['completed', 'canceled', 'draft'] } },
            { startAt: { $lte: now } },
            {
              $or: [
                { endAt: { $exists: false } },
                { endAt: null },
                { endAt: { $gte: now } },
              ],
            },
          ],
        },
      ],
    });
  }
  if (statuses.has('past')) {
    filters.push({
      $or: [
        { status: { $in: ['completed', 'canceled'] } },
        { endAt: { $lt: now } },
      ],
    });
  }
  return filters;
};

exports.listEvents = async (req, res, next) => {
  try {
    const {
      q,
      category,
      type,
      status,
      from,
      to,
      page = 1,
      pageSize = 12,
      limit: limitParam,
      sort = '-startAt',
    } = req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const rawLimit = limitParam ?? pageSize;
    const limit = Math.max(Math.min(Number(rawLimit) || 12, 50), 1);
    const trimmedQuery = typeof q === 'string' ? q.trim() : '';

    const statusTokens = typeof status === 'string'
      ? status
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      : [];

    const includeAllStatuses = statusTokens.some((token) => ['all', 'any'].includes(token));
    const lifecycleStatuses = new Set();
    const eventStatuses = new Set();

    for (const token of statusTokens) {
      if (LIFECYCLE_STATUS_VALUES.includes(token)) lifecycleStatuses.add(token);
      if (EVENT_STATUS_VALUES.includes(token)) eventStatuses.add(token);
      if (!LIFECYCLE_STATUS_VALUES.includes(token) && !EVENT_STATUS_VALUES.includes(token)) {
        eventStatuses.add(token);
      }
    }

    const andConditions = [
      {
        $or: [
          { visibility: 'public' },
          { visibility: { $exists: false } },
          { visibility: null },
        ],
      },
    ];

    if (category) andConditions.push({ category });
    if (type) andConditions.push({ type });

    const startRange = {};
    const fromDate = toDateSafe(from);
    const toDate = toDateSafe(to);
    if (fromDate) startRange.$gte = fromDate;
    if (toDate) startRange.$lte = toDate;
    if (Object.keys(startRange).length) andConditions.push({ startAt: startRange });

    if (statusTokens.length) {
      if (!includeAllStatuses && eventStatuses.size) {
        const statusesArr = Array.from(eventStatuses);
        andConditions.push(
          statusesArr.length === 1
            ? { status: statusesArr[0] }
            : { status: { $in: statusesArr } }
        );
      }
      const lifecycleFilters = buildLifecycleFilters(lifecycleStatuses);
      if (lifecycleFilters.length === 1) andConditions.push(lifecycleFilters[0]);
      else if (lifecycleFilters.length > 1) andConditions.push({ $or: lifecycleFilters });
    } else {
      andConditions.push({ status: { $in: PUBLIC_EVENT_STATUSES } });
    }

    if (trimmedQuery) {
      andConditions.push({ $text: { $search: trimmedQuery } });
    }

    const filter = andConditions.length === 1 ? andConditions[0] : { $and: andConditions };

    const skip = (pageNumber - 1) * limit;
    const sortObj = buildSort(sort);

    const [items, total] = await Promise.all([
      Event.find(filter).sort(sortObj).skip(skip).limit(limit),
      Event.countDocuments(filter),
    ]);

    res.json({
      ok: true,
      data: {
        items: items.map((event) => ({
          ...event.toCardJSON(),
          lifecycleStatus: deriveLifecycleStatus(event),
        })),
        total,
        page: pageNumber,
        pageSize: limit,
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.createEvent = async (req, res, next) => {
  try {
    const payload = { ...req.body, createdBy: req.user?._id }; // organizer or admin
    if (!payload.createdBy)
      throw AppError.forbidden('NOT_ALLOWED', 'Only authenticated users can create events');
    const event = await Event.create(payload);
    res.status(201).json({ ok: true, data: event.toDetailJSON(), traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.updateEvent = async (req, res, next) => {
  try {
    const event = await loadEventOrThrow(req.params.id);
    if (!isOrganizer(event, req.user))
      throw AppError.forbidden('NOT_ALLOWED', 'Only organizers can update events');

    const updatable = [
      'title',
      'category',
      'type',
      'format',
      'teamSize',
      'maxParticipants',
      'registrationOpenAt',
      'registrationCloseAt',
      'startAt',
      'endAt',
      'timezone',
      'mode',
      'venue',
      'geo',
      'visibility',
      'description',
      'rules',
      'prizePool',
      'bannerUrl',
      'coverUrl',
    ];
    const update = {};
    for (const key of updatable) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) update[key] = req.body[key];
    }
    Object.assign(event, update);
    await event.save();
    res.json({ ok: true, data: event.toDetailJSON(), traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.publishEvent = async (req, res, next) => {
  try {
    const event = await loadEventOrThrow(req.params.id);
    if (!isOrganizer(event, req.user))
      throw AppError.forbidden('NOT_ALLOWED', 'Only organizers can publish events');
    if (event.status !== 'draft')
      throw AppError.badRequest('INVALID_STATUS', 'Event cannot be published');
    if (event.registrationOpenAt >= event.registrationCloseAt)
      throw AppError.badRequest('INVALID_WINDOW', 'Registration window is invalid');
    event.status = 'published';
    await event.save();
    await notifyUsers(event.createdBy, `${event.title} is now published`);
    res.json({ ok: true, data: event.toDetailJSON(), traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.startEvent = async (req, res, next) => {
  try {
    const event = await loadEventOrThrow(req.params.id);
    if (!isOrganizer(event, req.user))
      throw AppError.forbidden('NOT_ALLOWED', 'Only organizers can start events');
    event.status = 'ongoing';
    await event.save();
    await notifyRegisteredUsers(event._id, `${event.title} has started`);
    res.json({ ok: true, data: event.toDetailJSON(), traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.completeEvent = async (req, res, next) => {
  try {
    const event = await loadEventOrThrow(req.params.id);
    if (!isOrganizer(event, req.user))
      throw AppError.forbidden('NOT_ALLOWED', 'Only organizers can complete events');
    event.status = 'completed';
    await event.save();
    await notifyRegisteredUsers(event._id, `${event.title} has been completed`);
    res.json({ ok: true, data: event.toDetailJSON(), traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.cancelEvent = async (req, res, next) => {
  try {
    const event = await loadEventOrThrow(req.params.id);
    if (!isOrganizer(event, req.user))
      throw AppError.forbidden('NOT_ALLOWED', 'Only organizers can cancel events');
    event.status = 'canceled';
    await event.save();
    await notifyRegisteredUsers(event._id, `${event.title} has been canceled`);
    res.json({ ok: true, data: event.toDetailJSON(), traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.getEvent = async (req, res, next) => {
  try {
    const event = await loadEventOrThrow(req.params.id);
    const data = event.toDetailJSON();
    data.isRegistrationOpen = computeIsRegistrationOpen(event);
    if (req.user) {
      const registration = await EventRegistration.findOne({
        event: event._id,
        user: req.user._id,
      })
        .select('_id status')
        .lean();
      data.registration = registration || null;
    }
    res.json({ ok: true, data, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.register = async (req, res, next) => {
  try {
    const event = await loadEventOrThrow(req.params.id);
    if (!req.user) throw AppError.unauthorized('LOGIN_REQUIRED', 'Login required');
    if (!computeIsRegistrationOpen(event))
      throw AppError.badRequest('REGISTRATION_CLOSED', 'Registration is closed');

    if (event.teamSize > 1) {
      const members = Array.isArray(req.body.members) ? req.body.members : [];
      const totalMembers = members.length + 1; // include captain
      if (totalMembers > event.teamSize) {
        throw AppError.badRequest(
          'TEAM_TOO_LARGE',
          `Team size cannot exceed ${event.teamSize}`
        );
      }
      if (!req.body.teamName)
        throw AppError.badRequest('TEAM_NAME_REQUIRED', 'Team name is required for team events');
    }

    const members = Array.isArray(req.body.members)
      ? req.body.members
          .map((member) => {
            if (!member) return null;
            if (typeof member === 'string' || member instanceof Types.ObjectId) {
              const objectId = toObjectId(member);
              if (!objectId) return null;
              return { user: objectId };
            }
            const objectId = toObjectId(member.user);
            if (!objectId) return null;
            return { user: objectId, ign: member.ign };
          })
          .filter(Boolean)
      : [];

    let status = 'waitlisted';
    if (event.maxParticipants > 0) {
      const incResult = await Event.updateOne(
        { _id: event._id, registeredCount: { $lt: event.maxParticipants } },
        { $inc: { registeredCount: 1 } }
      );
      if (incResult.modifiedCount === 1) status = 'registered';
    }

    const registration = await EventRegistration.create({
      event: event._id,
      user: req.user._id,
      teamName: req.body.teamName,
      ign: req.body.ign,
      contact: req.body.contact,
      lobby: req.body.lobby,
      members,
      metadata: req.body.metadata,
      status,
    });

    if (status === 'registered') {
      await notifyUsers(req.user._id, `You are registered for ${event.title}`);
    } else {
      await notifyUsers(req.user._id, `You are waitlisted for ${event.title}`);
    }

    res.json({
      ok: true,
      data: {
        registration,
        status,
      },
      traceId: req.traceId,
    });
  } catch (err) {
    if (err?.code === 11000) {
      next(AppError.conflict('ALREADY_REGISTERED', 'Already registered'));
    } else {
      next(err);
    }
  }
};

exports.unregister = async (req, res, next) => {
  try {
    const event = await loadEventOrThrow(req.params.id);
    if (!req.user) throw AppError.unauthorized('LOGIN_REQUIRED', 'Login required');
    if (new Date(event.startAt).getTime() <= Date.now())
      throw AppError.badRequest('EVENT_STARTED', 'Event already started');

    const registration = await EventRegistration.findOne({
      event: event._id,
      user: req.user._id,
    });
    if (!registration) throw AppError.notFound('REG_NOT_FOUND', 'Registration not found');

    await registration.deleteOne();
    if (registration.status === 'registered') {
      await Event.updateOne({ _id: event._id, registeredCount: { $gt: 0 } }, { $inc: { registeredCount: -1 } });
    }

    await notifyUsers(req.user._id, `You have been removed from ${event.title}`);

    res.json({ ok: true, data: true, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.getMyRegistration = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthorized('LOGIN_REQUIRED', 'Login required');
    const registration = await EventRegistration.findOne({
      event: req.params.id,
      user: req.user._id,
    })
      .lean()
      .exec();
    res.json({ ok: true, data: registration, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.listRegistrations = async (req, res, next) => {
  try {
    const event = await loadEventOrThrow(req.params.id);
    const isPrivileged = isOrganizer(event, req.user);

    const query = { event: event._id };
    const countPromise = EventRegistration.countDocuments(query);
    const listQuery = EventRegistration.find(query)
      .sort({ createdAt: 1 })
      .populate('user', 'name avatar')
      .lean();

    if (!isPrivileged) {
      listQuery.select('teamName user status createdAt');
      listQuery.limit(20);
    }

    const [items, count] = await Promise.all([listQuery, countPromise]);
    res.json({
      ok: true,
      data: {
        items,
        count,
        preview: !isPrivileged,
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.postUpdate = async (req, res, next) => {
  try {
    const event = await loadEventOrThrow(req.params.id);
    if (!isOrganizer(event, req.user))
      throw AppError.forbidden('NOT_ALLOWED', 'Only organizers can post updates');

    const update = await EventUpdate.create({
      event: event._id,
      type: req.body.type,
      message: req.body.message,
      postedBy: req.user._id,
      isPinned: !!req.body.isPinned,
    });
    await Event.updateOne({ _id: event._id }, { $inc: { updatesCount: 1 } });
    await notifyRegisteredUsers(event._id, `New update for ${event.title}`);
    res.status(201).json({ ok: true, data: update, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.listUpdates = async (req, res, next) => {
  try {
    const sort = req.query.pinnedFirst === 'true' ? { isPinned: -1, createdAt: -1 } : { createdAt: -1 };
    const updates = await EventUpdate.find({ event: req.params.id }).sort(sort).lean();
    res.json({ ok: true, data: updates, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.getLeaderboard = async (req, res, next) => {
  try {
    const event = await loadEventOrThrow(req.params.id);
    const entries = await LeaderboardEntry.find({ event: event._id })
      .sort({ rank: 1, points: -1 })
      .lean();
    res.json({
      ok: true,
      data: {
        entries,
        version: event.leaderboardVersion,
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.postLeaderboard = async (req, res, next) => {
  try {
    const event = await loadEventOrThrow(req.params.id);
    if (!isOrganizer(event, req.user))
      throw AppError.forbidden('NOT_ALLOWED', 'Only organizers can update leaderboard');

    const payload = Array.isArray(req.body) ? req.body : req.body?.entries;
    if (!Array.isArray(payload))
      throw AppError.badRequest('INVALID_PAYLOAD', 'Entries array required');

    const entries = payload.map((entry) => ({
      participantId: entry.participantId ? toObjectId(entry.participantId) : null,
      user: entry.user ? toObjectId(entry.user) : null,
      teamName: entry.teamName,
      points: Number.isFinite(entry.points) ? entry.points : Number(entry.points) || 0,
      rank: entry.rank,
      wins: entry.wins,
      losses: entry.losses,
      kills: entry.kills,
      time: entry.time,
      metadata: entry.metadata,
    }));

    const bulkOps = entries
      .map((entry) => {
        const filter = { event: event._id };
        if (entry.participantId) filter.participantId = entry.participantId;
        else if (entry.user) filter.user = entry.user;
        else if (entry.teamName) filter.teamName = entry.teamName;
        else return null;
        return {
          updateOne: {
            filter,
            update: { $set: { ...entry, event: event._id } },
            upsert: true,
          },
        };
      })
      .filter(Boolean);

    if (bulkOps.length) await LeaderboardEntry.bulkWrite(bulkOps);

    const keys = new Set(
      entries.map((entry) =>
        JSON.stringify({
          participantId: entry.participantId ? entry.participantId.toString() : null,
          user: entry.user ? entry.user.toString() : null,
          teamName: entry.teamName || null,
        })
      )
    );

    const existing = await LeaderboardEntry.find({ event: event._id })
      .select('_id participantId user teamName')
      .lean();
    const removals = existing
      .filter((doc) => {
        const key = JSON.stringify({
          participantId: doc.participantId ? doc.participantId.toString() : null,
          user: doc.user ? doc.user.toString() : null,
          teamName: doc.teamName || null,
        });
        return !keys.has(key);
      })
      .map((doc) => doc._id);
    if (removals.length) await LeaderboardEntry.deleteMany({ _id: { $in: removals } });

    event.leaderboardVersion += 1;
    await event.save();

    const updatedEntries = await LeaderboardEntry.find({ event: event._id })
      .sort({ rank: 1, points: -1 })
      .lean();

    res.json({
      ok: true,
      data: { entries: updatedEntries, version: event.leaderboardVersion },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

const seedSingleMatch = async (event, registrations) => {
  if (registrations.length < 2) {
    throw AppError.badRequest('NOT_ENOUGH_PARTICIPANTS', 'Need at least two participants');
  }
  await Match.deleteMany({ event: event._id });
  const [first, second] = registrations;
  const match = await Match.create({
    event: event._id,
    round: 1,
    order: 0,
    stage: 'Final',
    participantA: buildParticipantFromRegistration(first, 1),
    participantB: buildParticipantFromRegistration(second, 2),
    status: 'scheduled',
  });
  return [match];
};

const seedSingleElimination = async (event, registrations) => {
  if (!registrations.length)
    throw AppError.badRequest('NO_PARTICIPANTS', 'No registrations to seed');
  await Match.deleteMany({ event: event._id });

  const participants = registrations.map((registration, idx) =>
    buildParticipantFromRegistration(registration, idx + 1)
  );

  const rounds = [];
  let current = participants.length;
  let roundIndex = 1;
  while (current > 1) {
    const matchesThisRound = Math.ceil(current / 2);
    rounds.push({ round: roundIndex, size: matchesThisRound });
    current = matchesThisRound;
    roundIndex += 1;
  }
  if (!rounds.length) rounds.push({ round: 1, size: 1 });

  const matchDocs = [];
  for (const info of rounds) {
    const stageName =
      info.round === rounds.length
        ? 'Final'
        : info.round === rounds.length - 1
        ? 'Semi Final'
        : `Round ${info.round}`;
    for (let order = 0; order < info.size; order += 1) {
      matchDocs.push(
        new Match({
          event: event._id,
          round: info.round,
          order,
          stage: stageName,
          status: 'scheduled',
        })
      );
    }
  }

  const inserted = await Match.insertMany(matchDocs);

  const updates = [];
  for (const match of inserted) {
    const nextRound = match.round + 1;
    const nextMatch = inserted.find(
      (candidate) => candidate.round === nextRound && candidate.order === Math.floor(match.order / 2)
    );
    if (nextMatch) {
      updates.push({
        updateOne: {
          filter: { _id: match._id },
          update: {
            $set: {
              advanceTo: {
                match: nextMatch._id,
                slot: match.order % 2 === 0 ? 'A' : 'B',
              },
            },
          },
        },
      });
    }
  }
  if (updates.length) await Match.bulkWrite(updates);

  const firstRoundMatches = inserted
    .filter((match) => match.round === 1)
    .sort((a, b) => a.order - b.order);

  const propagate = [];
  const firstRoundUpdates = [];
  for (let index = 0; index < firstRoundMatches.length; index += 1) {
    const match = firstRoundMatches[index];
    const participantA = participants[index * 2] || null;
    const participantB = participants[index * 2 + 1] || null;
    const setPayload = {
      status: 'scheduled',
    };
    const unsetPayload = {};
    if (participantA) setPayload.participantA = participantA;
    else unsetPayload.participantA = '';
    if (participantB) setPayload.participantB = participantB;
    else unsetPayload.participantB = '';

    let winnerParticipant = null;
    if (participantA && !participantB) {
      setPayload.status = 'verified';
      setPayload.winner = participantA.registration;
      winnerParticipant = participantA;
    } else if (!participantA && participantB) {
      setPayload.status = 'verified';
      setPayload.winner = participantB.registration;
      winnerParticipant = participantB;
    }

    const updateDoc = { $set: setPayload };
    if (Object.keys(unsetPayload).length) updateDoc.$unset = unsetPayload;
    firstRoundUpdates.push({
      updateOne: {
        filter: { _id: match._id },
        update: updateDoc,
      },
    });

    if (winnerParticipant && match.advanceTo?.match) {
      propagate.push({
        updateOne: {
          filter: { _id: match.advanceTo.match },
          update: {
            $set: {
              [`participant${match.advanceTo.slot}`]: winnerParticipant,
            },
          },
        },
      });
    }
  }
  if (firstRoundUpdates.length) await Match.bulkWrite(firstRoundUpdates);
  if (propagate.length) await Match.bulkWrite(propagate);

  return inserted;
};

exports.seedBracket = async (req, res, next) => {
  try {
    const event = await loadEventOrThrow(req.params.id);
    if (!isOrganizer(event, req.user))
      throw AppError.forbidden('NOT_ALLOWED', 'Only organizers can seed brackets');
    if (event.type !== 'tournament')
      throw AppError.badRequest('NOT_TOURNAMENT', 'Bracket seeding only for tournaments');

    const registrations = await EventRegistration.find({
      event: event._id,
      status: { $in: ['registered', 'checked_in'] },
    })
      .populate('user', 'name username')
      .lean();

    let matches;
    if (event.format === 'single_match') {
      matches = await seedSingleMatch(event, registrations);
    } else if (event.format === 'single_elim') {
      matches = await seedSingleElimination(event, registrations);
    } else {
      throw AppError.badRequest('FORMAT_NOT_SUPPORTED', 'Format not yet supported for seeding');
    }

    await notifyRegisteredUsers(event._id, `Bracket seeded for ${event.title}`);

    const refreshed = await Match.find({ event: event._id }).sort({ round: 1, order: 1 });

    res.json({
      ok: true,
      data: {
        rounds: Object.values(
          refreshed.reduce((acc, match) => {
            const roundKey = match.round;
            if (!acc[roundKey]) acc[roundKey] = { round: roundKey, matches: [] };
            acc[roundKey].matches.push(mapMatchForResponse(match));
            return acc;
          }, {})
        ).sort((a, b) => a.round - b.round),
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.getBracket = async (req, res, next) => {
  try {
    const matches = await Match.find({ event: req.params.id })
      .sort({ round: 1, order: 1 })
      .lean();
    const rounds = Object.values(
      matches.reduce((acc, match) => {
        const roundKey = match.round;
        if (!acc[roundKey]) acc[roundKey] = { round: roundKey, matches: [] };
        acc[roundKey].matches.push(mapMatchForResponse(match));
        return acc;
      }, {})
    ).sort((a, b) => a.round - b.round);
    res.json({ ok: true, data: { rounds }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.reportMatch = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthorized('LOGIN_REQUIRED', 'Login required');
    const match = await Match.findById(req.params.matchId);
    if (!match) throw AppError.notFound('MATCH_NOT_FOUND', 'Match not found');
    const event = await Event.findById(match.event);
    if (!event) throw AppError.notFound('EVENT_NOT_FOUND', 'Event not found');

    const registrationIds = [];
    if (match.participantA?.registration) registrationIds.push(match.participantA.registration);
    if (match.participantB?.registration) registrationIds.push(match.participantB.registration);

    const registration = await EventRegistration.findOne({
      _id: { $in: registrationIds },
      $or: [{ user: req.user._id }, { 'members.user': req.user._id }],
    });
    if (!registration)
      throw AppError.forbidden('NOT_PARTICIPANT', 'Only participants can report match results');

    const scoreA = Number.isFinite(req.body.scoreA) ? req.body.scoreA : Number(req.body.scoreA);
    const scoreB = Number.isFinite(req.body.scoreB) ? req.body.scoreB : Number(req.body.scoreB);

    const report = {
      reportedBy: req.user._id,
      scoreA: Number.isFinite(scoreA) ? scoreA : undefined,
      scoreB: Number.isFinite(scoreB) ? scoreB : undefined,
      note: req.body.note,
      createdAt: new Date(),
    };

    const update = {
      $push: { reports: report },
      $set: {
        status: 'reported',
      },
    };
    if (Number.isFinite(scoreA)) update.$set.scoreA = scoreA;
    if (Number.isFinite(scoreB)) update.$set.scoreB = scoreB;
    if (req.body.lobbyInfo) update.$set.lobbyInfo = req.body.lobbyInfo;

    const updated = await Match.findByIdAndUpdate(match._id, update, { new: true });

    await notifyUsers(event.createdBy, `Match report submitted for ${event.title}`);

    res.json({ ok: true, data: mapMatchForResponse(updated), traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.verifyMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match) throw AppError.notFound('MATCH_NOT_FOUND', 'Match not found');
    const event = await Event.findById(match.event);
    if (!event) throw AppError.notFound('EVENT_NOT_FOUND', 'Event not found');
    if (!isOrganizer(event, req.user))
      throw AppError.forbidden('NOT_ALLOWED', 'Only organizers can verify matches');

    const winnerId = toObjectId(req.body.winner);
    if (!winnerId) throw AppError.badRequest('WINNER_REQUIRED', 'Winner is required');

    const participantMatchesWinner = [match.participantA, match.participantB]
      .filter(Boolean)
      .some((participant) => String(participant.registration) === String(winnerId));
    if (!participantMatchesWinner)
      throw AppError.badRequest('INVALID_WINNER', 'Winner must be one of the participants');

    const scoreA = Number.isFinite(req.body.scoreA) ? req.body.scoreA : Number(req.body.scoreA);
    const scoreB = Number.isFinite(req.body.scoreB) ? req.body.scoreB : Number(req.body.scoreB);

    const update = {
      status: 'verified',
      winner: winnerId,
    };
    if (Number.isFinite(scoreA)) update.scoreA = scoreA;
    if (Number.isFinite(scoreB)) update.scoreB = scoreB;

    const updated = await Match.findByIdAndUpdate(
      match._id,
      { $set: update },
      { new: true }
    );

    if (match.advanceTo?.match) {
      const registration = await EventRegistration.findById(winnerId).populate('user', 'name username');
      const baseParticipant =
        (match.participantA && String(match.participantA.registration) === String(winnerId)
          ? match.participantA
          : null) ||
        (match.participantB && String(match.participantB.registration) === String(winnerId)
          ? match.participantB
          : null);
      const participant = buildParticipantFromRegistration(registration, baseParticipant?.seed);
      if (participant) {
        await Match.updateOne(
          { _id: match.advanceTo.match },
          {
            $set: {
              [`participant${match.advanceTo.slot}`]: participant,
            },
          }
        );
      }
    }

    await notifyUsers(req.body.winner, `You won a match in ${event.title}`);

    res.json({ ok: true, data: mapMatchForResponse(updated), traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};
