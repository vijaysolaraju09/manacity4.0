const mongoose = require('mongoose');
const Notification = require('../models/Notification');

const { Types } = mongoose;

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof Types.ObjectId) return value;
  if (Types.ObjectId.isValid(value)) return new Types.ObjectId(value);
  return null;
};

const sanitizeEntries = (entries = []) =>
  entries
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const userId = toObjectId(entry.userId);
      const message = entry.message?.trim();
      if (!userId || !message) return null;
      return {
        userId,
        type: entry.type || 'system',
        subType: entry.subType ? String(entry.subType).trim() : undefined,
        message,
        read: entry.read ?? false,
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

