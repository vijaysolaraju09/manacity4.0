const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const EventUpdate = require('../models/EventUpdate');
const Match = require('../models/Match');
const LeaderboardEntry = require('../models/LeaderboardEntry');
const AppError = require('../utils/AppError');

const MAX_PAGE_SIZE = 50;

const VALID_TYPES = ['tournament', 'activity'];
const VALID_CATEGORIES = [
  'freefire',
  'pubg',
  'quiz',
  'cricket',
  'volleyball',
  'campfire',
  'movie',
  'foodfest',
  'other',
];
const VALID_FORMATS = [
  'single_elim',
  'double_elim',
  'round_robin',
  'points',
  'single_match',
  'custom',
];

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const deriveLifecycleStatus = (event) => {
  if (!event) return 'upcoming';
  if (event.status === 'canceled' || event.status === 'completed') return 'past';
  const now = Date.now();
  const start = toDate(event.startAt);
  const end = toDate(event.endAt);
  if (start && now < start.getTime()) return 'upcoming';
  if (start && (!end || end.getTime() >= now)) return 'ongoing';
  return 'past';
};

const mapEvent = (event) => ({
  _id: event._id,
  title: event.title,
  type: event.type,
  category: event.category,
  format: event.format,
  startAt: event.startAt,
  endAt: event.endAt ?? null,
  registrationOpenAt: event.registrationOpenAt,
  registrationCloseAt: event.registrationCloseAt,
  status: event.status,
  lifecycleStatus: deriveLifecycleStatus(event),
  capacity: event.maxParticipants ?? 0,
  registered: event.registeredCount ?? 0,
  visibility: event.visibility,
  teamSize: event.teamSize,
});

const parseCapacity = (value) => {
  if (value === undefined || value === null) return undefined;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) && num > 0 ? Math.round(num) : undefined;
};

