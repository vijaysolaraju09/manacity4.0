const mongoose = require('mongoose');
const Service = require('../models/Service');
const ServiceRequest = require('../models/ServiceRequest');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { notifyUser } = require('../services/notificationService');

const { Types } = mongoose;

const STATUS = {
  PENDING: 'pending',
  AWAITING_APPROVAL: 'awaiting_approval',
  ACCEPTED: 'accepted',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const MAX_REOPEN_COUNT = 3;
const OFFERABLE_STATUSES = new Set([
  STATUS.PENDING,
  STATUS.AWAITING_APPROVAL,
  STATUS.ACCEPTED,
  'open',
  'offered',
]);
const ADMIN_STATUS_ALLOWED = new Set(Object.values(STATUS));

const ALLOWED_TRANSITIONS = {
  [STATUS.PENDING]: new Set([
    STATUS.AWAITING_APPROVAL,
    STATUS.ACCEPTED,
    STATUS.ASSIGNED,
    STATUS.CANCELLED,
  ]),
  [STATUS.AWAITING_APPROVAL]: new Set([
    STATUS.ACCEPTED,
    STATUS.ASSIGNED,
    STATUS.IN_PROGRESS,
    STATUS.COMPLETED,
    STATUS.CANCELLED,
  ]),
  [STATUS.ACCEPTED]: new Set([
    STATUS.ASSIGNED,
    STATUS.IN_PROGRESS,
    STATUS.COMPLETED,
    STATUS.CANCELLED,
  ]),
  [STATUS.ASSIGNED]: new Set([
    STATUS.IN_PROGRESS,
    STATUS.COMPLETED,
    STATUS.CANCELLED,
  ]),
  [STATUS.IN_PROGRESS]: new Set([STATUS.COMPLETED, STATUS.CANCELLED]),
  [STATUS.COMPLETED]: new Set(),
  [STATUS.CANCELLED]: new Set(),
};

const isAssignedStatus = (value) => {
  const normalized = sanitizeString(value).toLowerCase();
  return (
    normalized === STATUS.ASSIGNED ||
    normalized === STATUS.ACCEPTED ||
    normalized === STATUS.IN_PROGRESS
  );
};

const normalizeStatus = (value) => {
  if (!value) return STATUS.PENDING;
  const raw = sanitizeString(value);
  const lower = raw.toLowerCase();
  const compact = lower.replace(/[_\s-]/g, '');
  if (compact === 'awaitingapproval') return STATUS.AWAITING_APPROVAL;
  if (ADMIN_STATUS_ALLOWED.has(lower)) return lower;
  if (lower === 'open' || lower === 'offered') return STATUS.PENDING;
  if (lower === 'closed') return STATUS.CANCELLED;
  if (lower === 'complete') return STATUS.COMPLETED;
  if (lower === 'in-progress') return STATUS.IN_PROGRESS;
  const upper = raw.toUpperCase();
  if (upper === 'OPEN' || upper === 'OFFERED') return STATUS.PENDING;
  if (upper === 'CLOSED') return STATUS.CANCELLED;
  if (upper === 'ASSIGNED') return STATUS.ASSIGNED;
  if (upper === 'IN_PROGRESS') return STATUS.IN_PROGRESS;
  if (upper === 'COMPLETED') return STATUS.COMPLETED;
  return STATUS.PENDING;
};

const sanitizeString = (value) => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (value === null || typeof value === 'undefined') return '';
  return String(value).trim();
};

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof Types.ObjectId) return value;
  if (typeof value === 'string' && Types.ObjectId.isValid(value)) return new Types.ObjectId(value);
  return null;
};

const toId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Types.ObjectId) return value.toString();
  if (typeof value === 'object') {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
    if (typeof value.toString === 'function') return value.toString();
  }
  return '';
};

const isSameId = (a, b) => {
  const left = toId(a);
  const right = toId(b);
  return Boolean(left) && Boolean(right) && left === right;
};

const ensureVisibility = (value) => {
  const normalized = sanitizeString(value).toLowerCase();
  return normalized === 'private' ? 'private' : 'public';
};

const maskName = (name = '') => {
  const trimmed = sanitizeString(name);
  if (!trimmed) return 'Community member';
  const [first] = trimmed.split(' ').filter(Boolean);
  if (!first) return 'Community member';
  if (first.length <= 2) return `${first[0] ?? ''}***`;
  return `${first.slice(0, 2)}***`;
};

const maskPhone = (value = '') => {
  const digits = sanitizeString(value);
  if (!digits) return '';
  if (digits.length <= 4) return '****';
  const tail = digits.slice(-4);
  return `****${tail}`;
};

const anonymizeLocation = (value) => {
  const trimmed = sanitizeString(value);
  if (!trimmed) return '';
  const parts = trimmed
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
  if (parts.length === 0) return '';
  return parts.slice(0, Math.min(parts.length, 2)).join(', ');
};

const toServiceJson = (service) =>
  !service
    ? null
    : {
        _id: String(service._id),
        id: String(service._id),
        name: service.name,
        description: service.description || '',
        icon: service.icon || '',
      };

const toUserSummary = (user) => {
  if (!user) return null;
  const id = toId(user._id || user.id || user);
  return {
    _id: id,
    name: user.name || '',
    phone: user.phone || '',
    location: user.location || '',
    address: user.address || '',
    email: user.email || '',
  };
};

const appendHistory = (target, entry) => {
  if (!target) return;
  if (!Array.isArray(target.history)) target.history = [];
  target.history.push({
    at: entry.at || new Date(),
    by: entry.by ?? null,
    type: entry.type,
    message: entry.message ? sanitizeString(entry.message) || null : null,
  });
};

