const Announcement = require('../models/Announcement');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { notifyUsers } = require('../services/notificationService');

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

  if (typeof payload.highPriority === 'boolean') {
    updates.highPriority = payload.highPriority;
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

const normalizeLink = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//iu.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  return `/${trimmed}`;
};

const buildAnnouncementNotificationContext = (announcement) => {
  if (!announcement)
    return { entityType: 'announcement', targetType: 'announcement' };
  const id = announcement._id;
  const idString = id ? id.toString() : null;
  const fallbackLink = idString ? `/announcements/${idString}` : '/announcements';
  const ctaLink = normalizeLink(announcement.ctaLink);
  const redirectUrl = ctaLink && ctaLink.startsWith('/') ? ctaLink : fallbackLink;
  const targetLink = ctaLink || fallbackLink;
  if (!id) {
    return {
      entityType: 'announcement',
      targetType: 'announcement',
      redirectUrl,
      targetLink,
      resourceType: 'announcement',
      resourceLink: targetLink,
    };
  }
  return {
    entityType: 'announcement',
    entityId: id,
    redirectUrl,
    targetType: 'announcement',
    targetId: id,
    targetLink,
    resourceType: 'announcement',
    resourceId: id,
    resourceLink: targetLink,
  };
};

const broadcastAnnouncementNotification = async (announcement) => {
  const messageBase =
    (typeof announcement?.text === 'string' && announcement.text.trim()) ||
    (typeof announcement?.title === 'string' && announcement.title.trim()) ||
    '';
  if (!messageBase) return;
  const users = await User.find({ isActive: { $ne: false } }).select('_id').lean();
  const userIds = users.map((user) => user._id).filter(Boolean);
  if (!userIds.length) return;
  const context = buildAnnouncementNotificationContext(announcement);
  const promoPayload = {
    ...context,
    ctaText: announcement?.ctaText ?? null,
    imageUrl: announcement?.image ?? null,
    ctaLink: normalizeLink(announcement?.ctaLink),
    highPriority: Boolean(announcement?.highPriority),
  };
  await notifyUsers(userIds, {
    type: 'announcement',
    subType: 'announcement',
    title: announcement.title,
    message: messageBase,
    imageUrl: announcement.image || undefined,
    ...context,
    priority: announcement.highPriority ? 'high' : 'normal',
    pinned: Boolean(announcement.highPriority),
    payload: promoPayload,
    metadata: promoPayload,
  });
};

exports.getAnnouncementById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findOne({ _id: id, deletedAt: null });
    if (!announcement) {
      throw AppError.notFound('ANNOUNCEMENT_NOT_FOUND', 'Announcement not found');
    }
    res.json({ announcement });
  } catch (err) {
    next(err);
  }
};

exports.listActiveAnnouncements = async (_req, res, next) => {
  try {
    const items = await Announcement.find({ deletedAt: null })
      .sort({ active: -1, createdAt: -1 })
      .lean();
    res.json({ items });
  } catch (err) {
    next(err);
  }
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

    await broadcastAnnouncementNotification(announcement);

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
      await broadcastAnnouncementNotification(announcement);
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
