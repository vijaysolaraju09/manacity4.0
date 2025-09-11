const Event = require('../models/Event');
const AppError = require('../utils/AppError');

function computeStatus(event) {
  const now = new Date();
  if (event.status === 'finished') return 'finished';
  if (now >= event.endsAt) return 'finished';
  if (now >= event.startsAt) return 'closed';
  return event.status === 'draft' ? 'draft' : 'open';
}

exports.listEvents = async (req, res, next) => {
  try {
    const events = await Event.find().sort({ startsAt: 1 });
    const updated = await Promise.all(
      events.map(async (e) => {
        const status = computeStatus(e);
        if (status !== e.status) {
          e.status = status;
          await e.save();
        }
        return e;
      })
    );
    res.json({ ok: true, data: updated, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.createEvent = async (req, res, next) => {
  try {
    const event = await Event.create(req.body);
    res.status(201).json({ ok: true, data: event, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.getEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) throw AppError.notFound('EVENT_NOT_FOUND', 'Event not found');
    const status = computeStatus(event);
    if (status !== event.status) {
      event.status = status;
      await event.save();
    }
    res.json({ ok: true, data: event, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.register = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) throw AppError.notFound('EVENT_NOT_FOUND', 'Event not found');
    const status = computeStatus(event);
    if (status !== 'open')
      throw AppError.badRequest('REGISTRATION_CLOSED', 'Registration closed');
    const userId = req.user._id;
    if (event.registered.some((id) => id.toString() === userId.toString()))
      throw AppError.badRequest('ALREADY_REGISTERED', 'Already registered');
    event.registered.push(userId);
    await event.save();
    res.json({ ok: true, data: event, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.setLeaderboard = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) throw AppError.notFound('EVENT_NOT_FOUND', 'Event not found');
    event.leaderboard = Array.isArray(req.body) ? req.body : req.body.entries;
    event.status = 'finished';
    await event.save();
    res.json({ ok: true, data: event, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};
