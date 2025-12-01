const mongoose = require('mongoose');
const Service = require('../models/Service');
const ServiceRequest = require('../models/ServiceRequest');
const Offer = require('../models/Offer');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { notifyUser } = require('../services/notificationService');

const { Types } = mongoose;

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof Types.ObjectId) return value;
  if (typeof value === 'string' && Types.ObjectId.isValid(value)) return new Types.ObjectId(value);
  return null;
};

const sanitize = (value) => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
};

const statusOrder = ['Pending', 'AwaitingApproval', 'Accepted', 'InProgress', 'Completed'];
const canSeeRequester = (request, viewerId) => {
  if (!viewerId) return false;
  const viewer = String(viewerId);
  if (request.acceptedBy && String(request.acceptedBy) === viewer) return true;
  if (request.directTargetUserId && String(request.directTargetUserId) === viewer) {
    const idx = statusOrder.indexOf(request.status || 'Pending');
    const acceptedIdx = statusOrder.indexOf('Accepted');
    return idx >= acceptedIdx;
  }
  return false;
};

const maskContact = () => ({
  name: 'Community member',
});

const buildHelperSummary = (user) => {
  if (!user) return null;
  return {
    _id: String(user._id || user.id || user),
    name: sanitize(user.name),
    phone: sanitize(user.phone),
    email: sanitize(user.email),
    address: sanitize(user.address),
  };
};

const buildRequester = (user) => {
  if (!user) return null;
  return {
    _id: String(user._id),
    name: sanitize(user.name),
    phone: sanitize(user.phone),
    email: sanitize(user.email),
    address: sanitize(user.address),
  };
};

const toOfferResponse = (offer, { viewerId, ownerId }) => {
  const viewerString = viewerId ? String(viewerId) : null;
  const ownerString = ownerId ? String(ownerId) : null;
  const helper = offer.helperId && offer.helperId.name ? buildHelperSummary(offer.helperId) : null;
  const isAccepted = offer.status === 'AcceptedBySeeker';
  const isOfferHelper = helper && viewerString && helper._id === viewerString;
  const isOwner = ownerString && viewerString && ownerString === viewerString;
  const includeContact = isAccepted || isOfferHelper || isOwner;
  const helperInfo = helper
    ? includeContact
      ? helper
      : { _id: helper._id, name: helper.name || 'Provider' }
    : undefined;

  return {
    id: String(offer._id),
    helperId: String(offer.helperId),
    helperNote: offer.helperNote || offer.note || '',
    expectedReturn: offer.expectedReturn || offer.payment || '',
    status: offer.status,
    createdAt: offer.createdAt,
    helper: helperInfo,
  };
};

const toRequestResponse = (request, viewerId, { includeOffers = false } = {}) => {
  const userId = request.userId ? String(request.userId) : request.user ? String(request.user) : null;
  const viewerString = viewerId ? String(viewerId) : null;
  const isOwner = viewerString && userId && viewerString === userId;

  const base = {
    id: String(request._id),
    _id: String(request._id),
    userId,
    title: request.title || request.customName || request.description || '',
    message: request.message || request.description || '',
    details: request.details || request.desc || '',
    location: request.location || '',
    type: request.type,
    paymentOffer: request.paymentOffer || '',
    status: request.status,
    serviceId: request.serviceId ? String(request.serviceId) : null,
    directTargetUserId: request.directTargetUserId ? String(request.directTargetUserId) : null,
    acceptedBy: request.acceptedBy ? String(request.acceptedBy) : null,
    providerNote: request.providerNote || '',
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };

  const requesterVisible = canSeeRequester(request, viewerId) || request.type !== 'public';
  const requester = requesterVisible
    ? buildRequester(request.userId || request.user)
    : maskContact(request.userId || request.user);

  if (!requesterVisible) base.userId = null;
  base.requester = requester;
  base.requesterContactVisible = requesterVisible;

  if (request.acceptedBy) {
    const acceptedHelper =
      request.acceptedHelper && request.acceptedHelper.name
        ? buildHelperSummary(request.acceptedHelper)
        : request.acceptedBy && request.acceptedBy.name
        ? buildHelperSummary(request.acceptedBy)
        : null;
    if (acceptedHelper && isOwner) base.acceptedHelper = acceptedHelper;
  }

  if (includeOffers && Array.isArray(request.offersData)) {
    base.offers = request.offersData.map((offer) =>
      toOfferResponse(offer, { viewerId: viewerString, ownerId: userId })
    );
    base.offersCount = request.offersData.length;
  }

  return base;
};

