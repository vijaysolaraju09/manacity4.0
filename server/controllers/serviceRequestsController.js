const mongoose = require('mongoose');
const Service = require('../models/Service');
const ServiceRequest = require('../models/ServiceRequest');
const AppError = require('../utils/AppError');
const { notifyUser } = require('../services/notificationService');

const { Types } = mongoose;

const MAX_REOPEN_COUNT = 3;
const OFFERABLE_STATUSES = new Set(['open', 'offered']);
const ADMIN_STATUS_ALLOWED = new Set([
  'open',
  'offered',
  'assigned',
  'in_progress',
  'completed',
  'closed',
]);

const isAssignedStatus = (value) => {
  const normalized = sanitizeString(value).toLowerCase();
  return normalized === 'assigned' || normalized === 'in_progress';
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

  const service = doc.serviceId && doc.serviceId.name ? doc.serviceId : doc.service;
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

  return {
    id: toId(doc._id),
    _id: toId(doc._id),
    userId: ownerId,
    serviceId: doc.serviceId ? toId(doc.serviceId) : null,
    service: toServiceJson(service),
    customName: doc.customName || '',
    description: doc.description || '',
    location: doc.location || '',
    phone: isOwner || isAdmin ? doc.phone || '' : '',
    preferredDate: doc.preferredDate || '',
    preferredTime: doc.preferredTime || '',
    visibility: doc.visibility || 'public',
    status: doc.status || 'open',
    adminNotes: doc.adminNotes || '',
    reopenedCount: typeof doc.reopenedCount === 'number' ? doc.reopenedCount : 0,
    assignedProviderId: doc.assignedProviderId ? toId(doc.assignedProviderId) : null,
    assignedProvider,
    assignedProviders,
    assignedProviderIds,
    offers,
    offersCount: Array.isArray(doc.offers) ? doc.offers.length : offers.length,
    history,
    isAnonymizedPublic:
      typeof doc.isAnonymizedPublic === 'boolean' ? doc.isAnonymizedPublic : true,
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
  };
};

const populateRequest = (query) =>
  query
    .populate('serviceId', 'name description icon')
    .populate('assignedProviderId', 'name phone location address')
    .populate('assignedProviderIds', 'name phone location address')
    .populate('offers.providerId', 'name phone location address');

const sendNotification = async (userIds, subType, message) => {
  const ids = (Array.isArray(userIds) ? userIds : [userIds])
    .map((id) => toId(id))
    .filter(Boolean);
  if (!ids.length) return;
  await Promise.allSettled(
    ids.map((id) =>
      notifyUser(id, {
        type: 'service_request',
        subType,
        message,
      })
    )
  );
};

const toStatusMessage = (status) => {
  if (!status) return 'Service request updated';
  const normalized = String(status).trim().replace(/_/g, ' ');
  return `Service request ${normalized}`;
};

