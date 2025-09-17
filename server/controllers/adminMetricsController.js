const mongoose = require('mongoose');
const User = require('../models/User');
const Shop = require('../models/Shop');
const Order = require('../models/Order');
const Event = require('../models/Event');

const DAY_MS = 24 * 60 * 60 * 1000;
const ORDER_EXCLUDED_STATUSES = ['cancelled', 'draft'];

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const parsePeriod = (period) => {
  if (!period || typeof period !== 'string') return 30;
  const trimmed = period.trim().toLowerCase();
  if (!trimmed) return 30;
  const match = trimmed.match(/^(\d+)([dwm])$/);
  if (!match) return 30;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return 30;
  const unit = match[2];
  if (unit === 'd') return Math.min(value, 365);
  if (unit === 'w') return Math.min(value * 7, 365);
  if (unit === 'm') return Math.min(value * 30, 365);
  return 30;
};

const buildDateBuckets = (days) => {
  const today = startOfDay(new Date());
  const buckets = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today.getTime() - i * DAY_MS);
    const iso = date.toISOString().slice(0, 10);
    buckets.push({ date, iso });
  }
  return buckets;
};

const orderStatusFilter = { status: { $nin: ORDER_EXCLUDED_STATUSES } };

exports.getMetricsSummary = async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const last7d = new Date(now.getTime() - 6 * DAY_MS);
    last7d.setHours(0, 0, 0, 0);
    const last30d = new Date(now.getTime() - 29 * DAY_MS);
    last30d.setHours(0, 0, 0, 0);

    const [
      users,
      shops,
      ordersToday,
      orders7d,
      orders30d,
      gmvAgg,
      activeEvents,
      signups30d,
      distinctOrderUsers,
      topShopsAgg,
      topProductsAgg,
    ] = await Promise.all([
      User.countDocuments({}),
      Shop.countDocuments({ status: 'approved' }),
      Order.countDocuments({
        ...orderStatusFilter,
        createdAt: { $gte: todayStart },
      }),
      Order.countDocuments({
        ...orderStatusFilter,
        createdAt: { $gte: last7d },
      }),
      Order.countDocuments({
        ...orderStatusFilter,
        createdAt: { $gte: last30d },
      }),
      Order.aggregate([
        { $match: orderStatusFilter },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
      Event.countDocuments({ status: { $in: ['draft', 'published', 'ongoing'] } }),
      User.countDocuments({ createdAt: { $gte: last30d } }),
      Order.distinct('user', {
        ...orderStatusFilter,
        createdAt: { $gte: last30d },
      }),
      Order.aggregate([
        {
          $match: {
            ...orderStatusFilter,
            createdAt: { $gte: last30d },
          },
        },
        { $group: { _id: '$shop', orders: { $sum: 1 } } },
        { $sort: { orders: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'shops',
            localField: '_id',
            foreignField: '_id',
            as: 'shop',
          },
        },
        { $unwind: '$shop' },
        {
          $project: {
            _id: 0,
            id: '$shop._id',
            name: '$shop.name',
            orders: 1,
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            ...orderStatusFilter,
            createdAt: { $gte: last30d },
          },
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            orders: { $sum: '$items.qty' },
            name: { $last: '$items.productSnapshot.name' },
          },
        },
        { $sort: { orders: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const gmv = Number(gmvAgg?.[0]?.total || 0);
    const conversionBase = signups30d || users || 1;
    const conversions = Math.round(
      (distinctOrderUsers.length / conversionBase) * 100,
    );

    const topShops = topShopsAgg.map((item) => ({
      id: item.id.toString(),
      name: item.name,
      orders: item.orders,
    }));

    const topProducts = topProductsAgg.map((item) => ({
      id: item._id instanceof mongoose.Types.ObjectId ? item._id.toString() : String(item._id),
      name: item.name || 'Unknown Product',
      orders: item.orders,
    }));

    res.json({
      ok: true,
      data: {
        users,
        shops,
        gmv,
        ordersToday,
        orders7d,
        orders30d,
        activeEvents,
        conversions,
        topShops,
        topProducts,
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.getMetricSeries = async (req, res, next) => {
  try {
    const metric = req.query.metric;
    const periodDays = parsePeriod(req.query.period);
    const from = new Date(Date.now() - (periodDays - 1) * DAY_MS);
    from.setHours(0, 0, 0, 0);

    let seriesMap = new Map();

    if (metric === 'signups') {
      const rows = await User.aggregate([
        { $match: { createdAt: { $gte: from } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            value: { $sum: 1 },
          },
        },
      ]);
      seriesMap = new Map(rows.map((row) => [row._id, row.value]));
    } else if (metric === 'gmv') {
      const rows = await Order.aggregate([
        {
          $match: {
            ...orderStatusFilter,
            createdAt: { $gte: from },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            value: { $sum: '$grandTotal' },
          },
        },
      ]);
      seriesMap = new Map(rows.map((row) => [row._id, Number(row.value || 0)]));
    } else {
      const rows = await Order.aggregate([
        {
          $match: {
            ...orderStatusFilter,
            createdAt: { $gte: from },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            value: { $sum: 1 },
          },
        },
      ]);
      seriesMap = new Map(rows.map((row) => [row._id, row.value]));
    }

    const buckets = buildDateBuckets(periodDays);
    const data = buckets.map(({ iso }) => ({
      date: iso,
      value: Number(seriesMap.get(iso) || 0),
    }));

    res.json({ ok: true, data, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};
