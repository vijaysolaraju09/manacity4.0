const Verified = require('../models/Verified');
const User = require('../models/User');
const AppError = require('../utils/AppError');

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

    const match = {};
    if (status === 'approved') {
      match.$or = [
        { status: 'approved' },
        { status: { $exists: false } },
        { status: null },
      ];
    } else if (status) {
      match.status = status;
    }

    const searchRegex = q ? new RegExp(q, 'i') : null;
    const locationRegex = location ? new RegExp(location, 'i') : null;

    let sortField = 'createdAt';
    let sortDir = -1;
    if (sort) {
      sortDir = sort.startsWith('-') ? -1 : 1;
      let field = sort.startsWith('-') ? sort.slice(1) : sort;
      if (field === 'rating') field = 'ratingAvg';
      sortField = field;
    }
    const sortObj = { [sortField]: sortDir };

    const pipelineBase = [
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
    if (searchRegex) {
      pipelineBase.push({
        $match: {
          $or: [
            { profession: searchRegex },
            { bio: searchRegex },
            { 'user.name': searchRegex },
          ],
        },
      });
    }
    if (locationRegex) {
      pipelineBase.push({ $match: { 'user.location': locationRegex } });
    }

    const itemsPipeline = [
      ...pipelineBase,
      { $sort: sortObj },
      { $skip: skip },
      { $limit: limit },
    ];
    const countPipeline = [...pipelineBase, { $count: 'count' }];

    const [itemsRaw, totalRaw] = await Promise.all([
      Verified.aggregate(itemsPipeline),
      Verified.aggregate(countPipeline),
    ]);
    const total = totalRaw[0]?.count || 0;
    const cards = itemsRaw.map((v) => {
      const u = v.user;
      delete v.user;
      return Verified.hydrate(v).toCardJSON(u);
    });
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
    const verified = await Verified.findById(req.params.id).populate(
      'user',
      'name phone location address'
    );
    if (!verified || verified.status !== 'approved')
      throw AppError.notFound('VERIFIED_NOT_FOUND', 'Verified not found');
    const card = verified.toCardJSON(verified.user);
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
    const card = verified.toCardJSON(verified.user);
    res.json({ ok: true, data: { verified: card }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};