const formatHistory = (entry) => ({
  at: entry?.at || entry?.createdAt || null,
  by: toId(entry?.by),
  type: entry?.type || 'admin_note',
  message: entry?.message ?? null,
});

const formatFeedback = (feedback) => {
  if (!feedback) return null;
  const rating = typeof feedback.rating === 'number' ? feedback.rating : null;
  const commentValue = sanitizeString(feedback.comment);
  return {
    id: toId(feedback._id),
    rating,
    comment: commentValue ? commentValue : null,
    updatedAt: feedback.updatedAt || feedback.createdAt || null,
  };
};

const formatOffer = (offer, { currentUserId, isOwner, isAdmin }) => {
  if (!offer) return null;
  const providerId = toId(offer.providerId);
  const provider =
    offer.providerId && typeof offer.providerId === 'object' && offer.providerId.name
      ? toUserSummary(offer.providerId)
      : null;
  const canSeeContact =
    isOwner ||
    isAdmin ||
    (providerId && currentUserId && providerId === currentUserId);
  return {
    _id: toId(offer._id) || toId(offer.id) || '',
    providerId: providerId || '',
    provider,
    note: offer.note || '',
    contact: canSeeContact ? offer.contact || '' : '',
    createdAt: offer.createdAt || offer.created_at || null,
    status: offer.status || 'pending',
  };
};

const toRequestJson = (doc, options = {}) => {
  if (!doc) return null;
  const currentUserId = options.currentUserId ? toId(options.currentUserId) : null;
  const isAdmin = Boolean(options.isAdmin);
  const ownerId = toId(doc.userId);
  const isOwner = Boolean(currentUserId && ownerId && currentUserId === ownerId);

  const acceptedById = toId(doc.acceptedBy);
  const isAcceptedHelper = Boolean(currentUserId && acceptedById && currentUserId === acceptedById);

  const service = doc.serviceId && doc.serviceId.name ? doc.serviceId : doc.service;
  const feedback = isOwner || isAdmin ? formatFeedback(options.feedback) : null;
  const assignedRaw = Array.isArray(doc.assignedProviderIds)
    ? doc.assignedProviderIds
    : doc.assignedProviderId
    ? [doc.assignedProviderId]
    : [];
  const assignedProviders = assignedRaw
    .map((entry) => (entry && entry.name ? toUserSummary(entry) : null))
    .filter(Boolean);
  const assignedProviderIds = assignedRaw
    .map((entry) => toId(entry))
    .filter(Boolean);
  const assignedProvider =
    doc.assignedProviderId && doc.assignedProviderId.name
      ? toUserSummary(doc.assignedProviderId)
      : assignedProviders[0] ?? null;

  const offers = Array.isArray(doc.offers)
    ? doc.offers
        .map((offer) => formatOffer(offer, { currentUserId, isOwner, isAdmin }))
        .filter(Boolean)
    : [];

  const history = Array.isArray(doc.history)
    ? doc.history.map((entry) => formatHistory(entry)).filter(Boolean)
    : [];

  const requester =
    doc.userId && typeof doc.userId === 'object' && doc.userId.name ? toUserSummary(doc.userId) : null;
  const acceptedHelper =
    doc.acceptedBy && typeof doc.acceptedBy === 'object' && doc.acceptedBy.name
      ? toUserSummary(doc.acceptedBy)
      : null;
  const contactVisible = isOwner || isAdmin || isAcceptedHelper;
  const locationValue =
    contactVisible || ensureVisibility(doc.visibility) === 'private'
      ? doc.location || ''
      : anonymizeLocation(doc.location);
  const phoneValue = (() => {
    const fallbackPhone = doc.phone || requester?.phone || '';
    if (!fallbackPhone) return '';
    return contactVisible ? fallbackPhone : maskPhone(fallbackPhone);
  })();
  const requesterName = contactVisible
    ? requester?.name || ''
    : maskName(requester?.name || (doc.isAnonymizedPublic ? '' : doc.phone || ''));
  const emailValue = contactVisible && requester && requester?.email ? requester.email : '';

  return {
    id: toId(doc._id),
    _id: toId(doc._id),
    userId: ownerId,
    type: ensureVisibility(doc.type || doc.visibility),
    serviceId: doc.serviceId ? toId(doc.serviceId) : null,
    service: toServiceJson(service),
    customName: doc.customName || '',
    description: doc.description || '',
    details: doc.details || doc.desc || doc.description || '',
    location: locationValue,
    phone: phoneValue,
    requester: requester
      ? { ...requester, email: emailValue, name: requesterName }
      : { _id: ownerId, name: requesterName, phone: phoneValue },
    requesterDisplayName: requesterName,
    requesterContactVisible: contactVisible,
    email: emailValue,
    preferredDate: doc.preferredDate || '',
    preferredTime: doc.preferredTime || '',
    visibility: ensureVisibility(doc.visibility || doc.type),
    status: normalizeStatus(doc.status),
    adminNotes: doc.adminNotes || '',
    reopenedCount: typeof doc.reopenedCount === 'number' ? doc.reopenedCount : 0,
    assignedProviderId: doc.assignedProviderId ? toId(doc.assignedProviderId) : null,
    assignedProvider,
    assignedProviders,
    assignedProviderIds,
    acceptedBy: acceptedById || null,
    acceptedHelper,
    acceptedAt: doc.acceptedAt || null,
    offers,
    offersCount: Array.isArray(doc.offers) ? doc.offers.length : offers.length,
    history,
    isAnonymizedPublic:
      typeof doc.isAnonymizedPublic === 'boolean' ? doc.isAnonymizedPublic : true,
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
    feedback,
  };
};

