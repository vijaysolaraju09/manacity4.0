const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const EventUpdate = require('../models/EventUpdate');
const AppError = require('../utils/AppError');

function computeIsRegistrationOpen(event) {
  const now = Date.now();
  return (
    event.status === 'published' &&
    now >= event.registrationOpenAt.getTime() &&
    now <= event.registrationCloseAt.getTime()
  );
}

// Public listing
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
      sort = 'startAt',
    } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (from || to) {
      filter.startAt = {};
      if (from) filter.startAt.$gte = new Date(from);
      if (to) filter.startAt.$lte = new Date(to);
    }
    if (q) filter.$text = { $search: q };

    const skip = (Number(page) - 1) * Number(pageSize);
    const sortObj = {};
    if (sort.startsWith('-')) sortObj[sort.slice(1)] = -1;
    else sortObj[sort] = 1;

    const [items, total] = await Promise.all([
      Event.find(filter).sort(sortObj).skip(skip).limit(Number(pageSize)),
      Event.countDocuments(filter),
    ]);
    res.json({
      ok: true,
      data: {
        items: items.map((e) => e.toCardJSON()),
        total,
        page: Number(page),
        pageSize: Number(pageSize),
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.createEvent = async (req, res, next) => {
  try {
    const body = req.body;
    body.createdBy = req.user._id;
    const event = await Event.create(body);
    res.status(201).json({ ok: true, data: event.toDetailJSON(), traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.updateEvent = async (req, res, next) => {
  try {
    const allowed = [
      'title',
      'category',
      'format',
      'teamSize',
      'maxParticipants',
      'visibility',
      'description',
      'rules',
      'prizePool',
      'bannerUrl',
      'coverUrl',
      'timezone',
      'registrationOpenAt',
      'registrationCloseAt',
      'startAt',
      'endAt',
      'mode',
      'venue',
      'geo',
    ];
    const update = {};
    allowed.forEach((k) => {
      if (k in req.body) update[k] = req.body[k];
    });
    const event = await Event.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!event) throw AppError.notFound('EVENT_NOT_FOUND', 'Event not found');
    res.json({ ok: true, data: event.toDetailJSON(), traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.publishEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) throw AppError.notFound('EVENT_NOT_FOUND', 'Event not found');
    if (event.status !== 'draft')
      throw AppError.badRequest('INVALID_STATUS', 'Cannot publish');
    if (event.registrationOpenAt >= event.registrationCloseAt)
      throw AppError.badRequest('INVALID_WINDOW', 'Invalid registration window');
    event.status = 'published';
    await event.save();
    res.json({ ok: true, data: event.toDetailJSON(), traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.startEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) throw AppError.notFound('EVENT_NOT_FOUND', 'Event not found');
    event.status = 'ongoing';
    await event.save();
    res.json({ ok: true, data: event.toDetailJSON(), traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.completeEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) throw AppError.notFound('EVENT_NOT_FOUND', 'Event not found');
    event.status = 'completed';
    await event.save();
    res.json({ ok: true, data: event.toDetailJSON(), traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.cancelEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) throw AppError.notFound('EVENT_NOT_FOUND', 'Event not found');
    event.status = 'canceled';
    await event.save();
    res.json({ ok: true, data: event.toDetailJSON(), traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.getEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) throw AppError.notFound('EVENT_NOT_FOUND', 'Event not found');
    const data = event.toDetailJSON();
    data.isRegistrationOpen = computeIsRegistrationOpen(event);
    if (req.user) {
      const reg = await EventRegistration.findOne({ event: event._id, user: req.user._id });
      data.isRegistered = !!reg;
    }
    res.json({ ok: true, data, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.register = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) throw AppError.notFound('EVENT_NOT_FOUND', 'Event not found');
    if (!computeIsRegistrationOpen(event))
      throw AppError.badRequest('REGISTRATION_CLOSED', 'Registration closed');

    const userId = req.user._id;

    // atomic increment
    const updated = await Event.updateOne(
      { _id: event._id, registeredCount: { $lt: event.maxParticipants } },
      { $inc: { registeredCount: 1 } }
    );
    let status = 'waitlisted';
    if (updated.modifiedCount === 1) status = 'registered';
    const reg = await EventRegistration.create({
      event: event._id,
      user: userId,
      teamName: req.body.teamName,
      members: req.body.members || [],
      ign: req.body.ign,
      status,
    });
    res.json({
      ok: true,
      data: {
        registered: status === 'registered',
        waitlisted: status === 'waitlisted',
        registration: reg,
      },
      traceId: req.traceId,
    });
  } catch (err) {
    if (err.code === 11000)
      next(AppError.conflict('ALREADY_REGISTERED', 'Already registered'));
    else next(err);
  }
};

exports.unregister = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) throw AppError.notFound('EVENT_NOT_FOUND', 'Event not found');
    const reg = await EventRegistration.findOne({ event: event._id, user: req.user._id });
    if (!reg) throw AppError.notFound('REG_NOT_FOUND', 'Registration not found');
    await reg.deleteOne();
    if (reg.status === 'registered') {
      await Event.updateOne({ _id: event._id }, { $inc: { registeredCount: -1 } });
    }
    res.json({ ok: true, data: true, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.getMyRegistration = async (req, res, next) => {
  try {
    const reg = await EventRegistration.findOne({
      event: req.params.id,
      user: req.user._id,
    });
    res.json({ ok: true, data: reg, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.listRegistrations = async (req, res, next) => {
  try {
    const regs = await EventRegistration.find({ event: req.params.id })
      .select('teamName user status')
      .limit(50)
      .populate('user', 'name');
    res.json({
      ok: true,
      data: { items: regs, count: regs.length },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.postUpdate = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) throw AppError.notFound('EVENT_NOT_FOUND', 'Event not found');
    const upd = await EventUpdate.create({
      event: event._id,
      type: req.body.type,
      message: req.body.message,
      postedBy: req.user._id,
      isPinned: !!req.body.isPinned,
    });
    await Event.updateOne({ _id: event._id }, { $inc: { updatesCount: 1 } });
    res.status(201).json({ ok: true, data: upd, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.listUpdates = async (req, res, next) => {
  try {
    const pinnedFirst = req.query.pinnedFirst === 'true';
    const sort = pinnedFirst ? { isPinned: -1, createdAt: -1 } : { createdAt: -1 };
    const updates = await EventUpdate.find({ event: req.params.id }).sort(sort);
    res.json({ ok: true, data: updates, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.getLeaderboard = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).select('leaderboard leaderboardVersion');
    if (!event) throw AppError.notFound('EVENT_NOT_FOUND', 'Event not found');
    res.json({
      ok: true,
      data: { entries: event.leaderboard, version: event.leaderboardVersion },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.postLeaderboard = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) throw AppError.notFound('EVENT_NOT_FOUND', 'Event not found');
    const entries = Array.isArray(req.body) ? req.body : req.body.entries;
    event.leaderboard = entries;
    event.leaderboardVersion += 1;
    await event.save();
    res.json({
      ok: true,
      data: { entries: event.leaderboard, version: event.leaderboardVersion },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};