const createNotification = async (userId, message, requestId) => {
  if (!userId) return;
  await notifyUser(userId, {
    type: 'service',
    message,
    redirectUrl: `/requests/${requestId}`,
    targetType: 'serviceRequest',
    targetId: requestId,
  });
};

// Services CRUD
exports.listServices = async (req, res, next) => {
  try {
    const services = await Service.find({}).populate('assignedProviders');
    res.json({ data: services });
  } catch (err) {
    next(err);
  }
};

exports.getService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id).populate('assignedProviders');
    if (!service) throw new AppError('Service not found', 404);
    res.json({ data: service });
  } catch (err) {
    next(err);
  }
};

exports.createService = async (req, res, next) => {
  try {
    const payload = { ...req.body, createdBy: req.user?._id };
    if (!payload.name && payload.title) payload.name = payload.title;
    const service = await Service.create(payload);
    res.status(201).json({ data: service });
  } catch (err) {
    next(err);
  }
};

exports.updateService = async (req, res, next) => {
  try {
    const update = { ...req.body };
    if (!update.name && update.title) update.name = update.title;
    const service = await Service.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!service) throw new AppError('Service not found', 404);
    res.json({ data: service });
  } catch (err) {
    next(err);
  }
};

exports.deleteService = async (req, res, next) => {
  try {
    await Service.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.assignProviders = async (req, res, next) => {
  try {
    const providerIds = Array.isArray(req.body.assignedProviders) ? req.body.assignedProviders.map(toObjectId).filter(Boolean) : [];
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { assignedProviders: providerIds, providers: providerIds },
      { new: true },
    ).populate('assignedProviders');
    if (!service) throw new AppError('Service not found', 404);
    res.json({ data: service });
  } catch (err) {
    next(err);
  }
};

// Service Requests
exports.createServiceRequest = async (req, res, next) => {
  try {
    const payload = {
      userId: req.user._id,
      title: req.body.title,
      description: req.body.message || req.body.description,
      message: req.body.message,
      details: req.body.details,
      location: req.body.location,
      paymentOffer: req.body.paymentOffer,
      type: req.body.type || 'public',
      visibility: req.body.type || 'public',
      serviceId: req.body.serviceId || null,
      status: req.body.type === 'private' ? 'AwaitingApproval' : 'Pending',
    };
    const request = await ServiceRequest.create(payload);
    await createNotification(req.user._id, 'Service request created', request._id);
    res.status(201).json({ data: toRequestResponse(request, req.user._id) });
  } catch (err) {
    next(err);
  }
};

exports.createDirectRequest = async (req, res, next) => {
  try {
    const payload = {
      userId: req.user._id,
      directTargetUserId: req.body.directTargetUserId,
      serviceId: req.body.serviceId || null,
      title: req.body.title,
      description: req.body.message,
      message: req.body.message,
      paymentOffer: req.body.paymentOffer,
      type: 'direct',
      visibility: 'direct',
      status: 'AwaitingApproval',
    };
    const request = await ServiceRequest.create(payload);
    await createNotification(payload.directTargetUserId, 'New direct service request', request._id);
    res.status(201).json({ data: toRequestResponse(request, req.user._id) });
  } catch (err) {
    next(err);
  }
};

exports.listPublicRequests = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query?.page, 10) || 1, 1);
    const pageSize = Math.min(100, Math.max(parseInt(req.query?.pageSize, 10) || 20, 1));
    const skip = (page - 1) * pageSize;

    const criteria = { type: 'public', status: 'Pending' };
    const viewerId = req.user?._id;
    if (viewerId) criteria.userId = { $ne: viewerId };

    const offeredRequestIds = viewerId
      ? await Offer.find({ helperId: viewerId }).distinct('requestId')
      : [];
    if (offeredRequestIds.length) criteria._id = { $nin: offeredRequestIds };

    const baseQuery = ServiceRequest.find(criteria)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate('userId');

    const [requests, total] = await Promise.all([
      baseQuery,
      ServiceRequest.countDocuments(criteria),
    ]);

    const requestIds = requests.map((r) => r._id);
    const offers = await Offer.aggregate([
      { $match: { requestId: { $in: requestIds } } },
      { $group: { _id: '$requestId', count: { $sum: 1 } } },
    ]);
    const offerMap = new Map(offers.map((o) => [String(o._id), o.count]));

    const items = requests.map((reqDoc) => {
      const shaped = toRequestResponse(reqDoc, viewerId);
      return {
        ...shaped,
        details: reqDoc.details || reqDoc.desc || '',
        offersCount: offerMap.get(String(reqDoc._id)) || 0,
      };
    });

    res.json({
      data: {
        items,
        page,
        pageSize,
        total,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.listMyRequests = async (req, res, next) => {
  try {
    const requests = await ServiceRequest.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('acceptedBy');
    const offers = await Offer.find({ requestId: { $in: requests.map((r) => r._id) } }).populate('helperId');
    const offerMap = offers.reduce((acc, offer) => {
      const key = String(offer.requestId);
      const list = acc.get(key) || [];
      list.push(offer);
      acc.set(key, list);
      return acc;
    }, new Map());

    const data = requests.map((reqDoc) => {
      const offersForRequest = offerMap.get(String(reqDoc._id)) || [];
      reqDoc.offersData = offersForRequest;
      return toRequestResponse(reqDoc, req.user._id, { includeOffers: true });
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

exports.getOffersForRequest = async (req, res, next) => {
  try {
    const request = await ServiceRequest.findById(req.params.id)
      .populate('userId')
      .populate('acceptedBy');

    if (!request) throw new AppError('Request not found', 404);

    const isOwner = String(request.userId) === String(req.user._id);
    if (!isOwner && req.user?.role !== 'admin') throw new AppError('Not allowed', 403);

    const offers = await Offer.find({ requestId: request._id }).populate('helperId');
    const ownerId = request.userId ? request.userId._id || request.userId : null;
    const shapedOffers = offers.map((offer) =>
      toOfferResponse(offer, { viewerId: req.user?._id, ownerId })
    );

    res.json({
      data: {
        offers: shapedOffers,
        request: toRequestResponse(request, req.user?._id),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.listMyServices = async (req, res, next) => {
  try {
    const acceptedOfferRequests = await Offer.find({
      helperId: req.user._id,
      status: 'AcceptedBySeeker',
    }).distinct('requestId');

    const query = {
      $or: [
        { acceptedBy: req.user._id },
        { directTargetUserId: req.user._id },
        { _id: { $in: acceptedOfferRequests } },
      ],
    };

    const requests = await ServiceRequest.find(query).populate('userId');
    const offers = await Offer.find({ requestId: { $in: requests.map((r) => r._id) }, helperId: req.user._id });
    const offerMap = new Map(offers.map((o) => [String(o.requestId), o]));
    const data = requests.map((reqDoc) => {
      const shaped = toRequestResponse(reqDoc, req.user._id);
      const ownOffer = offerMap.get(String(reqDoc._id));
      if (ownOffer) {
        shaped.myOffer = {
          id: String(ownOffer._id),
          helperNote: ownOffer.helperNote || '',
          expectedReturn: ownOffer.expectedReturn || '',
          status: ownOffer.status,
        };
      }
      return shaped;
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

exports.getServiceRequest = async (req, res, next) => {
  try {
    const request = await ServiceRequest.findById(req.params.id)
      .populate('userId')
      .populate('acceptedBy');
    if (!request) throw new AppError('Request not found', 404);
    const offers = await Offer.find({ requestId: request._id }).populate('helperId');
    request.offersData = offers;
    res.json({ data: toRequestResponse(request, req.user?._id, { includeOffers: true }) });
  } catch (err) {
    next(err);
  }
};

exports.submitOffer = async (req, res, next) => {
  try {
    const request = await ServiceRequest.findById(req.params.id).populate('userId');
    if (!request) throw new AppError('Request not found', 404);
    if (request.type !== 'public') throw new AppError('Only public requests accept offers', 400);
    if (String(request.userId) === String(req.user._id)) throw new AppError('You cannot offer on your own request', 400);

    const helperNote = req.body.helperNote ?? req.body.note;
    const expectedReturn = req.body.expectedReturn ?? req.body.payment;
    const offer = await Offer.findOneAndUpdate(
      { requestId: request._id, helperId: req.user._id },
      { helperNote, expectedReturn, status: 'Pending' },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const offers = await Offer.aggregate([
      { $match: { requestId: request._id } },
      { $group: { _id: '$requestId', count: { $sum: 1 } } },
    ]);
    const offerCount = offers.length ? offers[0].count : 0;

    await Promise.all([
      createNotification(request.userId, 'New offer submitted', request._id),
      createNotification(req.user._id, 'Offer submitted', request._id),
    ]);
    res.status(201).json({
      data: {
        request: { ...toRequestResponse(request, req.user._id), offersCount: offerCount },
        offer,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.acceptOffer = async (req, res, next) => {
  try {
    const request = await ServiceRequest.findById(req.params.id).populate('userId');
    if (!request) throw new AppError('Request not found', 404);
    if (String(request.userId) !== String(req.user._id)) throw new AppError('Not allowed', 403);
    const offer = await Offer.findOneAndUpdate(
      { _id: req.params.offerId, requestId: request._id },
      { status: 'AcceptedBySeeker' },
      { new: true },
    );
    if (!offer) throw new AppError('Offer not found', 404);
    request.acceptedBy = offer.helperId;
    request.acceptedAt = new Date();
    request.status = 'Accepted';
    await request.save();
    await Offer.updateMany(
      { requestId: request._id, _id: { $ne: offer._id }, status: 'Pending' },
      { status: 'RejectedBySeeker' },
    );

    const offers = await Offer.find({ requestId: request._id }).populate('helperId');
    request.offersData = offers;
    await request.populate('acceptedBy');

    await Promise.all([
      createNotification(offer.helperId, 'Offer accepted', request._id),
      createNotification(request.userId, 'You accepted an offer', request._id),
    ]);
    res.json({ data: toRequestResponse(request, req.user._id, { includeOffers: true }) });
  } catch (err) {
    next(err);
  }
};

exports.rejectOffer = async (req, res, next) => {
  try {
    const request = await ServiceRequest.findById(req.params.id).populate('userId');
    if (!request) throw new AppError('Request not found', 404);
    if (String(request.userId) !== String(req.user._id)) throw new AppError('Not allowed', 403);
    const offer = await Offer.findOneAndUpdate(
      { _id: req.params.offerId, requestId: request._id },
      { status: 'RejectedBySeeker' },
      { new: true },
    );
    if (!offer) throw new AppError('Offer not found', 404);
    const offers = await Offer.find({ requestId: request._id }).populate('helperId');
    request.offersData = offers;
    await Promise.all([
      createNotification(offer.helperId, 'Offer rejected', request._id),
      createNotification(request.userId, 'You rejected an offer', request._id),
    ]);
    res.json({ data: toRequestResponse(request, req.user._id, { includeOffers: true }) });
  } catch (err) {
    next(err);
  }
};

exports.acceptDirect = async (req, res, next) => {
  try {
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) throw new AppError('Request not found', 404);
    if (String(request.directTargetUserId) !== String(req.user._id)) throw new AppError('Not allowed', 403);
    request.acceptedBy = req.user._id;
    request.providerNote = req.body.providerNote;
    request.acceptedAt = new Date();
    request.status = 'Accepted';
    await request.save();
    await createNotification(request.userId, 'Direct request accepted', request._id);
    res.json({ data: toRequestResponse(request, req.user._id) });
  } catch (err) {
    next(err);
  }
};

exports.rejectDirect = async (req, res, next) => {
  try {
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) throw new AppError('Request not found', 404);
    if (String(request.directTargetUserId) !== String(req.user._id)) throw new AppError('Not allowed', 403);
    request.status = 'Rejected';
    await request.save();
    await createNotification(request.userId, 'Direct request rejected', request._id);
    res.json({ data: toRequestResponse(request, req.user._id) });
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const allowed = new Set(['InProgress', 'Completed', 'Cancelled']);
    if (!allowed.has(req.body.status)) throw new AppError('Invalid status', 400);
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) throw new AppError('Request not found', 404);
    if (String(request.acceptedBy) !== String(req.user._id) && String(request.userId) !== String(req.user._id)) {
      throw new AppError('Not allowed', 403);
    }
    request.status = req.body.status;
    await request.save();
    const recipients = [request.userId, request.acceptedBy].filter(
      (id) => id && String(id) !== String(req.user._id),
    );
    await Promise.all(
      recipients.map((userId) =>
        createNotification(userId, `Status updated to ${req.body.status}`, request._id),
      ),
    );
    res.json({ data: toRequestResponse(request, req.user._id) });
  } catch (err) {
    next(err);
  }
};

exports.assignProvider = async (req, res, next) => {
  try {
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) throw new AppError('Request not found', 404);
    request.acceptedBy = req.body.providerId;
    request.acceptedAt = new Date();
    request.status = 'Accepted';
    await request.save();
    await createNotification(req.body.providerId, 'You have been assigned to a service request', request._id);
    await createNotification(request.userId, 'An admin assigned a provider to your request', request._id);
    res.json({ data: toRequestResponse(request, req.user?._id) });
  } catch (err) {
    next(err);
  }
};
