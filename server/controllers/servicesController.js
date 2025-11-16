const mongoose = require('mongoose');
const Service = require('../models/Service');
const ServiceProviderMap = require('../models/ServiceProviderMap');
const Verified = require('../models/Verified');
const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { success } = require('../src/utils/response');
const { notifyUser } = require('../services/notificationService');

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const pickNumber = (values, fallback = 0) => {
  for (const value of values) {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
  }
  return fallback;
};

const toServiceJson = (service) => {
  const isActive = service.isActive !== false;
  const active =
    typeof service.active === 'boolean' ? service.active : isActive;

  return {
    _id: String(service._id),
    id: String(service._id),
    name: service.name,
    description: service.description || '',
    icon: service.icon || '',
    isActive,
    active,
    createdBy: service.createdBy ? String(service.createdBy) : undefined,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
};

const { Types } = mongoose;

const toProviderJson = (doc) => {
  const user = doc.userId || doc.user || doc.userInfo;
  const normalizedUser = user
    ? {
        _id: String(user._id),
        name: user.name,
        phone: user.phone,
        location: user.location || '',
        address: user.address || '',
        avatarUrl: user.avatarUrl || '',
        profession: user.profession || '',
        bio: user.bio || '',
      }
    : undefined;

  return {
    id: String(doc._id || doc.id),
    mapId: doc._id ? String(doc._id) : undefined,
    serviceId: doc.serviceId ? String(doc.serviceId) : undefined,
    user: normalizedUser,
    ratingAvg: pickNumber([
      doc.ratingAvg,
      doc.rating,
      doc.rating_avg,
      doc.ratingAverage,
      normalizedUser?.ratingAvg,
    ]),
    ratingCount: pickNumber([
      doc.ratingCount,
      doc.rating_count,
      normalizedUser?.ratingCount,
    ]),
    notes: doc.notes || '',
    bio: doc.bio || normalizedUser?.bio || '',
    profession: doc.profession || normalizedUser?.profession || '',
    source: doc.source || 'mapping',
  };
};

const sanitizeString = (value) => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value).trim();
  return '';
};

const toIdString = (value) => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Types.ObjectId) return value.toString();
  if (typeof value === 'object') {
    if (value._id) return toIdString(value._id);
    if (value.id) return toIdString(value.id);
  }
  return undefined;
};

const buildServiceRequestNotificationContext = (request) => {
  const id = toIdString(request?._id || request?.id || request);
  if (!id) return { entityType: 'serviceRequest', targetType: 'serviceRequest' };
  const link = `/requests/${id}`;
  return {
    entityType: 'serviceRequest',
    entityId: id,
    redirectUrl: link,
    targetType: 'serviceRequest',
    targetId: id,
    targetLink: link,
  };
};

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof Types.ObjectId) return value;
  if (typeof value === 'string' && Types.ObjectId.isValid(value)) {
    return new Types.ObjectId(value);
  }
  return null;
};

const CUSTOMER_ROLES = new Set(['customer', 'verified']);
const PROVIDER_ROLES = new Set(['business', 'verified']);

const normalizePhone = (value) => {
  const sanitized = sanitizeString(value);
  return sanitized ? sanitized.replace(/\s+/g, '') : '';
};

const STATUS_RESPONSE_MAP = {
  open: 'OPEN',
  offered: 'OPEN',
  assigned: 'ASSIGNED',
  in_progress: 'IN_PROGRESS',
  completed: 'COMPLETED',
  closed: 'CLOSED',
};

const mapStatusForResponse = (status) => {
  const normalized = typeof status === 'string' ? status.toLowerCase() : 'open';
  return STATUS_RESPONSE_MAP[normalized] || 'OPEN';
};

const formatStatusLabel = (status) =>
  mapStatusForResponse(status)
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');

const buildUserSummary = (user) => {
  if (!user) return null;
  if (typeof user === 'string' || user instanceof Types.ObjectId) {
    const id = toIdString(user);
    return id
      ? {
          _id: id,
          id,
        }
      : null;
  }

  const id = toIdString(user._id || user.id);
  if (!id) return null;

  return {
    _id: id,
    id,
    name: sanitizeString(user.name),
    phone: sanitizeString(user.phone),
    location: sanitizeString(user.location),
    address: sanitizeString(user.address),
  };
};

