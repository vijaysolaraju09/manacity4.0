const mongoose = require('mongoose');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { notifyUser } = require('../services/notificationService');

const STATUS_TO_INTERNAL = {
  active: 'approved',
  approved: 'approved',
  pending: 'pending',
  suspended: 'rejected',
  rejected: 'rejected',
};

const STATUS_TO_EXTERNAL = {
  approved: 'active',
  pending: 'pending',
  rejected: 'suspended',
};

const toIdString = (value) => {
  if (!value) return undefined;
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  return String(value);
};

const parseSort = (raw, fallback = '-createdAt') => {
  const sort = typeof raw === 'string' && raw.trim() ? raw.trim() : fallback;
  const direction = sort.startsWith('-') ? -1 : 1;
  const key = sort.startsWith('-') ? sort.slice(1) : sort;
  return { [key || 'createdAt']: direction };
};

const sanitizeRegex = (value) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
};

const mapShop = (doc) => {
  const id = toIdString(doc._id);
  const ownerId = toIdString(doc.owner?._id || doc.owner);
  return {
    _id: id,
    id,
    name: doc.name,
    owner: doc.owner?.name || '',
    ownerId,
    category: doc.category,
    location: doc.location,
    status: STATUS_TO_EXTERNAL[doc.status] || doc.status,
    productsCount: doc.productsCount ?? 0,
    createdAt: doc.createdAt,
  };
};

const mapRequest = (doc) => {
  const id = toIdString(doc._id);
  return {
    _id: id,
    id,
    name: doc.name,
    category: doc.category,
    location: doc.location,
    address: doc.address || '',
    status: doc.status,
    createdAt: doc.createdAt,
    owner: doc.owner
      ? {
          _id: toIdString(doc.owner._id),
          name: doc.owner.name,
          phone: doc.owner.phone,
        }
      : null,
  };
};

const buildShopPipeline = ({ match, search, withOwner = true }) => {
  const pipeline = [{ $match: match }];

  if (withOwner) {
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'owner',
          foreignField: '_id',
          as: 'owner',
        },
      },
      { $unwind: '$owner' },
    );
  }

  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { name: search },
          ...(withOwner
            ? [
                { 'owner.name': search },
                { 'owner.phone': search },
              ]
            : []),
        ],
      },
    });
  }

  pipeline.push({
    $lookup: {
      from: 'products',
      let: { shopId: '$_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$shop', '$$shopId'] },
                { $ne: ['$isDeleted', true] },
              ],
            },
          },
        },
        { $count: 'count' },
      ],
      as: 'productsStats',
    },
  });

  pipeline.push({
    $addFields: {
      productsCount: {
        $ifNull: [{ $arrayElemAt: ['$productsStats.count', 0] }, 0],
      },
    },
  });

  pipeline.push({ $project: { productsStats: 0 } });

  return pipeline;
};

exports.listShopRequests = async (req, res, next) => {
  try {
    const {
      status = 'pending',
      category,
      location,
      sort = '-createdAt',
      page = 1,
      pageSize = 10,
    } = req.query;

    const match = {};
    if (status) {
      const mappedStatus = STATUS_TO_INTERNAL[status] || status;
      match.status = mappedStatus;
    }
    if (category) match.category = category;
    if (location) match.location = location;

    const sortObj = parseSort(sort, '-createdAt');
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 10));
    const skip = (pageNum - 1) * limit;

    const pipelineBase = buildShopPipeline({ match, search: null });

    const [items, totalAgg] = await Promise.all([
      Shop.aggregate([...pipelineBase, { $sort: sortObj }, { $skip: skip }, { $limit: limit }]),
      Shop.aggregate([...pipelineBase, { $count: 'count' }]),
    ]);

    const total = totalAgg[0]?.count || 0;
    const requests = items.map(mapRequest);

    res.json({
      ok: true,
      data: {
        items: requests,
        requests,
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

exports.listShops = async (req, res, next) => {
  try {
    const {
      query,
      status,
      category,
      sort = '-createdAt',
      page = 1,
      pageSize = 10,
    } = req.query;

    const match = {};
    if (status) {
      const mappedStatus = STATUS_TO_INTERNAL[status] || status;
      match.status = mappedStatus;
    }
    if (category) match.category = category;

    const search = sanitizeRegex(query);

    const sortObj = parseSort(sort, '-createdAt');
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 10));
    const skip = (pageNum - 1) * limit;

    const pipelineBase = buildShopPipeline({ match, search });

    const [items, totalAgg] = await Promise.all([
      Shop.aggregate([...pipelineBase, { $sort: sortObj }, { $skip: skip }, { $limit: limit }]),
      Shop.aggregate([...pipelineBase, { $count: 'count' }]),
    ]);

    const total = totalAgg[0]?.count || 0;
    const shops = items.map(mapShop);

    res.json({
      ok: true,
      data: {
        items: shops,
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

exports.updateShop = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw AppError.badRequest('INVALID_SHOP_ID', 'Invalid shop id');
    }

    const shop = await Shop.findById(id);
    if (!shop) {
      throw AppError.notFound('SHOP_NOT_FOUND', 'Shop not found');
    }

    const { name, category, location, status } = req.body || {};
    if (name !== undefined) shop.name = name;
    if (category !== undefined) shop.category = category;
    if (location !== undefined) shop.location = location;
    if (status !== undefined) {
      const normalizedStatus =
        typeof status === 'string' ? status.toLowerCase() : status;
      const mappedStatus =
        STATUS_TO_INTERNAL[normalizedStatus] || STATUS_TO_INTERNAL[status] || normalizedStatus;
      if (mappedStatus && ['pending', 'approved', 'rejected'].includes(mappedStatus)) {
        shop.status = mappedStatus;
      }
    }

    await shop.save();

    const [withOwner] = await Shop.aggregate([
      ...buildShopPipeline({ match: { _id: shop._id }, search: null }),
      { $limit: 1 },
    ]);

    res.json({
      ok: true,
      data: { shop: mapShop(withOwner || shop) },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteShop = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw AppError.badRequest('INVALID_SHOP_ID', 'Invalid shop id');
    }

    const shop = await Shop.findById(id);
    if (!shop) {
      throw AppError.notFound('SHOP_NOT_FOUND', 'Shop not found');
    }

    await Product.updateMany(
      { shop: shop._id },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );
    await shop.deleteOne();

    res.json({ ok: true, data: { message: 'Shop deleted' }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

const transitionShopStatus = async (req, res, next, status) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw AppError.badRequest('INVALID_SHOP_ID', 'Invalid shop id');
    }

    const shop = await Shop.findById(id);
    if (!shop) {
      throw AppError.notFound('SHOP_NOT_FOUND', 'Shop not found');
    }

    shop.status = status;
    await shop.save();

    if (shop.owner) {
      const update = { businessStatus: status };
      if (status === 'approved') {
        update.role = 'business';
      }
      await User.findByIdAndUpdate(shop.owner, update);
      if (status === 'approved') {
        await notifyUser(shop.owner, { type: 'system', message: 'Your request has been approved' });
      }
    }

    const [withOwner] = await Shop.aggregate([
      ...buildShopPipeline({ match: { _id: shop._id }, search: null }),
      { $limit: 1 },
    ]);

    res.json({
      ok: true,
      data: { shop: mapShop(withOwner || shop) },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.approveShop = (req, res, next) => transitionShopStatus(req, res, next, 'approved');
exports.rejectShop = (req, res, next) => transitionShopStatus(req, res, next, 'rejected');
