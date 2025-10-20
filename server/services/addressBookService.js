const AppError = require('../utils/AppError');
const UserAddress = require('../models/UserAddress');

const toTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '');
const toOptionalTrimmedString = (value) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const computeFingerprint = (line1, line2 = '', city, state, pincode) =>
  [line1, line2 || '', city, state, pincode]
    .map((segment) => segment.trim().replace(/\s+/g, ' ').toLowerCase())
    .join('|');

const sanitizeAddressPayload = (input) => {
  if (!input || typeof input !== 'object') {
    throw AppError.badRequest('INVALID_ADDRESS', 'Invalid address payload');
  }

  const value = input;
  const label = toTrimmedString(value.label);
  const line1 = toTrimmedString(value.line1);
  const city = toTrimmedString(value.city);
  const state = toTrimmedString(value.state);
  const pincode = toTrimmedString(value.pincode);

  if (!label || !line1 || !city || !state || !pincode) {
    throw AppError.badRequest('INVALID_ADDRESS', 'Address is missing required fields');
  }

  const payload = {
    label,
    line1,
    city,
    state,
    pincode,
    lastUsedAt: new Date(),
  };

  const line2 = toOptionalTrimmedString(value.line2);
  if (line2) payload.line2 = line2;

  if (value.coords && typeof value.coords === 'object') {
    const lat = Number(value.coords.lat);
    const lng = Number(value.coords.lng);
    if (Number.isFinite(lat) || Number.isFinite(lng)) {
      payload.coords = {};
      if (Number.isFinite(lat)) payload.coords.lat = lat;
      if (Number.isFinite(lng)) payload.coords.lng = lng;
    }
  }

  payload.isDefault = value.isDefault === true;
  payload.fingerprint = computeFingerprint(line1, line2 || '', city, state, pincode);
  return payload;
};

const toAddressResponse = (doc) => {
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    label: doc.label,
    line1: doc.line1,
    line2: doc.line2 || '',
    city: doc.city,
    state: doc.state,
    pincode: doc.pincode,
    isDefault: !!doc.isDefault,
    coords: doc.coords ? { ...doc.coords } : null,
    lastUsedAt: doc.lastUsedAt ? doc.lastUsedAt.toISOString() : null,
  };
};

const markDefaultAddress = async (userId, addressId) => {
  await UserAddress.updateMany(
    { user: userId, _id: { $ne: addressId } },
    { $set: { isDefault: false } }
  );
};

const findAddressesForUser = async (userId) => {
  const docs = await UserAddress.find({ user: userId })
    .sort({ isDefault: -1, lastUsedAt: -1, updatedAt: -1 })
    .lean();
  return docs;
};

const listAddressResponses = async (userId) => {
  const docs = await findAddressesForUser(userId);
  return docs.map(toAddressResponse).filter(Boolean);
};

const createOrUpdateAddress = async (userId, input) => {
  const payload = sanitizeAddressPayload(input);

  try {
    const address = await UserAddress.create({ user: userId, ...payload });
    if (payload.isDefault) {
      await markDefaultAddress(userId, address._id);
    } else {
      const count = await UserAddress.countDocuments({ user: userId });
      if (count === 1) {
        address.isDefault = true;
        await address.save();
      }
    }
    return address;
  } catch (err) {
    if (err?.code === 11000) {
      const existing = await UserAddress.findOne({ user: userId, fingerprint: payload.fingerprint }).orFail();
      existing.label = payload.label;
      existing.line2 = payload.line2 || '';
      existing.coords = payload.coords;
      existing.lastUsedAt = new Date();
      if (payload.isDefault) {
        existing.isDefault = true;
      }
      await existing.save();
      if (payload.isDefault) {
        await markDefaultAddress(userId, existing._id);
      }
      return existing;
    }
    throw err;
  }
};

const upsertAddressFromShipping = async (userId, shipping) => {
  if (!shipping || typeof shipping !== 'object') return null;

  const referenceId = toOptionalTrimmedString(shipping.referenceId);
  if (referenceId) {
    const existing = await UserAddress.findOne({ user: userId, _id: referenceId });
    if (existing) {
      existing.lastUsedAt = new Date();
      await existing.save();
      return existing;
    }
  }

  const label =
    toOptionalTrimmedString(shipping.label) ||
    toOptionalTrimmedString(shipping.name) ||
    'Delivery address';

  const payload = {
    label,
    line1: toTrimmedString(shipping.address1),
    line2: toOptionalTrimmedString(shipping.address2),
    city: toTrimmedString(shipping.city),
    state: toTrimmedString(shipping.state),
    pincode: toTrimmedString(shipping.pincode),
    isDefault: false,
  };

  if (!payload.line1 || !payload.city || !payload.state || !payload.pincode) {
    return null;
  }

  payload.fingerprint = computeFingerprint(
    payload.line1,
    payload.line2 || '',
    payload.city,
    payload.state,
    payload.pincode,
  );

  if (shipping.geo && typeof shipping.geo === 'object') {
    const lat = Number(shipping.geo.lat);
    const lng = Number(shipping.geo.lng);
    if (Number.isFinite(lat) || Number.isFinite(lng)) {
      payload.coords = {};
      if (Number.isFinite(lat)) payload.coords.lat = lat;
      if (Number.isFinite(lng)) payload.coords.lng = lng;
    }
  }

  const existing = await UserAddress.findOne({ user: userId, fingerprint: payload.fingerprint });

  if (existing) {
    existing.label = label;
    existing.line2 = payload.line2 || '';
    existing.coords = payload.coords;
    existing.lastUsedAt = new Date();
    await existing.save();
    return existing;
  }

  return createOrUpdateAddress(userId, payload);
};

module.exports = {
  sanitizeAddressPayload,
  toAddressResponse,
  listAddressResponses,
  createOrUpdateAddress,
  upsertAddressFromShipping,
  findAddressesForUser,
};
