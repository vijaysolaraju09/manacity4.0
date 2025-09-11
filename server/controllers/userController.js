const User = require("../models/User");
const AppError = require("../utils/AppError");

const buildProfile = (user) => ({
  id: user._id,
  name: user.name,
  phone: user.phone,
  location: user.location,
  role: user.role,
  avatarUrl: user.avatarUrl,
  isVerified: user.isVerified,
  verificationStatus: user.verificationStatus,
});

exports.getMe = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthorized('UNAUTHORIZED', 'Unauthorized');
    res.json({ ok: true, data: { user: buildProfile(req.user) }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.updateMe = async (req, res, next) => {
  try {
    const { name, location, avatarUrl } = req.body;
    if (name !== undefined) req.user.name = name;
    if (location !== undefined) req.user.location = location;
    if (avatarUrl !== undefined) req.user.avatarUrl = avatarUrl;

    const updatedUser = await req.user.save();
    res.json({
      ok: true,
      data: { user: buildProfile(updatedUser) },
      traceId: req.traceId,
    });
  } catch (err) {
    next(AppError.internal('PROFILE_UPDATE_FAILED', 'Failed to update profile'));
  }
};

exports.promoteToBusiness = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  user.role = "business";
  await user.save();
  return user;
};
