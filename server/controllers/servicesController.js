const Service = require('../models/Service');
const ServiceProviderMap = require('../models/ServiceProviderMap');
const Verified = require('../models/Verified');
const AppError = require('../utils/AppError');

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const pickNumber = (values, fallback = 0) => {
  for (const value of values) {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
  }
  return fallback;
};

const toServiceJson = (service) => ({
  _id: String(service._id),
  id: String(service._id),
  name: service.name,
  description: service.description || '',
  icon: service.icon || '',
  isActive: service.isActive !== false,
  createdBy: service.createdBy ? String(service.createdBy) : undefined,
  createdAt: service.createdAt,
  updatedAt: service.updatedAt,
});

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
    const { name, description, icon, isActive } = req.body || {};
    if (!name || !String(name).trim())
      throw AppError.badRequest('INVALID_SERVICE', 'Service name is required');

    const payload = {
      name: String(name).trim(),
      description: description ? String(description).trim() : undefined,
      icon: icon ? String(icon).trim() : undefined,
      isActive: typeof isActive === 'boolean' ? isActive : undefined,
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
    const { name, description, icon, isActive } = req.body || {};

    const update = {};
    if (typeof name !== 'undefined') {
      if (!String(name).trim())
        throw AppError.badRequest('INVALID_SERVICE', 'Service name cannot be empty');
      update.name = String(name).trim();
    }
    if (typeof description !== 'undefined')
      update.description = String(description || '').trim();
    if (typeof icon !== 'undefined') update.icon = String(icon || '').trim();
    if (typeof isActive !== 'undefined') update.isActive = Boolean(isActive);

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