const getAssignedProviderIds = (request) => {
  const ids = new Set();
  const direct = toId(request?.assignedProviderId);
  if (direct) ids.add(direct);
  if (Array.isArray(request?.assignedProviderIds)) {
    request.assignedProviderIds.forEach((entry) => {
      const value = toId(entry);
      if (value) ids.add(value);
    });
  }
  return Array.from(ids);
};

const populateRequest = (query) => {
  if (!query || typeof query.populate !== 'function') return query;
  const paths = [
    { path: 'serviceId', select: 'name description icon' },
    { path: 'userId', select: 'name phone location address email' },
    { path: 'assignedProviderId', select: 'name phone location address' },
    { path: 'assignedProviderIds', select: 'name phone location address' },
    { path: 'acceptedBy', select: 'name phone location address email' },
    { path: 'offers.providerId', select: 'name phone location address' },
  ];
  return query.populate(paths);
};

const buildNotificationContext = (request) => {
  const entityId = toId(request?._id || request?.id);
  const payload = { entityType: 'serviceRequest', targetType: 'serviceRequest' };
  if (!entityId) return payload;
  const link = `/requests/${entityId}`;
  return {
    ...payload,
    entityId,
    redirectUrl: link,
    targetId: entityId,
    targetLink: link,
    resourceType: 'serviceRequest',
    resourceId: entityId,
    resourceLink: link,
  };
};

const sendNotification = async (userIds, subType, message, request) => {
  const ids = (Array.isArray(userIds) ? userIds : [userIds])
    .map((id) => toId(id))
    .filter(Boolean);
  if (!ids.length) return;
  const payload = buildNotificationContext(request);
  await Promise.allSettled(
    ids.map((id) =>
      notifyUser(id, {
        type: 'service_request',
        subType,
        message,
        ...payload,
        payload,
      })
    )
  );
};

const toStatusMessage = (status) => {
  if (!status) return 'Service request updated';
  const normalized = String(status).trim().replace(/_/g, ' ');
  return `Service request ${normalized}`;
};

const STATUS_NOTIFICATION_TYPES = {
  [STATUS.PENDING]: 'service_request',
  [STATUS.AWAITING_APPROVAL]: 'service_request',
  [STATUS.ACCEPTED]: 'accepted',
  [STATUS.ASSIGNED]: 'assigned',
  [STATUS.IN_PROGRESS]: 'in_progress',
  [STATUS.COMPLETED]: 'completed',
  [STATUS.CANCELLED]: 'closed',
};