const buildServiceSummary = (service) => {
  if (!service) return null;
  if (typeof service === 'string' || service instanceof Types.ObjectId) {
    const id = toIdString(service);
    return id ? { _id: id, id } : null;
  }

  const id = toIdString(service._id || service.id);
  if (!id) return null;

  return {
    _id: id,
    id,
    name: sanitizeString(service.name),
    description: sanitizeString(service.description),
    icon: sanitizeString(service.icon),
  };
};

const buildRequestResponse = (doc, options = {}) => {
  if (!doc) return null;
  const plain = typeof doc.toObject === 'function' ? doc.toObject({ virtuals: true }) : doc;

  const id = toIdString(plain._id || plain.id);
  const user = buildUserSummary(plain.user || plain.userId);
  const service = buildServiceSummary(plain.service || plain.serviceId);
  const provider = buildUserSummary(plain.provider || plain.assignedProviderId);

  const desc = sanitizeString(plain.desc) || sanitizeString(plain.description);
  const status = mapStatusForResponse(plain.status);

  const base = {
    id,
    _id: id,
    userId: user?._id,
    user,
    serviceId: service?._id || null,
    service,
    desc,
    description: desc,
    location: sanitizeString(plain.location),
    phone: normalizePhone(plain.phone),
    providerId: provider?._id || null,
    provider,
    status,
    statusRaw: plain.status || 'open',
    adminNotes: sanitizeString(plain.adminNotes),
    createdAt: plain.createdAt || null,
    updatedAt: plain.updatedAt || null,
  };

  if (options.includeMeta) {
    base.history = Array.isArray(plain.history) ? plain.history : [];
    base.offers = Array.isArray(plain.offers) ? plain.offers : [];
  }

  return base;
};

