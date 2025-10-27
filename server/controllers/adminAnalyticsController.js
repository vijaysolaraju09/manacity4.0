const User = require('../models/User');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const Order = require('../models/Order');

const DAY_MS = 24 * 60 * 60 * 1000;
const ORDER_EXCLUDED_STATUSES = ['cancelled', 'rejected', 'CANCELLED', 'REJECTED'];

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const buildDateBuckets = (from, to) => {
  const buckets = [];
  const start = startOfDay(from);
  const end = startOfDay(to);
  for (let time = start.getTime(); time <= end.getTime(); time += DAY_MS) {
    const current = new Date(time);
    buckets.push({ date: current, iso: current.toISOString().slice(0, 10) });
  }
  return buckets;
};

const parseSince = (input) => {
  if (!input || typeof input !== 'string') return null;
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
};

const buildOrderFilter = (base = {}) => ({
  ...base,
  status: { $nin: ORDER_EXCLUDED_STATUSES },
});

exports.getAdminAnalytics = async (req, res, next) => {
  try {
    const now = new Date();
    const since = parseSince(req.query.since);
    const trendStart = since ? startOfDay(since) : startOfDay(new Date(now.getTime() - 6 * DAY_MS));

    const totalsOrderFilter = buildOrderFilter();

    const [users, shops, products, orders, gmvAgg] = await Promise.all([
      User.countDocuments({}),
      Shop.countDocuments({}),
      Product.countDocuments({}),
      Order.countDocuments(totalsOrderFilter),
      Order.aggregate([
        { $match: totalsOrderFilter },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
    ]);

    let orderTrend = [];
    let gmvTrend = [];

    const trendWindowDays = Math.max(
      1,
      Math.min(
        30,
        Math.round((startOfDay(now).getTime() - trendStart.getTime()) / DAY_MS) + 1,
      ),
    );

    if (trendWindowDays <= 60) {
      const trendBuckets = buildDateBuckets(trendStart, now);
      const match = buildOrderFilter({ createdAt: { $gte: trendBuckets[0]?.date || trendStart } });
      const trendRows = await Order.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            orders: { $sum: 1 },
            gmv: { $sum: '$grandTotal' },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const ordersMap = new Map(trendRows.map((row) => [row._id, row.orders]));
      const gmvMap = new Map(trendRows.map((row) => [row._id, row.gmv]));

      orderTrend = trendBuckets.map((bucket) => ({
        date: bucket.iso,
        value: ordersMap.get(bucket.iso) ?? 0,
      }));

      gmvTrend = trendBuckets.map((bucket) => ({
        date: bucket.iso,
        value: Math.round((gmvMap.get(bucket.iso) ?? 0) * 100) / 100,
      }));
    }

    res.json({
      ok: true,
      data: {
        totals: {
          users,
          shops,
          products,
          orders,
          gmv: Number(gmvAgg?.[0]?.total ?? 0),
        },
        trends: {
          orders: orderTrend,
          gmv: gmvTrend,
        },
        generatedAt: now.toISOString(),
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};
