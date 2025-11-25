const User = require("../models/User");
const AppError = require("../utils/AppError");

exports.updateMe = async (req, res, next) => {
  try {
    const allowed = [
      "name",
      "location",
      "address",
      "profession",
      "bio",
      "avatarUrl",
    ];

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) req.user[field] = req.body[field];
    });

    if (req.body.email !== undefined) {
      const email = req.body.email === "" ? undefined : req.body.email.toLowerCase();
      if (email) {
        const exists = await User.findOne({ email, _id: { $ne: req.user._id } });
        if (exists) throw AppError.conflict('EMAIL_EXISTS', 'Email already registered');
      }
      req.user.email = email;
    }

    if (req.body.preferences?.theme) {
      req.user.preferences = req.user.preferences || {};
      req.user.preferences.theme = req.body.preferences.theme;
    }

    const updatedUser = await req.user.save();
    res.json({
      ok: true,
      data: { user: updatedUser.toProfileJSON() },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.adminUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return next(AppError.notFound('USER_NOT_FOUND', 'User not found'));

    const fields = [
      "name",
      "phone",
      "location",
      "address",
      "profession",
      "bio",
      "avatarUrl",
      "role",
      "isVerified",
      "verificationStatus",
    ];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) user[f] = req.body[f];
    });

    if (req.body.role && req.body.role.toLowerCase() === 'business') {
      user.role = 'business';
      user.businessStatus = 'approved';
    }

    if (req.body.email !== undefined) {
      const email = req.body.email === "" ? undefined : req.body.email.toLowerCase();
      if (email) {
        const exists = await User.findOne({ email, _id: { $ne: user._id } });
        if (exists) throw AppError.conflict('EMAIL_EXISTS', 'Email already registered');
      }
      user.email = email;
    }

    if (req.body.phone !== undefined) {
      const phone = String(req.body.phone);
      const exists = await User.findOne({ phone, _id: { $ne: user._id } });
      if (exists) throw AppError.conflict('PHONE_EXISTS', 'Phone already registered');
      user.phone = phone;
    }

    if (req.body.preferences?.theme) {
      user.preferences = user.preferences || {};
      user.preferences.theme = req.body.preferences.theme;
    }

    const updated = await user.save();
    res.json({ ok: true, data: { user: updated.toProfileJSON() }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.promoteToBusiness = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  user.role = "business";
  user.businessStatus = "approved";
  await user.save();
  return user;
};