exports.listServices = async (req, res, next) => {
  try {
    const { q, isActive } = req.query || {};
    const filter = {};

    if (typeof isActive !== 'undefined') {
      const flag = String(isActive).toLowerCase();
      if (flag === 'false') filter.isActive = false;
      else if (flag === 'true') filter.isActive = true;
    } else {
      filter.isActive = { $ne: false };
    }

    if (q && String(q).trim()) {
      const regex = new RegExp(escapeRegex(String(q).trim()), 'i');
      filter.$or = [{ name: regex }, { description: regex }];
    }

    const services = await Service.find(filter).sort({ name: 1 }).lean();

    res.json({
      ok: true,
      data: {
        items: services.map((service) => toServiceJson(service)),
        services: services.map((service) => toServiceJson(service)),
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.getServiceProviders = async (req, res, next) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id).lean();
    if (!service || service.isActive === false)
      throw AppError.notFound('SERVICE_NOT_FOUND', 'Service not found');

    const mappings = await ServiceProviderMap.find({
      serviceId: service._id,
      isActive: { $ne: false },
    })
      .populate('userId', 'name phone location address avatarUrl profession bio')
      .sort({ createdAt: -1 })
      .lean();

    const providers = mappings
      .filter((doc) => doc && doc.userId)
      .map((doc) =>
        toProviderJson({
          ...doc,
          userId: doc.userId,
          serviceId: doc.serviceId,
          source: 'service-provider-map',
        })
      );

    let fallbackProviders = [];
    if (providers.length === 0) {
      const regex = new RegExp(`^${escapeRegex(service.name)}$`, 'i');
      const verifiedList = await Verified.find({
        profession: regex,
        status: 'approved',
      })
        .populate('user', 'name phone location address avatarUrl')
        .limit(10)
        .lean();

      fallbackProviders = verifiedList.map((doc) =>
        toProviderJson({
          ...doc,
          _id: doc._id,
          userId: doc.user,
          serviceId: service._id,
          ratingAvg: doc.ratingAvg,
          ratingCount: doc.ratingCount,
          bio: doc.bio,
          profession: doc.profession,
          source: 'verified',
        })
      );
    }

    res.json({
      ok: true,
      data: {
        service: toServiceJson(service),
        providers,
        fallbackProviders,
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.createService = async (req, res, next) => {
  try {
    const { name, description, icon, isActive, active } = req.body || {};
    if (!name || !String(name).trim())
      throw AppError.badRequest('INVALID_SERVICE', 'Service name is required');

    const normalizedActive =
      typeof active === 'boolean'
        ? active
        : typeof isActive === 'boolean'
        ? isActive
        : undefined;

    const payload = {
      name: String(name).trim(),
      description: description ? String(description).trim() : undefined,
      icon: icon ? String(icon).trim() : undefined,
      isActive: typeof normalizedActive === 'boolean' ? normalizedActive : undefined,
      active: typeof normalizedActive === 'boolean' ? normalizedActive : undefined,
      createdBy: req.user?._id,
    };

    const service = await Service.create(payload);

    res.status(201).json({
      ok: true,
      data: { service: toServiceJson(service) },
      traceId: req.traceId,
    });
  } catch (err) {
    if (err && err.code === 11000)
      return next(
        AppError.conflict('SERVICE_EXISTS', 'A service with this name already exists')
      );
    next(err);
  }
};

exports.updateService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, icon, isActive, active } = req.body || {};

    const update = {};
    if (typeof name !== 'undefined') {
      if (!String(name).trim())
        throw AppError.badRequest('INVALID_SERVICE', 'Service name cannot be empty');
      update.name = String(name).trim();
    }
    if (typeof description !== 'undefined')
      update.description = String(description || '').trim();
    if (typeof icon !== 'undefined') update.icon = String(icon || '').trim();
    const normalizedActive =
      typeof active === 'boolean'
        ? active
        : typeof isActive === 'boolean'
        ? Boolean(isActive)
        : undefined;
    if (typeof normalizedActive === 'boolean') {
      update.isActive = normalizedActive;
      update.active = normalizedActive;
    }

    update.updatedAt = new Date();

    const service = await Service.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).lean();

    if (!service)
      throw AppError.notFound('SERVICE_NOT_FOUND', 'Service not found');

    res.json({
      ok: true,
      data: { service: toServiceJson(service) },
      traceId: req.traceId,
    });
  } catch (err) {
    if (err && err.code === 11000)
      return next(
        AppError.conflict('SERVICE_EXISTS', 'A service with this name already exists')
      );
    next(err);
  }
};

exports.listServiceProvidersAlias = async (req, res, next) => {
  try {
    const { q, status = 'approved', limit = 20 } = req.query || {};

    const statuses = String(status)
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const match = {};
    if (statuses.length > 0 && !statuses.includes('all') && !statuses.includes('any')) {
      match.status = { $in: statuses };
    } else {
      match.status = 'approved';
    }

    if (q && String(q).trim()) {
      const regex = new RegExp(escapeRegex(String(q).trim()), 'i');
      match.$or = [{ profession: regex }, { bio: regex }];
    }

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);

    const verified = await Verified.find(match)
      .populate('user', 'name phone location address avatarUrl')
      .sort({ updatedAt: -1 })
      .limit(parsedLimit)
      .lean();

    const items = verified.map((doc) =>
      toProviderJson({
        ...doc,
        _id: doc._id,
        userId: doc.user,
        ratingAvg: doc.ratingAvg,
        ratingCount: doc.ratingCount,
        bio: doc.bio,
        profession: doc.profession,
        source: 'verified',
      })
    );

    res.json({ ok: true, data: { items }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.createServiceRequest = async (req, res, next) => {
  try {
    if (!req.user)
      return next(
        AppError.unauthorized(
          'AUTH_REQUIRED',
          'Please sign in to request a service'
        )
      );
    if (!CUSTOMER_ROLES.has(req.user.role))
      return next(
        AppError.forbidden(
          'CUSTOMER_ONLY',
          'Only customers can create service requests'
        )
      );

    const { serviceId, desc, location, phone } = req.body || {};
    const fieldErrors = {};

    const serviceObjectId = toObjectId(serviceId);
    if (!serviceObjectId)
      fieldErrors.serviceId = 'Please choose a valid service';

    const descriptionValue = sanitizeString(desc);
    if (!descriptionValue)
      fieldErrors.desc = 'Please describe the help you need';

    const locationValue = sanitizeString(location);
    if (!locationValue)
      fieldErrors.location = 'Please share a location for the service';

    const phoneValue = sanitizeString(phone);
    if (!phoneValue)
      fieldErrors.phone = 'Please provide a phone number we can reach you on';

    if (Object.keys(fieldErrors).length)
      return next(
        AppError.unprocessable(
          'INVALID_SERVICE_REQUEST',
          'Could not create service request',
          fieldErrors
        )
      );

    const service = await Service.findOne({
      _id: serviceObjectId,
      isActive: { $ne: false },
      active: { $ne: false },
    }).lean();

    if (!service)
      return next(
        AppError.notFound(
          'SERVICE_NOT_FOUND',
          'The selected service is no longer available'
        )
      );

    const payload = {
      user: req.user._id,
      userId: req.user._id,
      service: service._id,
      serviceId: service._id,
      desc: descriptionValue,
      description: descriptionValue,
      location: locationValue,
      phone: phoneValue,
      status: 'open',
    };

    const created = await ServiceRequest.create(payload);

    const requestDoc = await ServiceRequest.findById(created._id)
      .populate('user')
      .populate('service')
      .populate('provider');

    res
      .status(201)
      .json(
        success('Service request created', {
          request: buildRequestResponse(requestDoc),
        })
      );
  } catch (err) {
    next(
      err instanceof AppError
        ? err
        : AppError.internal(
            'SERVICE_REQUEST_CREATE_FAILED',
            'Could not create service request'
          )
    );
  }
};

exports.getMyServiceRequests = async (req, res, next) => {
  try {
    if (!req.user)
      return next(
        AppError.unauthorized(
          'AUTH_REQUIRED',
          'Please sign in to view your service requests'
        )
      );
    if (!CUSTOMER_ROLES.has(req.user.role))
      return next(
        AppError.forbidden(
          'CUSTOMER_ONLY',
          'Only customers can view service requests'
        )
      );

    const userId = toObjectId(req.user._id);
    if (!userId)
      return next(
        AppError.unauthorized(
          'AUTH_REQUIRED',
          'Please sign in to view your service requests'
        )
      );

    const requests = await ServiceRequest.find({
      $or: [{ user: userId }, { userId }],
    })
      .sort({ createdAt: -1 })
      .populate('service')
      .populate('provider');

    const items = requests.map((doc) => buildRequestResponse(doc));

    res.json(success('Service requests fetched', { requests: items }));
  } catch (err) {
    next(
      err instanceof AppError
        ? err
        : AppError.internal(
            'SERVICE_REQUEST_FETCH_FAILED',
            'Could not load your service requests'
          )
    );
  }
};

exports.getAssignedServiceRequests = async (req, res, next) => {
  try {
    if (!req.user)
      return next(
        AppError.unauthorized(
          'AUTH_REQUIRED',
          'Please sign in to view assigned requests'
        )
      );
    if (!PROVIDER_ROLES.has(req.user.role))
      return next(
        AppError.forbidden(
          'PROVIDER_ONLY',
          'Only providers can view assigned service requests'
        )
      );

    const providerId = toObjectId(req.user._id);
    if (!providerId)
      return next(
        AppError.forbidden(
          'PROVIDER_ONLY',
          'Only providers can view assigned service requests'
        )
      );

    const requests = await ServiceRequest.find({
      $or: [{ provider: providerId }, { assignedProviderId: providerId }],
    })
      .sort({ createdAt: -1 })
      .populate('service')
      .populate('user')
      .populate('provider');

    const items = requests.map((doc) => buildRequestResponse(doc));

    res.json(
      success('Assigned service requests fetched', {
        requests: items,
      })
    );
  } catch (err) {
    next(
      err instanceof AppError
        ? err
        : AppError.internal(
            'SERVICE_REQUEST_ASSIGNED_FAILED',
            'Could not load assigned service requests'
          )
    );
  }
};

exports.adminUpdateServiceRequest = async (req, res, next) => {
  try {
    if (!req.user)
      return next(
        AppError.unauthorized(
          'AUTH_REQUIRED',
          'Please sign in to manage service requests'
        )
      );
    if (req.user.role !== 'admin')
      return next(
        AppError.forbidden('ADMIN_ONLY', 'Admin access required')
      );

    const { id } = req.params;
    const requestId = toObjectId(id);
    if (!requestId)
      return next(
        AppError.badRequest(
          'INVALID_SERVICE_REQUEST',
          'Could not update the service request'
        )
      );

    const { providerId, status, adminNotes } = req.body || {};
    const update = {};
    const fieldErrors = {};

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'providerId')) {
      if (providerId === null) {
        update.provider = null;
        update.assignedProviderId = null;
      } else {
        const providerObjectId = toObjectId(providerId);
        if (!providerObjectId) {
          fieldErrors.providerId = 'Please choose a valid provider';
        } else {
          const providerDocument = await User.findOne({
            _id: providerObjectId,
            role: 'business',
          })
            .select('_id name role')
            .lean();
          if (!providerDocument)
            fieldErrors.providerId =
              'Provider must be a registered business user';
          else {
            update.provider = providerObjectId;
            update.assignedProviderId = providerObjectId;
          }
        }
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'status')) {
      const normalized = sanitizeString(status);
      if (!normalized) {
        fieldErrors.status = 'Choose a valid status';
      } else {
        const upper = normalized.toUpperCase();
        const allowed = new Set([
          'OPEN',
          'ASSIGNED',
          'IN_PROGRESS',
          'COMPLETED',
          'CLOSED',
        ]);
        if (!allowed.has(upper))
          fieldErrors.status = 'Choose a valid status';
        else {
          update.status =
            upper === 'IN_PROGRESS' ? 'in_progress' : upper.toLowerCase();
        }
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'adminNotes')) {
      update.adminNotes = sanitizeString(adminNotes);
    }

    if (Object.keys(fieldErrors).length)
      return next(
        AppError.unprocessable(
          'INVALID_SERVICE_REQUEST',
          'Could not update the service request',
          fieldErrors
        )
      );

    if (Object.keys(update).length === 0) {
      const current = await ServiceRequest.findById(requestId)
        .populate('user')
        .populate('service')
        .populate('provider');
      if (!current)
        return next(
          AppError.notFound(
            'SERVICE_REQUEST_NOT_FOUND',
            'Service request not found'
          )
        );
      return res.json(
        success('Assignment saved', { request: buildRequestResponse(current) })
      );
    }

    const previous = await ServiceRequest.findById(requestId);
    if (!previous)
      return next(
        AppError.notFound(
          'SERVICE_REQUEST_NOT_FOUND',
          'Service request not found'
        )
      );

    const updated = await ServiceRequest.findByIdAndUpdate(requestId, update, {
      new: true,
      runValidators: true,
    })
      .populate('user')
      .populate('service')
      .populate('provider');

    if (!updated)
      return next(
        AppError.notFound(
          'SERVICE_REQUEST_NOT_FOUND',
          'Service request not found'
        )
      );

    const notifications = [];
    const requestOwnerId = toIdString(updated.user || updated.userId);

    const previousProviderId = toIdString(
      previous.provider || previous.assignedProviderId
    );
    const newProviderId = toIdString(
      updated.provider || updated.assignedProviderId
    );

    if (
      requestOwnerId &&
      newProviderId &&
      newProviderId !== previousProviderId
    ) {
      const context = buildServiceRequestNotificationContext(updated);
      notifications.push(
        notifyUser(requestOwnerId, {
          type: 'service_request',
          subType: 'service_assigned',
          message: 'Service request assigned',
          metadata: { requestId: toIdString(updated._id) },
          ...context,
          payload: context,
        })
      );
    }

    const previousStatusLabel = mapStatusForResponse(previous.status);
    const newStatusLabel = mapStatusForResponse(updated.status);
    if (requestOwnerId && newStatusLabel !== previousStatusLabel) {
      const context = buildServiceRequestNotificationContext(updated);
      notifications.push(
        notifyUser(requestOwnerId, {
          type: 'service_request',
          subType: 'service_status',
          message: `Service request ${formatStatusLabel(updated.status)}`,
          metadata: { requestId: toIdString(updated._id) },
          ...context,
          payload: context,
        })
      );
    }

    if (notifications.length) await Promise.allSettled(notifications);

    res.json(
      success('Assignment saved', {
        request: buildRequestResponse(updated, { includeMeta: true }),
      })
    );
  } catch (err) {
    next(
      err instanceof AppError
        ? err
        : AppError.internal(
            'SERVICE_REQUEST_UPDATE_FAILED',
            'Could not update the service request'
          )
    );
  }
};