exports.createServiceRequest = async (req, res, next) => {
  try {
    const body = req.body || {};
    const serviceId = sanitizeString(body.serviceId);
    const customName = sanitizeString(body.customName);
    const description = sanitizeString(body.description);
    const details = sanitizeString(body.details || body.detail);
    const location = sanitizeString(body.location);
    let phone = sanitizeString(body.phone || body.contactPhone);
    const providerId = sanitizeString(body.providerId);
    const preferredDate = sanitizeString(body.preferredDate);
    const preferredTime = sanitizeString(body.preferredTime);
    const rawType = sanitizeString(body.type);
    const isDirect = rawType === 'direct';
    const visibility = ensureVisibility(isDirect ? 'private' : body.visibility);
    const type = isDirect ? 'private' : ensureVisibility(body.type || visibility);

    if (!serviceId && !customName)
      throw AppError.badRequest(
        'SERVICE_REQUEST_INVALID',
        'Provide a service or describe your requirement'
      );

    let service = null;
    if (serviceId) {
      service = await Service.findById(serviceId).lean();
      if (!service || service.isActive === false)
        throw AppError.badRequest('SERVICE_NOT_AVAILABLE', 'Service not available');
    }

    if (!phone && req.user?.phone) phone = sanitizeString(req.user.phone);

    const providerObjectId = providerId ? toObjectId(providerId) : null;
    let providerUser = null;
    if (providerId && !providerObjectId)
      return next(
        AppError.unprocessable('INVALID_PROVIDER', 'Please select a valid provider')
      );
    if (providerObjectId) {
      providerUser = await User.findOne({
        _id: providerObjectId,
        role: { $in: Array.from(PROVIDER_ROLES) },
      }).lean();

      if (!providerUser)
        return next(
          AppError.unprocessable('INVALID_PROVIDER', 'Selected provider is unavailable')
        );
      if (
        Array.isArray(service?.providers) &&
        service.providers.length > 0 &&
        !service.providers.some((entry) => isSameId(entry, providerObjectId))
      ) {
        return next(
          AppError.unprocessable(
            'PROVIDER_NOT_ASSIGNED',
            'Selected provider is not assigned to this service',
          )
        );
      }
    }

    const payload = {
      userId: req.user._id,
      description,
      location,
      phone,
      preferredDate,
      preferredTime,
      visibility,
      type,
      status: providerUser ? STATUS.ASSIGNED : STATUS.PENDING,
      isAnonymizedPublic: visibility === 'public',
    };

    if (service) payload.serviceId = service._id;
    if (customName) payload.customName = customName;
    if (details) {
      payload.details = details;
      payload.desc = details;
      if (!description) payload.description = details;
    }

    appendHistory(payload, {
      by: req.user?._id ?? null,
      type: 'created',
      message: customName || (service?.name ? `Requested ${service.name}` : ''),
    });

    if (providerUser && providerObjectId) {
      payload.assignedProviderId = providerObjectId;
      payload.assignedProviderIds = [providerObjectId];
      appendHistory(payload, {
        by: req.user?._id ?? null,
        type: 'assigned',
        message: `Assigned to ${providerUser.name || 'provider'}`,
      });
    }

    const request = new ServiceRequest(payload);
    await request.save();
    await populateRequest(request);

    await sendNotification(
      req.user._id,
      'created',
      'Service request submitted successfully',
      request
    );

    res.status(201).json({
      ok: true,
      data: { request: toRequestJson(request.toObject(), { currentUserId: req.user._id }) },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.listMyServiceRequests = async (req, res, next) => {
  try {
    const { page = 1, pageSize, limit } = req.query;
    const pageNumber = Math.max(Number(page) || 1, 1);
    const sizeInput = limit ?? pageSize;
    const safePageSize = Math.max(Math.min(Number(sizeInput) || 20, 50), 1);
    const skip = (pageNumber - 1) * safePageSize;

    const query = populateRequest(
      ServiceRequest.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safePageSize),
    );

    const [requests, total] = await Promise.all([
      query.lean(),
      ServiceRequest.countDocuments({ userId: req.user._id }),
    ]);

    const items = Array.isArray(requests)
      ? requests.map((doc) => toRequestJson(doc, { currentUserId: req.user._id }))
      : [];

    res.json({
      ok: true,
      data: {
        items,
        total,
        page: pageNumber,
        pageSize: safePageSize,
        hasMore: skip + items.length < total,
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.listAcceptedServiceRequests = async (req, res, next) => {
  try {
    const { page = 1, pageSize, limit } = req.query;
    const pageNumber = Math.max(Number(page) || 1, 1);
    const sizeInput = limit ?? pageSize;
    const safePageSize = Math.max(Math.min(Number(sizeInput) || 20, 50), 1);
    const skip = (pageNumber - 1) * safePageSize;

    const helperId = toObjectId(req.user?._id || req.user?.id || req.user?.userId);
    if (!helperId)
      throw AppError.unauthorized(
        'NOT_AUTHENTICATED',
        'Please sign in to view your assigned services'
      );

    const filter = {
      $or: [
        { acceptedBy: helperId },
        { assignedProviderId: helperId },
        { assignedProviderIds: helperId },
      ],
    };

    const query = populateRequest(
      ServiceRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safePageSize),
    );

    const [requests, total] = await Promise.all([
      query.lean(),
      ServiceRequest.countDocuments(filter),
    ]);

    const items = Array.isArray(requests)
      ? requests.map((doc) =>
          toRequestJson(doc, { currentUserId: helperId, isAdmin: req.user?.role === 'admin' })
        )
      : [];

    res.json({
      ok: true,
      data: {
        items,
        total,
        page: pageNumber,
        pageSize: safePageSize,
        hasMore: skip + items.length < total,
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.getServiceRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await populateRequest(ServiceRequest.findById(id));
    if (!request)
      throw AppError.notFound('SERVICE_REQUEST_NOT_FOUND', 'Service request not found');

    const currentUserId = toId(req.user?._id ?? req.user?.userId ?? req.user?.id);
    const isOwner = currentUserId ? isSameId(request.userId, currentUserId) : false;
    const isAdmin = req.user?.role === 'admin';

    const isPublic = ensureVisibility(request.visibility || request.type) === 'public';
    const isAcceptedProvider = currentUserId
      ? isSameId(request.acceptedBy, currentUserId) ||
        isSameId(request.assignedProviderId, currentUserId) ||
        (Array.isArray(request.assignedProviderIds) &&
          request.assignedProviderIds.some((id) => isSameId(id, currentUserId)))
      : false;

    if (!isOwner && !isAdmin && !isPublic && !isAcceptedProvider)
      throw AppError.forbidden('NOT_AUTHORIZED', 'Not authorized to view this request');

    const ownerObjectId = toObjectId(request.userId || request.user);
    const feedbackDoc = ownerObjectId
      ? await Feedback.findOne({
          subjectType: 'service_request',
          subjectId: request._id,
          user: ownerObjectId,
        }).lean()
      : null;

    res.json({
      ok: true,
      data: {
        request: toRequestJson(request.toObject(), {
          currentUserId,
          isAdmin,
          feedback: feedbackDoc,
        }),
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.cancelServiceRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await populateRequest(ServiceRequest.findById(id));
    if (!request)
      throw AppError.notFound('SERVICE_REQUEST_NOT_FOUND', 'Service request not found');

    if (!isSameId(request.userId, req.user._id))
      throw AppError.forbidden('NOT_AUTHORIZED', 'Not authorized to cancel this request');

    const currentStatus = normalizeStatus(request.status);
    if (![STATUS.PENDING, STATUS.AWAITING_APPROVAL, STATUS.ACCEPTED].includes(currentStatus))
      throw AppError.badRequest(
        'SERVICE_REQUEST_NOT_PENDING',
        'Only pending requests can be cancelled'
      );

    const assignedProvider = request.assignedProviderId
      ? toId(request.assignedProviderId)
      : null;

    request.status = STATUS.CANCELLED;
    request.assignedProviderId = null;
    request.assignedProviderIds = [];
    if (Array.isArray(request.offers)) {
      request.offers.forEach((offer) => {
        if (offer.status === 'pending') offer.status = 'rejected';
      });
    }

    appendHistory(request, {
      by: req.user._id,
      type: 'closed',
      message: 'Request cancelled by requester',
    });

    await request.save();
    await populateRequest(request);

    await sendNotification(
      req.user._id,
      'closed',
      'Service request cancelled',
      request
    );

    if (assignedProvider) {
      await sendNotification(
        assignedProvider,
        'closed',
        'A service request you were assigned to has been cancelled',
        request
      );
    }

    res.json({
      ok: true,
      data: {
        request: toRequestJson(request.toObject(), { currentUserId: req.user._id }),
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.reopenServiceRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const message = sanitizeString(req.body?.message);
    const request = await populateRequest(ServiceRequest.findById(id));
    if (!request)
      throw AppError.notFound('SERVICE_REQUEST_NOT_FOUND', 'Service request not found');

    if (!isSameId(request.userId, req.user._id))
      throw AppError.forbidden('NOT_AUTHORIZED', 'Not authorized to reopen this request');

    const currentStatus = normalizeStatus(request.status);

    if (![STATUS.COMPLETED, STATUS.CANCELLED].includes(currentStatus))
      throw AppError.badRequest('SERVICE_REQUEST_NOT_CLOSED', 'Request is not closed');

    if ((request.reopenedCount ?? 0) >= MAX_REOPEN_COUNT)
      throw AppError.badRequest(
        'SERVICE_REQUEST_REOPEN_LIMIT',
        'You have reached the maximum number of reopen attempts'
      );

    const previousAssigned = request.assignedProviderId;

    request.status = STATUS.PENDING;
    request.reopenedCount = (request.reopenedCount ?? 0) + 1;
    request.assignedProviderId = null;
    request.assignedProviderIds = [];
    if (Array.isArray(request.offers)) {
      request.offers.forEach((offer) => {
        if (offer.status === 'accepted') offer.status = 'rejected';
      });
    }

    appendHistory(request, {
      by: req.user._id,
      type: 'reopened',
      message: message || 'Request reopened by requester',
    });

    await request.save();
    await populateRequest(request);

    await sendNotification(req.user._id, 'reopened', 'Service request reopened', request);
    if (previousAssigned)
      await sendNotification(
        previousAssigned,
        'reopened',
        'A service request you were assigned to has been reopened',
        request
      );

    res.json({
      ok: true,
      data: {
        request: toRequestJson(request.toObject(), { currentUserId: req.user._id }),
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.listPublicServiceRequests = async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      q,
      serviceId,
    } = req.query || {};

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limit = Math.min(100, Math.max(parseInt(pageSize, 10) || 20, 1));
    const skip = (pageNum - 1) * limit;

    const filter = { visibility: 'public', type: 'public' };
    const currentUserId = toObjectId(req.user?._id || req.user?.userId);
    if (currentUserId) {
      filter.userId = { $ne: currentUserId };
    }
    if (serviceId && Types.ObjectId.isValid(String(serviceId))) filter.serviceId = serviceId;

    if (q && sanitizeString(q)) {
      const escaped = sanitizeString(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { customName: regex },
        { description: regex },
        { location: regex },
      ];
    }

    const baseQuery = populateRequest(
      ServiceRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ).select(
      'customName description location status createdAt offers serviceId visibility type userId phone acceptedBy acceptedAt'
    );

    const [items, total] = await Promise.all([
      baseQuery.lean(),
      ServiceRequest.countDocuments(filter),
    ]);

    const normalized = Array.isArray(items)
      ? items.map((doc) => {
          const json = toRequestJson(doc, { currentUserId });
          return {
            id: json.id,
            _id: json.id,
            serviceId: json.serviceId,
            title: json.service?.name || json.customName || 'Service request',
            description: json.description ? json.description.slice(0, 220) : '',
            location: json.location,
            createdAt: json.createdAt || null,
            status: json.status,
            offersCount: json.offersCount,
            visibility: json.visibility,
            type: json.type,
            requester: json.requesterDisplayName || 'Community member',
            requesterId: json.userId,
            acceptedBy: json.acceptedBy,
            acceptedAt: json.acceptedAt,
            requesterContactVisible: json.requesterContactVisible,
          };
        })
      : [];

    res.json({
      ok: true,
      data: {
        items: normalized,
        page: pageNum,
        pageSize: limit,
        total,
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.acceptPublicServiceRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await populateRequest(ServiceRequest.findById(id));
    if (!request)
      throw AppError.notFound('SERVICE_REQUEST_NOT_FOUND', 'Service request not found');

    const currentUserId = toObjectId(req.user?._id || req.user?.userId);
    if (!currentUserId)
      throw AppError.unauthorized('NOT_AUTHENTICATED', 'Please sign in to accept requests');

    if (isSameId(request.userId, currentUserId))
      throw AppError.badRequest(
        'SERVICE_REQUEST_SELF_ACCEPT',
        'You cannot accept your own public request'
      );

    const visibility = ensureVisibility(request.visibility || request.type);
    if (visibility !== 'public')
      throw AppError.badRequest('SERVICE_REQUEST_NOT_PUBLIC', 'Only public requests can be accepted');

    if (request.acceptedBy)
      throw AppError.badRequest('SERVICE_REQUEST_ALREADY_ACCEPTED', 'This request is already accepted');

    request.acceptedBy = currentUserId;
    request.assignedProviderId = currentUserId;
    request.assignedProviderIds = [currentUserId];
    request.status = STATUS.ACCEPTED;
    request.acceptedAt = new Date();

    appendHistory(request, {
      by: currentUserId,
      type: 'assigned',
      message: 'Accepted by helper',
    });

    await request.save();
    await populateRequest(request);

    const requesterName = request.userId?.name || 'requester';
    const helperName = req.user?.name || 'helper';

    await sendNotification(
      request.userId,
      'accepted',
      `Your public request was accepted by ${helperName}`,
      request
    );

    await sendNotification(
      currentUserId,
      'accepted',
      `You offered help to ${requesterName}`,
      request
    );

    res.json({
      ok: true,
      data: {
        request: toRequestJson(request.toObject(), { currentUserId }),
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateServiceRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const nextStatus = normalizeStatus(req.body?.status);
    const request = await populateRequest(ServiceRequest.findById(id));

    if (!request)
      throw AppError.notFound('SERVICE_REQUEST_NOT_FOUND', 'Service request not found');

    const currentUserId = toObjectId(req.user?._id || req.user?.userId || req.user?.id);
    if (!currentUserId)
      throw AppError.unauthorized('NOT_AUTHENTICATED', 'Please sign in to update requests');

    const isOwner = isSameId(request.userId, currentUserId);
    const assignedIds = getAssignedProviderIds(request).map((entry) => toObjectId(entry));
    const isHelper = assignedIds.some((entry) => entry && entry.equals(currentUserId));

    if (!isOwner && !isHelper)
      throw AppError.forbidden('NOT_AUTHORIZED', 'You cannot update this request');

    const currentStatus = normalizeStatus(request.status);
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || new Set();
    if (!allowed.has(nextStatus))
      throw AppError.badRequest('INVALID_TRANSITION', 'Status transition not allowed');

    if (
      isHelper &&
      !isOwner &&
      ![STATUS.IN_PROGRESS, STATUS.COMPLETED, STATUS.CANCELLED].includes(nextStatus)
    ) {
      throw AppError.badRequest(
        'INVALID_HELPER_STATUS',
        'Helpers can only update progress or completion status'
      );
    }

    request.status = nextStatus;
    appendHistory(request, {
      at: new Date(),
      by: currentUserId,
      type: historyTypeForStatus(nextStatus),
      message: `Status updated to ${nextStatus}`,
    });

    await request.save();
    await populateRequest(request);

    const recipients = new Set();
    const ownerId = toId(request.userId || request.user);
    if (ownerId) recipients.add(ownerId);
    getAssignedProviderIds(request).forEach((entry) => recipients.add(entry));

    const statusSubType = STATUS_NOTIFICATION_TYPES[nextStatus] || 'service_request';
    await sendNotification(
      Array.from(recipients),
      statusSubType,
      toStatusMessage(nextStatus),
      request,
    );

    res.json({
      ok: true,
      data: {
        request: toRequestJson(request.toObject(), { currentUserId }),
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.submitOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const note = sanitizeString(req.body?.note);
    const contact = sanitizeString(req.body?.contact);

    if (!contact)
      throw AppError.badRequest(
        'SERVICE_REQUEST_OFFER_INVALID',
        'Contact information is required'
      );

    const request = await populateRequest(ServiceRequest.findById(id));
    if (!request)
      throw AppError.notFound('SERVICE_REQUEST_NOT_FOUND', 'Service request not found');

    if (request.visibility !== 'public')
      throw AppError.badRequest(
        'SERVICE_REQUEST_NOT_PUBLIC',
        'Offers are only allowed on public requests'
      );

    const currentStatus = normalizeStatus(request.status);

    if (!OFFERABLE_STATUSES.has(currentStatus))
      throw AppError.badRequest(
        'SERVICE_REQUEST_NOT_OPEN',
        'This request is not accepting offers'
      );

    if (isSameId(request.userId, req.user._id))
      throw AppError.badRequest(
        'SERVICE_REQUEST_SELF_OFFER',
        'You cannot offer on your own request'
      );

    const now = new Date();
    request.offers.push({
      providerId: req.user._id,
      note,
      contact,
      createdAt: now,
      status: 'pending',
    });

    if (currentStatus === STATUS.PENDING) request.status = STATUS.AWAITING_APPROVAL;

    appendHistory(request, {
      at: now,
      by: req.user._id,
      type: 'offer',
      message: note || 'New offer submitted',
    });

    await request.save();
    await populateRequest(request);

    await sendNotification(
      request.userId,
      'offer',
      'You received a new offer on your service request',
      request
    );

    res.status(201).json({
      ok: true,
      data: {
        request: toRequestJson(request.toObject(), { currentUserId: req.user._id }),
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateOffer = async (req, res, next) => {
  try {
    const { id, offerId } = req.params;
    const action = sanitizeString(req.body?.action).toLowerCase();
    if (!['accept', 'reject'].includes(action))
      throw AppError.badRequest('INVALID_ACTION', 'Invalid offer action');

    const request = await populateRequest(ServiceRequest.findById(id));
    if (!request)
      throw AppError.notFound('SERVICE_REQUEST_NOT_FOUND', 'Service request not found');

    if (!isSameId(request.userId, req.user._id))
      throw AppError.forbidden('NOT_AUTHORIZED', 'Not authorized to manage this request');

    const offer = Array.isArray(request.offers)
      ? request.offers.id(offerId)
      : null;
    if (!offer)
      throw AppError.notFound('SERVICE_REQUEST_OFFER_NOT_FOUND', 'Offer not found');

    const now = new Date();
    if (action === 'accept') {
      offer.status = 'accepted';
      request.assignedProviderId = offer.providerId;
      request.assignedProviderIds = [offer.providerId];
      request.status = STATUS.ASSIGNED;
      if (Array.isArray(request.offers)) {
        request.offers.forEach((entry) => {
          if (entry._id && !entry._id.equals(offer._id) && entry.status === 'pending')
            entry.status = 'rejected';
        });
      }
      appendHistory(request, {
        at: now,
        by: req.user._id,
        type: 'assigned',
        message: 'Offer accepted by requester',
      });

      await request.save();
      await populateRequest(request);

      await sendNotification(
        offer.providerId,
        'assigned',
        'You have been assigned to a service request',
        request
      );
      await sendNotification(
        request.userId,
        'assigned',
        'Service request assigned',
        request
      );
    } else {
      offer.status = 'rejected';
      appendHistory(request, {
        at: now,
        by: req.user._id,
        type: 'offer',
        message: 'Offer rejected by requester',
      });

      if (
        request.assignedProviderId &&
        isSameId(request.assignedProviderId, offer.providerId)
      ) {
        request.assignedProviderId = null;
        request.assignedProviderIds = [];
      }

      const hasAccepted = Array.isArray(request.offers)
        ? request.offers.some((entry) => entry.status === 'accepted')
        : false;
      const hasPending = Array.isArray(request.offers)
        ? request.offers.some((entry) => entry.status === 'pending')
        : false;

      if (hasAccepted) request.status = STATUS.ASSIGNED;
      else if (hasPending) request.status = STATUS.ACCEPTED;
      else request.status = STATUS.PENDING;

      await request.save();
      await populateRequest(request);

      await sendNotification(
        [offer.providerId, request.userId],
        'offer',
        'An offer was rejected on your service request',
        request
      );
    }

    res.json({
      ok: true,
      data: {
        request: toRequestJson(request.toObject(), { currentUserId: req.user._id }),
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.completeServiceRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const message = sanitizeString(req.body?.message);
    const request = await populateRequest(ServiceRequest.findById(id));
    if (!request)
      throw AppError.notFound('SERVICE_REQUEST_NOT_FOUND', 'Service request not found');

    if (!isSameId(request.userId, req.user._id))
      throw AppError.forbidden('NOT_AUTHORIZED', 'Not authorized to update this request');

    const currentStatus = normalizeStatus(request.status);

    if (currentStatus === STATUS.COMPLETED) {
      res.json({
        ok: true,
        data: {
          request: toRequestJson(request.toObject(), { currentUserId: req.user._id }),
        },
        traceId: req.traceId,
      });
      return;
    }

    if (!ALLOWED_TRANSITIONS[currentStatus]?.has(STATUS.COMPLETED) && currentStatus !== STATUS.COMPLETED)
      throw AppError.badRequest(
        'SERVICE_REQUEST_INVALID_STATE',
        'Request cannot be marked completed from the current status'
      );

    request.status = STATUS.COMPLETED;
    appendHistory(request, {
      by: req.user._id,
      type: 'completed',
      message: message || 'Request marked as completed by requester',
    });

    await request.save();
    await populateRequest(request);

    await sendNotification(
      req.user._id,
      'completed',
      'Service request completed',
      request
    );
    if (request.assignedProviderId)
      await sendNotification(
        request.assignedProviderId,
        'completed',
        'A service request you worked on was marked completed',
        request
      );

    res.json({
      ok: true,
      data: {
        request: toRequestJson(request.toObject(), { currentUserId: req.user._id }),
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.adminListServiceRequests = async (req, res, next) => {
  try {
    const {
      visibility,
      status,
      q,
      from,
      to,
      serviceId,
      page = 1,
      pageSize = 20,
    } = req.query || {};

    const filter = {};
    if (visibility && sanitizeString(visibility) && visibility !== 'all')
      filter.visibility = ensureVisibility(visibility);

    if (status && sanitizeString(status)) {
      const tokens = sanitizeString(status)
        .split(',')
        .map((token) => token.trim().toLowerCase())
        .filter((token) => ADMIN_STATUS_ALLOWED.has(token));
      if (tokens.length > 0) filter.status = { $in: tokens };
    }

    if (serviceId && Types.ObjectId.isValid(String(serviceId))) filter.serviceId = serviceId;

    if (q && sanitizeString(q)) {
      const escaped = sanitizeString(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { customName: regex },
        { description: regex },
        { location: regex },
        { phone: regex },
      ];
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limit = Math.min(100, Math.max(parseInt(pageSize, 10) || 20, 1));
    const skip = (pageNum - 1) * limit;

    const query = populateRequest(
      ServiceRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    );

    const [items, total] = await Promise.all([query.lean(), ServiceRequest.countDocuments(filter)]);

    const requestIds = Array.isArray(items)
      ? items
          .map((doc) => toObjectId(doc?._id))
          .filter((value) => Boolean(value))
      : [];

    const feedbackDocs = requestIds.length
      ? await Feedback.find({
          subjectType: 'service_request',
          subjectId: { $in: requestIds },
        }).lean()
      : [];

    const feedbackMap = new Map();
    feedbackDocs.forEach((doc) => {
      const subjectKey = doc.subjectId?.toString?.();
      const userKey = doc.user?.toString?.();
      if (subjectKey && userKey) {
        feedbackMap.set(`${subjectKey}:${userKey}`, doc);
      }
      if (subjectKey && !feedbackMap.has(subjectKey)) {
        feedbackMap.set(subjectKey, doc);
      }
    });

    const normalized = Array.isArray(items)
      ? items.map((doc) => {
          const requestId = toId(doc._id);
          const ownerId = toId(doc.userId || doc.user);
          const feedbackDoc =
            feedbackMap.get(`${requestId}:${ownerId}`) ?? feedbackMap.get(requestId) ?? null;
          return toRequestJson(doc, { isAdmin: true, feedback: feedbackDoc });
        })
      : [];

    res.json({
      ok: true,
      data: {
        items: normalized,
        total,
        page: pageNum,
        pageSize: limit,
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

const historyTypeForStatus = (status) => {
  const normalized = normalizeStatus(status);
  if (normalized === STATUS.COMPLETED) return 'completed';
  if (normalized === STATUS.CANCELLED) return 'closed';
  if (normalized === STATUS.PENDING) return 'reopened';
  if (normalized === STATUS.AWAITING_APPROVAL || normalized === STATUS.ACCEPTED) return 'offer';
  if (normalized === STATUS.ASSIGNED || normalized === STATUS.IN_PROGRESS) return 'assigned';
  return 'admin_note';
};

exports.adminUpdateServiceRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, assignedProviderId, assignedProviderIds, providerId } =
      req.body || {};

    const request = await populateRequest(ServiceRequest.findById(id));
    if (!request)
      throw AppError.notFound('SERVICE_REQUEST_NOT_FOUND', 'Service request not found');

    const updates = { changed: false };
    const now = new Date();
    const currentStatus = normalizeStatus(request.status);
    request.status = currentStatus;

    const statusToken = typeof status === 'undefined' ? '' : sanitizeString(status);
    const statusProvided = Boolean(statusToken);
    let nextStatus = statusProvided ? normalizeStatus(statusToken) : currentStatus;
    if (statusProvided && !ADMIN_STATUS_ALLOWED.has(nextStatus))
      throw AppError.badRequest('INVALID_STATUS', 'Invalid service request status');

    if (statusProvided && nextStatus !== currentStatus) {
      const allowed = ALLOWED_TRANSITIONS[currentStatus] || new Set();
      if (!allowed.has(nextStatus))
        throw AppError.badRequest('INVALID_TRANSITION', 'Status transition not allowed');
    }

    if (typeof adminNotes !== 'undefined') {
      const trimmed = sanitizeString(adminNotes);
      if (request.adminNotes !== trimmed) {
        request.adminNotes = trimmed;
        updates.changed = true;
        appendHistory(request, {
          at: now,
          by: req.user?._id ?? null,
          type: 'admin_note',
          message: trimmed || 'Admin updated notes',
        });
        updates.adminNote = true;
      }
    }

    let providerSource;
    if (typeof providerId !== 'undefined') providerSource = providerId;
    else if (typeof assignedProviderId !== 'undefined') providerSource = assignedProviderId;
    else if (Array.isArray(assignedProviderIds))
      providerSource = assignedProviderIds.find((token) => sanitizeString(token));

    let providerObjectId = null;
    if (typeof providerSource !== 'undefined') {
      providerObjectId = providerSource ? toObjectId(providerSource) : null;
      if (providerSource && !providerObjectId)
        throw AppError.badRequest('INVALID_PROVIDER', 'Invalid provider id');

      if (providerObjectId) {
        const providerDoc = await User.findOne({ _id: providerObjectId, role: 'business' })
          .select('_id role')
          .lean();
        if (!providerDoc)
          throw AppError.badRequest('INVALID_PROVIDER', 'Provider must be a registered business user');
      }

      const previousAssigned = request.assignedProviderId ? toId(request.assignedProviderId) : null;
      const nextAssigned = providerObjectId ? providerObjectId.toString() : null;
      if (previousAssigned !== nextAssigned) {
        request.assignedProviderId = providerObjectId;
        request.assignedProviderIds = providerObjectId ? [providerObjectId] : [];
        updates.changed = true;
        updates.assignedProviderId = providerObjectId;
        appendHistory(request, {
          at: now,
          by: req.user?._id ?? null,
          type: providerObjectId ? 'assigned' : 'admin_note',
          message: providerObjectId
            ? 'Provider assigned by admin'
            : 'Assigned provider cleared',
        });

        if (providerObjectId && nextStatus === currentStatus && currentStatus !== STATUS.ASSIGNED) {
          const allowed = ALLOWED_TRANSITIONS[currentStatus] || new Set();
          if (!allowed.has(STATUS.ASSIGNED))
            throw AppError.badRequest(
              'INVALID_TRANSITION',
              'Cannot assign provider from the current status'
            );
          nextStatus = STATUS.ASSIGNED;
        }

        if (!providerObjectId && nextStatus === STATUS.ASSIGNED && !statusProvided) {
          nextStatus = STATUS.PENDING;
        }
      }
    }

    const effectiveProviderId = providerObjectId || request.assignedProviderId;
    if (nextStatus === STATUS.ASSIGNED && !effectiveProviderId)
      throw AppError.badRequest('INVALID_PROVIDER_ASSIGNMENT', 'Assign a provider before marking as assigned');

    if (nextStatus !== currentStatus) {
      const allowed = ALLOWED_TRANSITIONS[currentStatus] || new Set();
      if (!allowed.has(nextStatus))
        throw AppError.badRequest('INVALID_TRANSITION', 'Status transition not allowed');
      request.status = nextStatus;
      updates.changed = true;
      updates.status = nextStatus;
      appendHistory(request, {
        at: now,
        by: req.user?._id ?? null,
        type: historyTypeForStatus(nextStatus),
        message: `Status updated to ${nextStatus}`,
      });
    }

    if (!updates.changed)
      throw AppError.badRequest('NO_UPDATE', 'Nothing to update');

    await request.save();
    await populateRequest(request);

    if (updates.assignedProviderId) {
      await sendNotification(
        updates.assignedProviderId,
        'assigned',
        'You have been assigned to a service request',
        request
      );
      await sendNotification(
        request.userId,
        'assigned',
        'Service request assigned',
        request
      );
    }

    if (updates.status) {
      const statusSubType = STATUS_NOTIFICATION_TYPES[updates.status] || 'service_request';
      const recipients = new Set();
      const ownerId = toId(request.userId || request.user);
      if (ownerId) recipients.add(ownerId);
      getAssignedProviderIds(request).forEach((id) => recipients.add(id));
      await sendNotification(Array.from(recipients), statusSubType, toStatusMessage(updates.status), request);
    }

    if (updates.adminNote) {
      await sendNotification(
        request.userId,
        'admin_note',
        'Admin added a note to your service request',
        request
      );
    }

    const ownerObjectId = toObjectId(request.userId || request.user);
    const feedbackDoc = ownerObjectId
      ? await Feedback.findOne({
          subjectType: 'service_request',
          subjectId: request._id,
          user: ownerObjectId,
        }).lean()
      : null;

    res.json({
      ok: true,
      data: {
        request: toRequestJson(request.toObject(), {
          isAdmin: true,
          currentUserId: req.user?._id ?? null,
          feedback: feedbackDoc,
        }),
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};