exports.listEvents = async (req, res, next) => {
  try {
    const { status, page = 1, pageSize = 10, sort = '-startAt', query } = req.query;
    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const size = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(pageSize, 10) || 10));

    const sortKey = typeof sort === 'string' && sort.startsWith('-') ? sort.slice(1) : sort || 'startAt';
    const sortDir = typeof sort === 'string' && sort.startsWith('-') ? -1 : 1;
    const sortObj = { [sortKey]: sortDir };

    const now = new Date();
    const filter = {};

    if (status === 'upcoming') {
      filter.status = { $nin: ['canceled', 'completed'] };
      filter.startAt = { $gt: now };
    } else if (status === 'ongoing') {
      filter.$or = [
        { status: 'ongoing' },
        {
          $and: [
            { status: { $nin: ['completed', 'canceled'] } },
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
      ];
    } else if (status === 'past') {
      filter.$or = [
        { status: { $in: ['completed', 'canceled'] } },
        { endAt: { $lt: now } },
      ];
    }

    if (typeof query === 'string' && query.trim()) {
      const safe = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.title = { $regex: safe, $options: 'i' };
    }

    const [events, total] = await Promise.all([
      Event.find(filter)
        .sort(sortObj)
        .skip((pageNumber - 1) * size)
        .limit(size)
        .lean(),
      Event.countDocuments(filter),
    ]);

    res.json({
      ok: true,
      data: {
        items: events.map(mapEvent),
        total,
        page: pageNumber,
        pageSize: size,
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.createEvent = async (req, res, next) => {
  try {
    const startAt = toDate(req.body.startAt);
    const endAt = toDate(req.body.endAt);

    if (!startAt || !endAt) {
      throw AppError.badRequest('INVALID_DATES', 'Invalid event dates');
    }

    if (endAt.getTime() <= startAt.getTime()) {
      throw AppError.badRequest('END_BEFORE_START', 'Event end must be after the start time');
    }

    const createdBy = req.user?._id;
    if (!createdBy) {
      throw AppError.unauthorized('UNAUTHORIZED', 'Admin authentication required');
    }

    const type = VALID_TYPES.includes(req.body.type) ? req.body.type : 'activity';
    const category = VALID_CATEGORIES.includes(req.body.category) ? req.body.category : 'other';
    const format = VALID_FORMATS.includes(req.body.format)
      ? req.body.format
      : type === 'tournament'
      ? 'single_elim'
      : 'single_match';
    const teamSize = parseCapacity(req.body.teamSize) || 1;
    const capacity = parseCapacity(req.body.capacity) ?? parseCapacity(req.body.maxParticipants) ?? teamSize;
    const registrationOpenAt = toDate(req.body.registrationOpenAt) || new Date();
    const registrationCloseAt = toDate(req.body.registrationCloseAt) || startAt;

    const event = await Event.create({
      title: req.body.title,
      type,
      category,
      format,
      teamSize,
      maxParticipants: capacity,
      registrationOpenAt,
      registrationCloseAt,
      startAt,
      endAt,
      timezone: req.body.timezone || 'Asia/Kolkata',
      mode: req.body.mode === 'venue' ? 'venue' : 'online',
      venue: req.body.venue,
      visibility: req.body.visibility === 'private' ? 'private' : 'public',
      status: 'draft',
      description: req.body.description || '',
      rules: req.body.rules || '',
      prizePool: req.body.prizePool,
      bannerUrl: req.body.bannerUrl,
      coverUrl: req.body.coverUrl,
      createdBy,
    });

    res.status(201).json({
      ok: true,
      data: mapEvent(event),
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      throw AppError.notFound('EVENT_NOT_FOUND', 'Event not found');
    }

    if (req.body.title !== undefined) {
      event.title = req.body.title;
    }

    if (req.body.type !== undefined && VALID_TYPES.includes(req.body.type)) {
      event.type = req.body.type;
    }

    if (req.body.category !== undefined && VALID_CATEGORIES.includes(req.body.category)) {
      event.category = req.body.category;
    }

    if (req.body.format !== undefined && VALID_FORMATS.includes(req.body.format)) {
      event.format = req.body.format;
    }

    if (req.body.visibility !== undefined) {
      event.visibility = req.body.visibility === 'private' ? 'private' : 'public';
    }

    if (req.body.mode !== undefined) {
      event.mode = req.body.mode === 'venue' ? 'venue' : 'online';
    }

    if (req.body.venue !== undefined) {
      event.venue = req.body.venue;
    }

    if (req.body.description !== undefined) {
      event.description = req.body.description;
    }

    if (req.body.rules !== undefined) {
      event.rules = req.body.rules;
    }

    if (req.body.prizePool !== undefined) {
      event.prizePool = req.body.prizePool;
    }

    if (req.body.bannerUrl !== undefined) {
      event.bannerUrl = req.body.bannerUrl;
    }

    if (req.body.coverUrl !== undefined) {
      event.coverUrl = req.body.coverUrl;
    }

    if (req.body.teamSize !== undefined) {
      const size = parseCapacity(req.body.teamSize);
      if (size) event.teamSize = size;
    }

    if (req.body.startAt !== undefined) {
      const startDate = toDate(req.body.startAt);
      if (!startDate) {
        throw AppError.badRequest('INVALID_START', 'Invalid startAt');
      }
      event.startAt = startDate;
    }

    if (req.body.endAt !== undefined) {
      const endDate = toDate(req.body.endAt);
      if (!endDate) {
        throw AppError.badRequest('INVALID_END', 'Invalid endAt');
      }
      event.endAt = endDate;
    }

    if (event.startAt && event.endAt && event.endAt.getTime() <= event.startAt.getTime()) {
      throw AppError.badRequest('END_BEFORE_START', 'Event end must be after the start time');
    }

    if (req.body.registrationOpenAt !== undefined) {
      const openDate = toDate(req.body.registrationOpenAt);
      if (!openDate) throw AppError.badRequest('INVALID_REG_OPEN', 'Invalid registration open date');
      event.registrationOpenAt = openDate;
    }

    if (req.body.registrationCloseAt !== undefined) {
      const closeDate = toDate(req.body.registrationCloseAt);
      if (!closeDate) throw AppError.badRequest('INVALID_REG_CLOSE', 'Invalid registration close date');
      event.registrationCloseAt = closeDate;
    }

    if (req.body.timezone !== undefined) {
      event.timezone = req.body.timezone;
    }

    if (req.body.status !== undefined) {
      const allowedStatuses = ['draft', 'published', 'ongoing', 'completed', 'canceled'];
      if (allowedStatuses.includes(req.body.status)) {
        event.status = req.body.status;
      }
    }

    if (req.body.geo !== undefined) {
      event.geo = req.body.geo;
    }

    if (req.body.capacity !== undefined || req.body.maxParticipants !== undefined) {
      const registeredCount = event.registeredCount ?? 0;
      const nextCapacity =
        parseCapacity(req.body.capacity) ?? parseCapacity(req.body.maxParticipants);
      if (nextCapacity !== undefined) {
        if (nextCapacity < registeredCount) {
          throw AppError.badRequest(
            'CAPACITY_TOO_LOW',
            'Capacity cannot be less than registered count'
          );
        }
        event.maxParticipants = nextCapacity;
      }
    }

    await event.save();

    res.json({
      ok: true,
      data: mapEvent(event),
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.publishEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      throw AppError.notFound('EVENT_NOT_FOUND', 'Event not found');
    }

    if (event.status !== 'draft') {
      throw AppError.badRequest('INVALID_STATUS', 'Event cannot be published');
    }

    if (!event.registrationOpenAt || !event.registrationCloseAt) {
      throw AppError.badRequest('INVALID_WINDOW', 'Registration window is invalid');
    }

    if (event.registrationOpenAt >= event.registrationCloseAt) {
      throw AppError.badRequest('INVALID_WINDOW', 'Registration window is invalid');
    }

    event.status = 'published';
    await event.save();

    res.json({ ok: true, data: mapEvent(event), traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.startEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      throw AppError.notFound('EVENT_NOT_FOUND', 'Event not found');
    }

    if (!['published', 'ongoing'].includes(event.status)) {
      throw AppError.badRequest('INVALID_STATUS', 'Event cannot be started');
    }

    event.status = 'ongoing';
    await event.save();

    res.json({ ok: true, data: mapEvent(event), traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.completeEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      throw AppError.notFound('EVENT_NOT_FOUND', 'Event not found');
    }

    if (!['published', 'ongoing', 'completed'].includes(event.status)) {
      throw AppError.badRequest('INVALID_STATUS', 'Event cannot be completed');
    }

    event.status = 'completed';
    await event.save();

    res.json({ ok: true, data: mapEvent(event), traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.cancelEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      throw AppError.notFound('EVENT_NOT_FOUND', 'Event not found');
    }

    event.status = 'canceled';
    await event.save();

    res.json({ ok: true, data: mapEvent(event), traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      throw AppError.notFound('EVENT_NOT_FOUND', 'Event not found');
    }

    await Promise.all([
      EventRegistration.deleteMany({ event: event._id }),
      EventUpdate.deleteMany({ event: event._id }),
      Match.deleteMany({ event: event._id }),
      LeaderboardEntry.deleteMany({ event: event._id }),
      event.deleteOne(),
    ]);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
