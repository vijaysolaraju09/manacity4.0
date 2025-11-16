const mongoose = require('mongoose');
const Notification = require('../models/Notification');

const { Types } = mongoose;

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof Types.ObjectId) return value;
  if (Types.ObjectId.isValid(value)) return new Types.ObjectId(value);
  return null;
};

const TARGET_TYPES = new Set(['order', 'serviceRequest', 'event', 'announcement']);

const normalizeEntityType = (value) => {
  if (!value) return undefined;
  const raw = String(value).trim();
  if (TARGET_TYPES.has(raw)) return raw;
  if (raw === 'service_request') return 'serviceRequest';
  return undefined;
};

const sanitizeEntries = (entries = []) =>
  entries
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const userId = toObjectId(entry.userId);
      const message = entry.message?.trim();
      if (!userId || !message) return null;
      const title = entry.title ? String(entry.title).trim() : undefined;
      const subtitle = entry.subtitle ? String(entry.subtitle).trim() : undefined;
      const iconUrl = entry.iconUrl ? String(entry.iconUrl).trim() : undefined;
      const imageUrl = entry.imageUrl ? String(entry.imageUrl).trim() : undefined;
      const actionUrl = entry.actionUrl ? String(entry.actionUrl).trim() : undefined;
      const deepLink = entry.deepLink ? String(entry.deepLink).trim() : undefined;
      const targetLink = entry.targetLink ? String(entry.targetLink).trim() : undefined;
      const redirectUrl = entry.redirectUrl
        ? String(entry.redirectUrl).trim()
        : targetLink;
      const entityType = normalizeEntityType(entry.entityType);
      const entityId = toObjectId(entry.entityId);
      const targetType = normalizeEntityType(entry.targetType) || entityType;
      const targetId = toObjectId(entry.targetId) || entityId;
      const priority = ['low', 'normal', 'high'].includes(String(entry.priority))
        ? String(entry.priority)
        : undefined;
      const pinned = entry.pinned === true;
      const expiresAt = entry.expiresAt
        ? new Date(entry.expiresAt)
        : undefined;
      const normalizedExpiresAt =
        expiresAt instanceof Date && !Number.isNaN(expiresAt.getTime()) ? expiresAt : undefined;
      return {
        userId,
        type: entry.type || 'system',
        subType: entry.subType ? String(entry.subType).trim() : undefined,
        message,
        read: entry.read ?? false,
        title,
        subtitle,
        iconUrl,
        imageUrl,
        actionUrl,
        deepLink,
        redirectUrl,
        targetType,
        targetId,
        targetLink,
        payload: entry.payload,
        metadata: entry.metadata,
        entityType,
        entityId,
        priority: priority || undefined,
        pinned,
        expiresAt: normalizedExpiresAt,
      };
    })
    .filter(Boolean);

const insertNotifications = async (docs) => {
  if (!docs.length) return;
  try {
    await Notification.insertMany(docs, { ordered: false });
  } catch (err) {
    if (err?.code !== 11000) {
      throw err;
    }
  }
};

exports.notifyUser = async (userId, payload = {}) => {
  const docs = sanitizeEntries([{ userId, ...payload }]);
  await insertNotifications(docs);
};

exports.notifyUsers = async (userIds, payload = {}) => {
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  const docs = sanitizeEntries(ids.map((id) => ({ userId: id, ...payload })));
  await insertNotifications(docs);
};