exports.createServiceRequest = async (req, res, next) => {
  try {
    const body = req.body || {};
    const serviceId = sanitizeString(body.serviceId);
    const customName = sanitizeString(body.customName);
    const description = sanitizeString(body.description);
    const location = sanitizeString(body.location);
    let phone = sanitizeString(body.phone);
    const preferredDate = sanitizeString(body.preferredDate);
    const preferredTime = sanitizeString(body.preferredTime);
    const visibility = ensureVisibility(body.visibility);

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

    const payload = {
      userId: req.user._id,
      description,
      location,
      phone,
      preferredDate,
      preferredTime,
      visibility,
      status: 'open',
      isAnonymizedPublic: visibility === 'public',
    };

    if (service) payload.serviceId = service._id;
    if (customName) payload.customName = customName;

    appendHistory(payload, {
      by: req.user?._id ?? null,
      type: 'created',
      message: customName || (service?.name ? `Requested ${service.name}` : ''),
    });

    const request = new ServiceRequest(payload);
    await request.save();
    await populateRequest(request);

    await sendNotification(
      req.user._id,
      'created',
      'Service request submitted successfully'
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
    const requests = await populateRequest(
      ServiceRequest.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .lean()
    );

    const items = Array.isArray(requests)
      ? requests.map((doc) => toRequestJson(doc, { currentUserId: req.user._id }))
      : [];

    res.json({
      ok: true,
      data: { items },
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

    if (!['completed', 'closed'].includes(request.status))
      throw AppError.badRequest('SERVICE_REQUEST_NOT_CLOSED', 'Request is not closed');

    if ((request.reopenedCount ?? 0) >= MAX_REOPEN_COUNT)
      throw AppError.badRequest(
        'SERVICE_REQUEST_REOPEN_LIMIT',
        'You have reached the maximum number of reopen attempts'
      );

    const previousAssigned = request.assignedProviderId;

    request.status = 'open';
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

    await sendNotification(req.user._id, 'reopened', 'Service request reopened');
    if (previousAssigned)
      await sendNotification(
        previousAssigned,
        'reopened',
        'A service request you were assigned to has been reopened'
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

    const filter = { visibility: 'public' };
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

    const baseQuery = ServiceRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('customName description location status createdAt offers serviceId visibility isAnonymizedPublic')
      .populate('serviceId', 'name');

    const [items, total] = await Promise.all([
      baseQuery.lean(),
      ServiceRequest.countDocuments(filter),
    ]);

    const normalized = Array.isArray(items)
      ? items.map((doc) => ({
          id: toId(doc._id),
          _id: toId(doc._id),
          serviceId: doc.serviceId ? toId(doc.serviceId._id || doc.serviceId) : null,
          title: doc.serviceId?.name || doc.customName || 'Service request',
          description: doc.description ? doc.description.slice(0, 220) : '',
          location: anonymizeLocation(doc.location),
          createdAt: doc.createdAt || null,
          status: doc.status || 'open',
          offersCount: Array.isArray(doc.offers) ? doc.offers.length : 0,
          visibility: doc.visibility || 'public',
          requester: 'Anonymous',
        }))
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

    if (!OFFERABLE_STATUSES.has(request.status || 'open'))
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

    if (request.status === 'open') request.status = 'offered';

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
      'You received a new offer on your service request'
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
      request.status = 'assigned';
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
        'You have been assigned to a service request'
      );
      await sendNotification(request.userId, 'assigned', 'Service request assigned');
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

      if (hasAccepted) request.status = 'assigned';
      else if (hasPending) request.status = 'offered';
      else request.status = 'open';

      await request.save();
      await populateRequest(request);

      await sendNotification(
        [offer.providerId, request.userId],
        'offer',
        'An offer was rejected on your service request'
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

    if (request.status === 'completed') {
      res.json({
        ok: true,
        data: {
          request: toRequestJson(request.toObject(), { currentUserId: req.user._id }),
        },
        traceId: req.traceId,
      });
      return;
    }

    request.status = 'completed';
    appendHistory(request, {
      by: req.user._id,
      type: 'completed',
      message: message || 'Request marked as completed by requester',
    });

    await request.save();
    await populateRequest(request);

    await sendNotification(req.user._id, 'completed', 'Service request completed');
    if (request.assignedProviderId)
      await sendNotification(
        request.assignedProviderId,
        'completed',
        'A service request you worked on was marked completed'
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

    const normalized = Array.isArray(items)
      ? items.map((doc) => toRequestJson(doc, { isAdmin: true }))
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

exports.adminUpdateServiceRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, assignedProviderId, assignedProviderIds } = req.body || {};

    const request = await populateRequest(ServiceRequest.findById(id));
    if (!request)
      throw AppError.notFound('SERVICE_REQUEST_NOT_FOUND', 'Service request not found');

    const updates = { changed: false };
    const now = new Date();

    if (typeof status !== 'undefined') {
      const normalized = sanitizeString(status).toLowerCase();
      if (!ADMIN_STATUS_ALLOWED.has(normalized))
        throw AppError.badRequest('INVALID_STATUS', 'Invalid service request status');
      if (request.status !== normalized) {
        request.status = normalized;
        updates.changed = true;
        updates.status = normalized;
        const historyType =
          normalized === 'assigned' || normalized === 'in_progress'
            ? 'assigned'
            : normalized === 'completed'
            ? 'completed'
            : normalized === 'closed'
            ? 'closed'
            : normalized === 'open'
            ? 'reopened'
            : 'offer';
        appendHistory(request, {
          at: now,
          by: req.user?._id ?? null,
          type: historyType,
          message: `Status updated to ${normalized}`,
        });
      }
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

    if (typeof assignedProviderId !== 'undefined' || Array.isArray(assignedProviderIds)) {
      const source = Array.isArray(assignedProviderIds)
        ? assignedProviderIds.find((token) => sanitizeString(token))
        : assignedProviderId;
      const providerObjectId = source ? toObjectId(source) : null;
      if (source && !providerObjectId)
        throw AppError.badRequest('INVALID_PROVIDER', 'Invalid provider id');

      const previousAssigned = request.assignedProviderId
        ? toId(request.assignedProviderId)
        : null;
      const nextAssigned = providerObjectId ? providerObjectId.toString() : null;
      if (previousAssigned !== nextAssigned) {
        request.assignedProviderId = providerObjectId;
        request.assignedProviderIds = providerObjectId ? [providerObjectId] : [];
        updates.changed = true;
        appendHistory(request, {
          at: now,
          by: req.user?._id ?? null,
          type: providerObjectId ? 'assigned' : 'admin_note',
          message: providerObjectId
            ? 'Provider assigned by admin'
            : 'Assigned provider cleared',
        });
        updates.assignedProviderId = providerObjectId;
        if (providerObjectId && !isAssignedStatus(request.status)) {
          request.status = 'assigned';
        }
      }
    }

    if (!updates.changed)
      throw AppError.badRequest('NO_UPDATE', 'Nothing to update');

    await request.save();
    await populateRequest(request);

    if (updates.assignedProviderId) {
      await sendNotification(
        updates.assignedProviderId,
        'assigned',
        'You have been assigned to a service request'
      );
      await sendNotification(request.userId, 'assigned', 'Service request assigned');
    }

    if (updates.status && (!isAssignedStatus(updates.status) || !updates.assignedProviderId)) {
      const statusSubType =
        updates.status === 'completed'
          ? 'completed'
          : updates.status === 'closed'
          ? 'closed'
          : updates.status === 'offered'
          ? 'offer'
          : updates.status === 'open'
          ? 'reopened'
          : 'service_request';
      await sendNotification(
        request.userId,
        statusSubType,
        toStatusMessage(updates.status)
      );
    }

    if (updates.adminNote) {
      await sendNotification(
        request.userId,
        'admin_note',
        'Admin added a note to your service request'
      );
    }

    res.json({
      ok: true,
      data: {
        request: toRequestJson(request.toObject(), {
          isAdmin: true,
          currentUserId: req.user?._id ?? null,
        }),
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};
