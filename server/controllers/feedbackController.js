const { Types } = require('mongoose');
const Feedback = require('../models/Feedback');
const Order = require('../models/Order');
const ServiceRequest = require('../models/ServiceRequest');
const EventRegistration = require('../models/EventRegistration');
const AppError = require('../utils/AppError');

const ORDER_COMPLETE_STATUSES = new Set(['delivered', 'completed']);
const SERVICE_COMPLETE_STATUSES = new Set(['completed', 'closed']);

const toObjectId = (value) => {
  if (value instanceof Types.ObjectId) return value;
  if (!Types.ObjectId.isValid(value)) return null;
  return new Types.ObjectId(value);
};

exports.submitFeedback = async (req, res, next) => {
  try {
    const { subjectType, subjectId, rating, comment } = req.body ?? {};

    if (!['order', 'service_request', 'event'].includes(subjectType)) {
      throw AppError.badRequest('INVALID_SUBJECT', 'Unsupported feedback subject');
    }

    const objectId = toObjectId(subjectId);
    if (!objectId) {
      throw AppError.badRequest('INVALID_REFERENCE', 'Invalid subject reference');
    }

    const normalizedComment = typeof comment === 'string' ? comment.trim() : '';
    let normalizedRating = null;
    if (rating !== undefined) {
      const parsed = Number(rating);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) {
        throw AppError.badRequest('INVALID_RATING', 'Rating must be between 1 and 5');
      }
      normalizedRating = Math.round(parsed);
    }

    const userId = req.user._id;

    if (subjectType === 'order') {
      const order = await Order.findById(objectId);
      if (!order) throw AppError.notFound('ORDER_NOT_FOUND', 'Order not found');
      if (order.user.toString() !== userId.toString()) {
        throw AppError.forbidden('NOT_AUTHORIZED', 'You cannot review this order');
      }
      if (!ORDER_COMPLETE_STATUSES.has(order.status)) {
        throw AppError.badRequest('ORDER_NOT_COMPLETED', 'Order is not yet delivered');
      }
      if (normalizedRating !== null) order.rating = normalizedRating;
      if (normalizedComment) {
        order.review = normalizedComment;
      } else if (normalizedComment === '') {
        order.review = null;
      }
      await order.save();
    } else if (subjectType === 'service_request') {
      const request = await ServiceRequest.findById(objectId);
      if (!request) throw AppError.notFound('SERVICE_REQUEST_NOT_FOUND', 'Service request not found');
      const ownerMatches =
        (request.userId && request.userId.toString() === userId.toString()) ||
        (request.user && request.user.toString() === userId.toString());
      if (!ownerMatches) {
        throw AppError.forbidden('NOT_AUTHORIZED', 'You cannot review this request');
      }
      const status = String(request.status || '').toLowerCase().replace(/\s+/g, '_');
      if (!SERVICE_COMPLETE_STATUSES.has(status)) {
        throw AppError.badRequest('REQUEST_NOT_COMPLETED', 'Service request is not completed yet');
      }
    } else {
      const registration = await EventRegistration.findOne({ event: objectId, user: userId });
      if (!registration) {
        throw AppError.notFound('EVENT_NOT_FOUND', 'Event registration not found');
      }
    }

    const update = {
      user: userId,
      subjectType,
      subjectId: objectId,
      updatedAt: new Date(),
    };

    if (normalizedRating !== null) update.rating = normalizedRating;
    if (normalizedComment || normalizedComment === '') update.comment = normalizedComment;

    const feedback = await Feedback.findOneAndUpdate(
      { user: userId, subjectType, subjectId: objectId },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    res.status(201).json({ ok: true, data: { feedback }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};
