const Event = require('../models/Event');
const User = require('../models/User');
const Announcement = require('../models/Announcement');

const serializeAnnouncement = (doc) => {
  if (!doc) return null;
  const announcement = doc.toObject ? doc.toObject() : doc;
  return {
    _id: announcement._id,
    title: announcement.title,
    text: announcement.text,
    image: announcement.image,
    ctaText: announcement.ctaText,
    ctaLink: announcement.ctaLink,
    active: announcement.active,
    createdAt: announcement.createdAt,
    updatedAt: announcement.updatedAt,
  };
};

const findActiveAnnouncement = () =>
  Announcement.findOne({ active: true, deletedAt: null })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

const respondWithAnnouncement = async (_req, res, next) => {
  try {
    const active = await findActiveAnnouncement();
    res.json({ announcement: serializeAnnouncement(active) });
  } catch (err) {
    next(err);
  }
};

exports.getAnnouncement = respondWithAnnouncement;
exports.getBanner = respondWithAnnouncement;

exports.getOffers = async (req, res) => {
  res.json([
    {
      _id: "1",
      name: "Discounted Rice",
      image: "https://via.placeholder.com/150",
      description: "50% off on rice bags",
    },
    {
      _id: "2",
      name: "Fresh Veggies",
      image: "https://via.placeholder.com/150",
      description: "Local organic vegetables",
    },
  ]);
};

const toPositiveInt = (value, fallback, { min = 1, max = 50 } = {}) => {
  const num = typeof value === 'number' ? value : parseInt(value, 10);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(Math.max(num, min), max);
};

const buildLifecycleConditions = (lifecycleStatuses) => {
  const now = new Date();
  const conditions = [];
  if (lifecycleStatuses.has('upcoming')) {
    conditions.push({
      $and: [
        { startAt: { $gt: now } },
        { status: { $nin: ['completed', 'canceled'] } },
      ],
    });
  }
  if (lifecycleStatuses.has('ongoing')) {
    conditions.push({
      $or: [
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
      ],
    });
  }
  if (lifecycleStatuses.has('past')) {
    conditions.push({
      $or: [
        { status: { $in: ['completed', 'canceled'] } },
        { endAt: { $lt: now } },
      ],
    });
  }
  return conditions;
};

