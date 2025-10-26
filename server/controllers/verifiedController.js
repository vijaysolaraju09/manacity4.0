const Verified = require('../models/Verified');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { notifyUser } = require('../services/notificationService');

exports.requestVerification = async (req, res, next) => {
  try {
    const { profession, bio = '', portfolio = [] } = req.body || {};
    if (!profession || profession.trim().length < 2)
      throw AppError.badRequest('INVALID_PROFESSION', 'Profession is required');
    const userId = req.user._id;
    let verified = await Verified.findOne({ user: userId });
    let created = false;
    if (verified) {
      verified.profession = profession;
      verified.bio = bio;
      verified.portfolio = portfolio;
      if (verified.status !== 'approved') {
        verified.status = 'pending';
      }
      await verified.save();
    } else {
      verified = await Verified.create({
        user: userId,
        profession,
        bio,
        portfolio,
      });
      created = true;
    }
    await User.findByIdAndUpdate(userId, {
      profession,
      bio,
      verificationStatus: verified.status,
      isVerified: verified.status === 'approved',
    });
    const u = await User.findById(userId).select('name phone location address');
    const card = verified.toCardJSON(u);
    res.status(created ? 201 : 200).json({
      ok: true,
      data: { verified: card },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.listVerified = async (req, res, next) => {
  try {
    const {
      q,
      status = 'approved',
      location,
      page = 1,
      pageSize = 10,
      sort,
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limit = Math.min(parseInt(pageSize, 10) || 10, 100);
    const skip = (pageNum - 1) * limit;

    const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = q ? new RegExp(escapeRegex(q), 'i') : null;
    const locationRegex = location ? new RegExp(escapeRegex(location), 'i') : null;

    const sortFieldMap = {
      rating: 'resolvedRatingAvg',
      createdAt: 'cardCreatedAt',
      updatedAt: 'cardUpdatedAt',
      name: 'name',
    };

    let sortField = 'cardUpdatedAt';
    let sortDir = -1;
    if (typeof sort === 'string' && sort.trim()) {
      sortDir = sort.startsWith('-') ? -1 : 1;
      const trimmed = sort.startsWith('-') ? sort.slice(1) : sort;
      sortField = sortFieldMap[trimmed] || trimmed || 'cardUpdatedAt';
    }

    const statusTokens = String(status || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    let includeAllStatuses = false;
    const statuses = new Set();
    if (statusTokens.length === 0) {
      statuses.add('approved');
    } else {
      for (const token of statusTokens) {
        if (['all', 'any'].includes(token)) {
          includeAllStatuses = true;
          break;
        }
        statuses.add(token);
      }
    }

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
          resolvedRatingAvg: { $ifNull: ['$verifiedProfile.ratingAvg', 0] },
          resolvedRatingCount: { $ifNull: ['$verifiedProfile.ratingCount', 0] },
          cardId: { $ifNull: ['$verifiedProfile._id', '$_id'] },
          cardCreatedAt: { $ifNull: ['$verifiedProfile.createdAt', '$createdAt'] },
          cardUpdatedAt: { $ifNull: ['$verifiedProfile.updatedAt', '$updatedAt'] },
          userId: '$_id',
        },
      },
    ];

    if (!includeAllStatuses) {
      if (statuses.size === 1) basePipeline.push({ $match: { resolvedStatus: Array.from(statuses)[0] } });
      else if (statuses.size > 1)
        basePipeline.push({ $match: { resolvedStatus: { $in: Array.from(statuses) } } });
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
      { $sort: { [sortField]: sortDir, name: 1 } },
      { $skip: skip },
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

    const countPipeline = [...basePipeline, { $count: 'count' }];

    const [items, totalAgg] = await Promise.all([
      User.aggregate(itemsPipeline),
      User.aggregate(countPipeline),
    ]);

    const total = totalAgg[0]?.count || 0;
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

    res.json({
      ok: true,
      data: { items: cards, total, page: pageNum, pageSize: limit },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.listVerificationRequests = async (req, res, next) => {
  try {
    const {
      status = 'pending',
      profession,
      page = 1,
      pageSize = 10,
    } = req.query;

    const match = {};
    if (status) match.status = status;
    if (profession) {
      const escaped = String(profession)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (escaped) {
        match.profession = { $regex: escaped, $options: 'i' };
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 10));
    const skip = (pageNum - 1) * limit;

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
    ];

    const [items, totalAgg] = await Promise.all([
      Verified.aggregate([
        ...pipeline,
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]),
      Verified.aggregate([...pipeline, { $count: 'count' }]),
    ]);

    const total = totalAgg[0]?.count || 0;
    const requests = items.map((doc) => {
      const user = doc.user;
      delete doc.user;
      return Verified.hydrate(doc).toCardJSON(user);
    });

    res.json({
      ok: true,
      data: {
        requests,
        items: requests,
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

exports.getVerifiedById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const verified = await Verified.findById(id).populate(
      'user',
      'name phone location address'
    );
    if (verified) {
      if (verified.status !== 'approved')
        throw AppError.notFound('VERIFIED_NOT_FOUND', 'Verified not found');
      const card = verified.toCardJSON(verified.user);
      res.json({ ok: true, data: { verified: card }, traceId: req.traceId });
      return;
    }

    const user = await User.findById(id).select(
      'name phone location address profession bio verificationStatus isVerified createdAt updatedAt role'
    );
    if (
      !user ||
      (!user.isVerified &&
        (user.verificationStatus || '').toLowerCase() !== 'approved' &&
        user.role !== 'verified')
    ) {
      throw AppError.notFound('VERIFIED_NOT_FOUND', 'Verified not found');
    }

    const card = {
      id: String(user._id),
      _id: String(user._id),
      user: {
        _id: String(user._id),
        name: user.name,
        phone: user.phone,
        location: user.location || '',
        address: user.address || '',
      },
      profession: user.profession || '',
      bio: user.bio || '',
      portfolio: [],
      status:
        (user.verificationStatus && user.verificationStatus !== 'none'
          ? user.verificationStatus
          : user.isVerified
          ? 'approved'
          : 'pending'),
      ratingAvg: 0,
      ratingCount: 0,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.json({ ok: true, data: { verified: card }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.updateMyVerified = async (req, res, next) => {
  try {
    const { profession, bio, portfolio } = req.body || {};
    const verified = await Verified.findOne({ user: req.user._id });
    if (!verified)
      throw AppError.notFound('VERIFIED_NOT_FOUND', 'Verification profile not found');
    if (profession) verified.profession = profession;
    if (bio !== undefined) verified.bio = bio;
    if (portfolio) verified.portfolio = portfolio;
    await verified.save();
    await User.findByIdAndUpdate(req.user._id, {
      profession,
      bio,
    });
    const u = await User.findById(req.user._id).select('name phone location address');
    const card = verified.toCardJSON(u);
    res.json({ ok: true, data: { verified: card }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.approveVerified = async (req, res, next) => {
  try {
    const verified = await Verified.findById(req.params.id).populate(
      'user',
      'name phone location address'
    );
    if (!verified)
      throw AppError.notFound('VERIFIED_NOT_FOUND', 'Verification profile not found');
    verified.status = 'approved';
    await verified.save();
    await User.findByIdAndUpdate(verified.user._id, {
      isVerified: true,
      verificationStatus: 'approved',
      profession: verified.profession,
      bio: verified.bio,
    });
    await notifyUser(verified.user._id, {
      type: 'system',
      message: 'Your request has been approved',
    });
    const card = verified.toCardJSON(verified.user);
    res.json({ ok: true, data: { verified: card }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.rejectVerified = async (req, res, next) => {
  try {
    const verified = await Verified.findById(req.params.id).populate(
      'user',
      'name phone location address'
    );
    if (!verified)
      throw AppError.notFound('VERIFIED_NOT_FOUND', 'Verification profile not found');
    verified.status = 'rejected';
    await verified.save();
    await User.findByIdAndUpdate(verified.user._id, {
      isVerified: false,
      verificationStatus: 'rejected',
    });
    await notifyUser(verified.user._id, {
      type: 'system',
      message: 'Your verification request was rejected. You can review the details and try again.',
    });
    const card = verified.toCardJSON(verified.user);
    res.json({ ok: true, data: { verified: card }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.updateVerificationRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    const allowedStatuses = ['pending', 'approved', 'rejected'];
    if (!allowedStatuses.includes(status)) {
      throw AppError.badRequest(
        'INVALID_STATUS',
        'Status must be pending, approved, or rejected'
      );
    }

    const verified = await Verified.findById(id);
    if (!verified) {
      throw AppError.notFound(
        'VERIFICATION_REQUEST_NOT_FOUND',
        'Verification request not found'
      );
    }

    verified.status = status;
    await verified.save();

    const userUpdate = {
      verificationStatus: status,
      isVerified: status === 'approved',
    };

    if (status === 'approved') {
      userUpdate.profession = verified.profession;
      userUpdate.bio = verified.bio;
    }

    if (status !== 'approved') {
      userUpdate.isVerified = false;
    }

    const updatedUser = await User.findByIdAndUpdate(verified.user, userUpdate, {
      new: true,
      select: 'name phone location address',
    });

    const populated =
      updatedUser ||
      (await User.findById(verified.user).select('name phone location address'));

    const card = verified.toCardJSON(populated);

    let message;
    if (status === 'approved') {
      message = 'Your request has been approved';
    } else if (status === 'rejected') {
      message = 'Your verification request was rejected. You can review the feedback and try again.';
    } else {
      message = 'Your verification request is back under review.';
    }
    await notifyUser(verified.user, { type: 'system', message });

    res.json({ ok: true, data: { request: card }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};
