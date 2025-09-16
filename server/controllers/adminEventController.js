const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const EventUpdate = require('../models/EventUpdate');
const AppError = require('../utils/AppError');

const MAX_PAGE_SIZE = 50;

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const deriveStatus = (event) => {
  const now = Date.now();
  if (event.status === 'canceled') return 'past';
  if (event.status === 'completed') return 'past';
  const start = toDate(event.startAt);
  const end = toDate(event.endAt);
  if (end && end.getTime() < now) return 'past';
  if (event.status === 'ongoing') return 'ongoing';
  if (start && start.getTime() <= now && (!end || end.getTime() >= now)) {
    return 'ongoing';
  }
  return 'upcoming';
};

const mapEvent = (event) => ({
  _id: event._id,
  title: event.title,
  startAt: event.startAt,
  endAt: event.endAt ?? null,
  status: deriveStatus(event),
  capacity: event.maxParticipants ?? event.capacity ?? 0,
  registered: event.registeredCount ?? 0,
});

const computeLifecycleStatus = (start, end, currentStatus) => {
  if (currentStatus === 'canceled') return currentStatus;
  const startDate = toDate(start);
  const endDate = toDate(end);
  const now = Date.now();
  if (endDate && endDate.getTime() < now) return 'completed';
  if (startDate && startDate.getTime() <= now && (!endDate || endDate.getTime() >= now)) {
    return 'ongoing';
  }
  return 'published';
};

exports.listEvents = async (req, res, next) => {
  try {
    const { status, page = 1, pageSize = 10, sort = '-startAt' } = req.query;
    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const size = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(pageSize, 10) || 10),
    );

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

    const createdBy = req.user?._id;
    if (!createdBy) {
      throw AppError.unauthorized('UNAUTHORIZED', 'Admin authentication required');
    }

    const lifecycle = computeLifecycleStatus(startAt, endAt);

    const event = await Event.create({
      title: req.body.title,
      type: 'activity',
      category: 'general',
      format: 'single_match',
      teamSize: 1,
      maxParticipants: req.body.capacity,
      registrationOpenAt: startAt,
      registrationCloseAt: endAt,
      startAt,
      endAt,
      mode: 'online',
      createdBy,
      status: lifecycle,
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

    let startAt = event.startAt;
    let endAt = event.endAt;

    if (req.body.startAt !== undefined) {
      const startDate = toDate(req.body.startAt);
      if (!startDate) {
        throw AppError.badRequest('INVALID_START', 'Invalid startAt');
      }
      startAt = startDate;
      event.startAt = startDate;
      event.registrationOpenAt = startDate;
    }

    if (req.body.endAt !== undefined) {
      const endDate = toDate(req.body.endAt);
      if (!endDate) {
        throw AppError.badRequest('INVALID_END', 'Invalid endAt');
      }
      endAt = endDate;
      event.endAt = endDate;
      event.registrationCloseAt = endDate;
    }

    if (req.body.capacity !== undefined) {
      const registeredCount = event.registeredCount ?? 0;
      if (
        typeof req.body.capacity === 'number' &&
        req.body.capacity < registeredCount
      ) {
        throw AppError.badRequest(
          'CAPACITY_TOO_LOW',
          'Capacity cannot be less than registered count',
        );
      }
      event.maxParticipants = req.body.capacity;
    }

    if (event.status !== 'canceled') {
      event.status = computeLifecycleStatus(startAt, endAt, event.status);
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

exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      throw AppError.notFound('EVENT_NOT_FOUND', 'Event not found');
    }

    await Promise.all([
      EventRegistration.deleteMany({ event: event._id }),
      EventUpdate.deleteMany({ event: event._id }),
      event.deleteOne(),
    ]);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