exports.getVerifiedUsers = async (req, res, next) => {
  try {
    const limit = toPositiveInt(req.query.limit ?? req.query.pageSize, 10, { max: 100 });
    const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const location = typeof req.query.location === 'string' ? req.query.location.trim() : '';
    const statusParam = typeof req.query.status === 'string' ? req.query.status.trim() : '';

    const matchStatus = (() => {
      if (!statusParam || statusParam.toLowerCase() === 'approved') return 'approved';
      if (['pending', 'rejected', 'all', 'any'].includes(statusParam.toLowerCase())) {
        if (['all', 'any'].includes(statusParam.toLowerCase())) return null;
        return statusParam.toLowerCase();
      }
      return statusParam;
    })();

    const searchRegex = search ? new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
    const locationRegex = location ? new RegExp(location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;

    const basePipeline = [
      { $match: { isActive: { $ne: false }, role: { $ne: 'admin' } } },
      {
        $lookup: {
          from: 'verifieds',
          localField: '_id',
          foreignField: 'user',
          as: 'verifiedProfile',
        },
      },
      {
        $addFields: {
          verifiedProfile: { $first: '$verifiedProfile' },
          resolvedStatus: {
            $ifNull: [
              { $ifNull: ['$verifiedProfile.status', null] },
              {
                $cond: [
                  { $eq: ['$isVerified', true] },
                  'approved',
                  { $ifNull: ['$verificationStatus', 'pending'] },
                ],
              },
            ],
          },
          resolvedProfession: {
            $ifNull: [
              { $ifNull: ['$verifiedProfile.profession', null] },
              { $ifNull: ['$profession', ''] },
            ],
          },
          resolvedBio: {
            $ifNull: [
              { $ifNull: ['$verifiedProfile.bio', null] },
              { $ifNull: ['$bio', ''] },
            ],
          },
          resolvedPortfolio: {
            $cond: [
              { $isArray: '$verifiedProfile.portfolio' },
              '$verifiedProfile.portfolio',
              {
                $cond: [
                  { $isArray: '$portfolio' },
                  '$portfolio',
                  [],
                ],
              },
            ],
          },
          resolvedRatingAvg: {
            $ifNull: ['$verifiedProfile.ratingAvg', 0],
          },
          resolvedRatingCount: {
            $ifNull: ['$verifiedProfile.ratingCount', 0],
          },
          cardId: {
            $ifNull: ['$verifiedProfile._id', '$_id'],
          },
          cardCreatedAt: {
            $ifNull: ['$verifiedProfile.createdAt', '$createdAt'],
          },
          cardUpdatedAt: {
            $ifNull: ['$verifiedProfile.updatedAt', '$updatedAt'],
          },
          userId: '$_id',
        },
      },
    ];

    if (matchStatus) {
      basePipeline.push({ $match: { resolvedStatus: matchStatus } });
    }

    if (searchRegex) {
      basePipeline.push({
        $match: {
          $or: [
            { resolvedProfession: searchRegex },
            { resolvedBio: searchRegex },
            { name: searchRegex },
          ],
        },
      });
    }

    if (locationRegex) {
      basePipeline.push({ $match: { location: locationRegex } });
    }

    const itemsPipeline = [
      ...basePipeline,
      { $sort: { cardUpdatedAt: -1, name: 1 } },
      { $limit: limit },
      {
        $project: {
          _id: '$cardId',
          userId: 1,
          name: 1,
          phone: 1,
          location: 1,
          address: 1,
          profession: '$resolvedProfession',
          bio: '$resolvedBio',
          portfolio: '$resolvedPortfolio',
          status: '$resolvedStatus',
          ratingAvg: '$resolvedRatingAvg',
          ratingCount: '$resolvedRatingCount',
          createdAt: '$cardCreatedAt',
          updatedAt: '$cardUpdatedAt',
        },
      },
    ];

    const items = await User.aggregate(itemsPipeline);

    const cards = items.map((doc) => ({
      id: String(doc._id),
      _id: String(doc._id),
      user: {
        _id: String(doc.userId),
        name: doc.name,
        phone: doc.phone,
        location: doc.location || '',
        address: doc.address || '',
      },
      profession: doc.profession || '',
      bio: doc.bio || '',
      portfolio: Array.isArray(doc.portfolio) ? doc.portfolio : [],
      status: doc.status || 'pending',
      ratingAvg: typeof doc.ratingAvg === 'number' ? doc.ratingAvg : 0,
      ratingCount: typeof doc.ratingCount === 'number' ? doc.ratingCount : 0,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    res.json(cards);
  } catch (err) {
    next(err);
  }
};

exports.getEvents = async (req, res, next) => {
  try {
    const limit = toPositiveInt(req.query.limit ?? req.query.pageSize, 6, { max: 50 });
    const statusParam = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const type = typeof req.query.type === 'string' ? req.query.type.trim() : '';

    const visibilityFilter = {
      $or: [
        { visibility: 'public' },
        { visibility: { $exists: false } },
        { visibility: null },
      ],
    };

    const conditions = [visibilityFilter];

    if (category) conditions.push({ category });
    if (type) conditions.push({ type });

    if (statusParam) {
      const tokens = statusParam
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      const lifecycleStatuses = new Set();
      const eventStatuses = new Set();
      let includeAll = false;

      for (const token of tokens) {
        if (['all', 'any'].includes(token)) {
          includeAll = true;
          continue;
        }
        if (['upcoming', 'ongoing', 'past'].includes(token)) {
          lifecycleStatuses.add(token);
        } else {
          eventStatuses.add(token);
        }
      }

      if (!includeAll && eventStatuses.size) {
        const statusesArray = Array.from(eventStatuses);
        conditions.push(
          statusesArray.length === 1
            ? { status: statusesArray[0] }
            : { status: { $in: statusesArray } }
        );
      }

      if (lifecycleStatuses.size) {
        const lifecycleConditions = buildLifecycleConditions(lifecycleStatuses);
        if (lifecycleConditions.length === 1) conditions.push(lifecycleConditions[0]);
        else if (lifecycleConditions.length > 1)
          conditions.push({ $or: lifecycleConditions });
      }

      if (!includeAll && !eventStatuses.size && !lifecycleStatuses.size) {
        conditions.push({ status: statusParam });
      }
    } else {
      conditions.push({ status: { $in: ['published', 'ongoing'] } });
    }

    const filter = conditions.length === 1 ? conditions[0] : { $and: conditions };

    const events = await Event.find(filter)
      .sort({ startAt: 1, createdAt: -1 })
      .limit(limit);

    const items = events.map((event) => {
      const card = event.toCardJSON();
      let derived = 'upcoming';
      const now = new Date();
      if (
        event.status === 'canceled' ||
        event.status === 'completed' ||
        (event.endAt && event.endAt < now)
      ) {
        derived = 'past';
      } else if (
        event.status === 'ongoing' ||
        (event.startAt <= now && (!event.endAt || event.endAt >= now))
      ) {
        derived = 'ongoing';
      }
      return { ...card, lifecycleStatus: derived };
    });

    res.json(items);
  } catch (err) {
    next(err);
  }
};

exports.getSpecialProducts = async (req, res) => {
  res.json([
    {
      _id: "sp1",
      name: "Admin Combo Pack",
      image: "https://via.placeholder.com/150",
      description: "Special limited edition pack",
    },
  ]);
};
