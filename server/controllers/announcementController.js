const Announcement = require('../models/Announcement');
const AppError = require('../utils/AppError');

const buildUpdate = (payload = {}) => {
  const updates = {};

  if (typeof payload.title === 'string') {
    updates.title = payload.title.trim();
  }

  if (typeof payload.text === 'string') {
    updates.text = payload.text.trim();
  }

  if (payload.image === null || payload.image === '') {
    updates.image = null;
  } else if (typeof payload.image === 'string') {
    updates.image = payload.image.trim();
  }

  if (payload.ctaText === null || payload.ctaText === '') {
    updates.ctaText = null;
  } else if (typeof payload.ctaText === 'string') {
    updates.ctaText = payload.ctaText.trim();
  }

  if (payload.ctaLink === null || payload.ctaLink === '') {
    updates.ctaLink = null;
  } else if (typeof payload.ctaLink === 'string') {
    updates.ctaLink = payload.ctaLink.trim();
  }

  if (typeof payload.active === 'boolean') {
    updates.active = payload.active;
  }

  return updates;
};

const deactivateOtherAnnouncements = async (id) => {
  await Announcement.updateMany(
    {
      _id: { $ne: id },
      active: true,
      deletedAt: null,
    },
    { $set: { active: false } }
  );
};

exports.listAnnouncements = async (_req, res, next) => {
  try {
    const items = await Announcement.find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ items });
  } catch (err) {
    next(err);
  }
};

exports.createAnnouncement = async (req, res, next) => {
  try {
    const payload = buildUpdate(req.body);
    if (!payload.title || !payload.text) {
      throw AppError.badRequest('ANNOUNCEMENT_INVALID', 'Title and text are required');
    }

    const announcement = await Announcement.create(payload);

    if (announcement.active) {
      await deactivateOtherAnnouncements(announcement._id);
    }

    res.status(201).json({ announcement });
  } catch (err) {
    next(err);
  }
};

exports.updateAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findById(id);

    if (!announcement || announcement.isDeleted()) {
      throw AppError.notFound('ANNOUNCEMENT_NOT_FOUND', 'Announcement not found');
    }

    const payload = buildUpdate(req.body);
    Object.assign(announcement, payload);
    await announcement.save();

    if (announcement.active) {
      await deactivateOtherAnnouncements(announcement._id);
    }

    res.json({ announcement });
  } catch (err) {
    next(err);
  }
};

exports.deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findById(id);

    if (!announcement || announcement.isDeleted()) {
      throw AppError.notFound('ANNOUNCEMENT_NOT_FOUND', 'Announcement not found');
    }

    announcement.deletedAt = new Date();
    announcement.active = false;
    await announcement.save();

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
