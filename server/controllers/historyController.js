const { Types } = require('mongoose');
const Order = require('../models/Order');
const ServiceRequest = require('../models/ServiceRequest');
const EventRegistration = require('../models/EventRegistration');
const Event = require('../models/Event');
const Feedback = require('../models/Feedback');
const AppError = require('../utils/AppError');

const ORDER_COMPLETE_STATUSES = new Set(['delivered', 'completed']);
const SERVICE_COMPLETE_STATUSES = new Set(['completed', 'closed']);

const formatCurrency = (paise) => {
  const value = Number.isFinite(paise) ? paise : Number(paise) || 0;
  const rupees = value / 100;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(rupees);
};

const toIsoString = (value) => {
  if (!value) return new Date().toISOString();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const pluralize = (count, unit) => `${count} ${unit}${count === 1 ? '' : 's'}`;

const orderCode = (order) =>
  (order?._id ? order._id.toString() : '')
    .slice(-6)
    .toUpperCase();

const normalizeServiceStatus = (status) => {
  if (!status) return 'open';
  const value = String(status).trim();
  if (!value) return 'open';
  const normalized = value.replace(/\s+/g, '_').toLowerCase();
  return normalized;
};

const buildFeedbackMap = (feedbackDocs = []) => {
  const map = new Map();
  feedbackDocs.forEach((doc) => {
    if (!doc || !doc.subjectType || !doc.subjectId) return;
    const key = `${doc.subjectType}:${doc.subjectId.toString()}`;
    map.set(key, {
      rating: doc.rating ?? null,
      comment: doc.comment ?? '',
      updatedAt: toIsoString(doc.updatedAt),
    });
  });
  return map;
};

const mapOrderEntry = (order, feedbackMap) => {
  const orderId = order._id.toString();
  const itemCount = Array.isArray(order.items)
    ? order.items.reduce((count, item) => count + Number(item?.qty ?? item?.quantity ?? 0), 0)
    : 0;
  const totalPaise = Number(order.grandTotal ?? order.totals?.grand ?? 0);
  const status = String(order.status || 'pending');
  const canFeedback = ORDER_COMPLETE_STATUSES.has(status);
  const feedbackKey = `order:${orderId}`;
  const feedback = feedbackMap.get(feedbackKey) ??
    (order.rating || order.review
      ? {
          rating: order.rating ?? null,
          comment: order.review ?? '',
        }
      : undefined);

  return {
    id: feedbackKey,
    type: 'order',
    referenceId: orderId,
    title: order.shopSnapshot?.name || 'Order',
    description: `${formatCurrency(totalPaise)} • ${pluralize(itemCount || 0, 'item')}`,
    status,
    occurredAt: toIsoString(order.createdAt),
    completedAt: canFeedback ? toIsoString(order.updatedAt || order.createdAt) : null,
    canFeedback,
    feedback,
    metadata: {
      totalPaise,
      itemCount,
      shopId: order.shop?.toString?.() || null,
      orderCode: orderCode(order),
    },
  };
};

const mapServiceRequestEntry = (request, feedbackMap) => {
  const requestId = request._id.toString();
  const status = normalizeServiceStatus(request.status);
  const canFeedback = SERVICE_COMPLETE_STATUSES.has(status);
  const feedbackKey = `service_request:${requestId}`;
  const feedback = feedbackMap.get(feedbackKey);
  const title = request.customName || request.description || request.desc || 'Service request';
  const parts = [];
  if (request.preferredDate || request.preferredTime) {
    const date = [request.preferredDate, request.preferredTime].filter(Boolean).join(' at ');
    if (date) parts.push(date);
  }
  if (request.location) parts.push(request.location);

  return {
    id: feedbackKey,
    type: 'service_request',
    referenceId: requestId,
    title,
    description: parts.join(' • ') || undefined,
    status,
    occurredAt: toIsoString(request.createdAt),
    completedAt: canFeedback ? toIsoString(request.updatedAt || request.createdAt) : null,
    canFeedback,
    feedback,
    metadata: {
      serviceId: request.service?.toString?.() || request.serviceId?.toString?.() || null,
      visibility: request.visibility || null,
    },
  };
};

const mapEventEntry = (registration, eventMap) => {
  const registrationId = registration._id.toString();
  const eventId = registration.event?.toString?.() || registration.eventId?.toString?.();
  const event = (eventId && eventMap.get(eventId)) || {};
  const status = String(registration.status || 'registered');
  const pieces = [];
  if (event.startAt) pieces.push(`Starts ${new Date(event.startAt).toLocaleString()}`);
  if (event.venue) pieces.push(event.venue);

  return {
    id: `event:${registrationId}`,
    type: 'event',
    referenceId: eventId || registrationId,
    title: event.title || registration.teamName || 'Event registration',
    description: pieces.join(' • ') || undefined,
    status,
    occurredAt: toIsoString(registration.createdAt),
    completedAt: event.endAt ? toIsoString(event.endAt) : null,
    canFeedback: false,
    metadata: {
      eventId: eventId || null,
      eventStatus: event.status || null,
      startAt: event.startAt ? toIsoString(event.startAt) : null,
      endAt: event.endAt ? toIsoString(event.endAt) : null,
    },
  };
};

exports.getHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [orders, requests, registrations, feedbackDocs] = await Promise.all([
      Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(25)
        .select('shop shopSnapshot items grandTotal status createdAt updatedAt rating review')
        .lean(),
      ServiceRequest.find({ $or: [{ userId }, { user: userId }] })
        .sort({ createdAt: -1 })
        .limit(25)
        .select(
          'customName description desc preferredDate preferredTime location status createdAt updatedAt service serviceId visibility',
        )
        .lean(),
      EventRegistration.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('event status createdAt teamName')
        .lean(),
      Feedback.find({ user: userId }).lean(),
    ]);

    const feedbackMap = buildFeedbackMap(feedbackDocs);

    const eventIds = registrations
      .map((registration) => registration.event)
      .filter((eventId) => eventId && Types.ObjectId.isValid(eventId));

    const events = eventIds.length
      ? await Event.find({ _id: { $in: eventIds } })
          .select('title startAt endAt status venue')
          .lean()
      : [];

    const eventMap = new Map(events.map((event) => [event._id.toString(), event]));

    const orderEntries = orders.map((order) => mapOrderEntry(order, feedbackMap));
    const serviceEntries = requests.map((request) => mapServiceRequestEntry(request, feedbackMap));
    const eventEntries = registrations.map((registration) => mapEventEntry(registration, eventMap));

    const entries = [...orderEntries, ...serviceEntries, ...eventEntries].sort((a, b) => {
      const left = new Date(b.occurredAt).getTime();
      const right = new Date(a.occurredAt).getTime();
      return left - right;
    });

    res.json({ ok: true, data: { items: entries }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.getHistoryItem = async (req, res, next) => {
  try {
    const { type, referenceId } = req.params;
    if (!['order', 'service_request', 'event'].includes(type)) {
      throw AppError.badRequest('INVALID_HISTORY_TYPE', 'Unsupported history type');
    }
    if (!Types.ObjectId.isValid(referenceId)) {
      throw AppError.badRequest('INVALID_REFERENCE', 'Invalid reference');
    }
    const userId = req.user._id;
    let entry;

    if (type === 'order') {
      const order = await Order.findOne({ _id: referenceId, user: userId })
        .select('shop shopSnapshot items grandTotal status createdAt updatedAt rating review')
        .lean();
      if (!order) throw AppError.notFound('ORDER_NOT_FOUND', 'Order not found');
      entry = mapOrderEntry(order, buildFeedbackMap());
    } else if (type === 'service_request') {
      const request = await ServiceRequest.findOne({ _id: referenceId, $or: [{ userId }, { user: userId }] })
        .select(
          'customName description desc preferredDate preferredTime location status createdAt updatedAt service serviceId visibility',
        )
        .lean();
      if (!request) throw AppError.notFound('SERVICE_REQUEST_NOT_FOUND', 'Service request not found');
      entry = mapServiceRequestEntry(request, buildFeedbackMap());
    } else {
      const registration = await EventRegistration.findOne({ event: referenceId, user: userId })
        .select('event status createdAt teamName')
        .lean();
      if (!registration) throw AppError.notFound('EVENT_HISTORY_NOT_FOUND', 'Event entry not found');
      const event = await Event.findById(referenceId).select('title startAt endAt status venue').lean();
      const eventMap = new Map(event ? [[event._id.toString(), event]] : []);
      entry = mapEventEntry(registration, eventMap);
    }

    res.json({ ok: true, data: { entry }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};
