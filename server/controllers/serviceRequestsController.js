const mongoose = require('mongoose');
const Service = require('../models/Service');
const ServiceRequest = require('../models/ServiceRequest');
const AppError = require('../utils/AppError');

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

const toUserSummary = (user) =>
  !user
    ? null
    : {
        _id: String(user._id),
        name: user.name,
        phone: user.phone,
        location: user.location || '',
        address: user.address || '',
      };

const toRequestJson = (doc) => {
  const service = doc.serviceId && doc.serviceId.name ? doc.serviceId : null;
  const assigned = Array.isArray(doc.assignedProviderIds)
    ? doc.assignedProviderIds.map((entry) => {
        if (entry && entry.name) return toUserSummary(entry);
        if (typeof entry === 'string') return entry;
        if (entry && typeof entry.toString === 'function') return entry.toString();
        return entry ? String(entry) : null;
      })
    : [];

  const assignedProviders = assigned.filter((entry) => typeof entry === 'object' && entry !== null);
  const assignedProviderIds = assigned
    .map((entry) =>
      typeof entry === 'object' && entry?._id
        ? entry._id
        : typeof entry === 'string'
        ? entry
        : entry?.toString?.()
    )
    .filter(Boolean);

  return {
    id: String(doc._id),
    _id: String(doc._id),
    userId: String(doc.userId),
    serviceId: doc.serviceId ? String(doc.serviceId._id || doc.serviceId) : null,
    service: toServiceJson(service),
    customName: doc.customName || '',
    description: doc.description || '',
    location: doc.location || '',
    phone: doc.phone || '',
    preferredDate: doc.preferredDate || '',
    preferredTime: doc.preferredTime || '',
    status: doc.status || 'open',
    adminNotes: doc.adminNotes || '',
    assignedProviders,
    assignedProviderIds,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

exports.createServiceRequest = async (req, res, next) => {
  try {
    const {
      serviceId,
      customName,
      description,
      location,
      phone,
      preferredDate,
      preferredTime,
    } = req.body || {};

    if (!serviceId && (!customName || !String(customName).trim()))
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

    const payload = {
      userId: req.user._id,
      description: description ? String(description).trim() : '',
      location: location ? String(location).trim() : '',
      phone: phone ? String(phone).trim() : '',
      preferredDate: preferredDate ? String(preferredDate).trim() : '',
      preferredTime: preferredTime ? String(preferredTime).trim() : '',
      status: 'open',
    };

    if (service) payload.serviceId = service._id;
    if (!service && customName) payload.customName = String(customName).trim();
    if (service && customName) payload.customName = String(customName).trim();

    const request = await ServiceRequest.create(payload);
    const normalized = request.toObject();

    res.status(201).json({
      ok: true,
      data: { request: toRequestJson(normalized) },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.listMyServiceRequests = async (req, res, next) => {
  try {
    const requests = await ServiceRequest.find({ userId: req.user._id })
      .populate('serviceId', 'name description icon')
      .populate('assignedProviderIds', 'name phone location address')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      ok: true,
      data: {
        items: requests.map((doc) => toRequestJson(doc)),
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
      status,
      q,
      from,
      to,
      serviceId,
      page = 1,
      pageSize = 20,
    } = req.query || {};

    const filter = {};
    if (status && String(status).trim()) {
      const tokens = String(status)
        .split(',')
        .map((token) => token.trim().toLowerCase())
        .filter(Boolean);
      if (tokens.length > 0) filter.status = { $in: tokens };
    }
    if (serviceId) filter.serviceId = serviceId;

    if (q && String(q).trim()) {
      const escaped = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const skip = (pageNum - 1) * limit;

    const [items, total] = await Promise.all([
      ServiceRequest.find(filter)
        .populate('serviceId', 'name description icon')
        .populate('assignedProviderIds', 'name phone location address')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ServiceRequest.countDocuments(filter),
    ]);

    res.json({
      ok: true,
      data: {
        items: items.map((doc) => toRequestJson(doc)),
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
    const { status, adminNotes, assignedProviderIds } = req.body || {};

    const update = {};
    if (typeof status !== 'undefined') {
      const normalized = String(status).toLowerCase();
      const allowed = new Set(['open', 'assigned', 'closed', 'rejected']);
      if (!allowed.has(normalized))
        throw AppError.badRequest('INVALID_STATUS', 'Invalid service request status');
      update.status = normalized;
    }

    if (typeof adminNotes !== 'undefined')
      update.adminNotes = String(adminNotes || '').trim();

    if (Array.isArray(assignedProviderIds)) {
      const ids = assignedProviderIds
        .map((value) => {
          if (!value) return null;
          try {
            return new mongoose.Types.ObjectId(value);
          } catch (err) {
            return null;
          }
        })
        .filter(Boolean);
      update.assignedProviderIds = [...new Set(ids.map((value) => value.toString()))].map(
        (value) => new mongoose.Types.ObjectId(value)
      );
    }

    if (Object.keys(update).length === 0)
      throw AppError.badRequest('NO_UPDATE', 'Nothing to update');

    update.updatedAt = new Date();

    const request = await ServiceRequest.findByIdAndUpdate(id, update, {
      new: true,
    })
      .populate('serviceId', 'name description icon')
      .populate('assignedProviderIds', 'name phone location address')
      .lean();

    if (!request)
      throw AppError.notFound('SERVICE_REQUEST_NOT_FOUND', 'Service request not found');

    res.json({
      ok: true,
      data: { request: toRequestJson(request) },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};
