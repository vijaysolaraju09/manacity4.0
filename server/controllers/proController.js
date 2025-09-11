const User = require('../models/User');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');

exports.listProfessionals = async (req, res, next) => {
  try {
    const { profession, location, search } = req.query;
    const query = { role: 'verified', isVerified: true };
    if (profession) query.profession = { $regex: new RegExp(profession, 'i') };
    if (location) query.location = { $regex: new RegExp(location, 'i') };
    if (search) query.name = { $regex: new RegExp(search, 'i') };
    const pros = await User.find(query).select(
      'name phone location profession bio avatarUrl'
    );
    res.json({ ok: true, data: pros, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.getProfessional = async (req, res, next) => {
  try {
    const pro = await User.findOne({
      _id: req.params.id,
      role: 'verified',
      isVerified: true,
    }).select('name phone location profession bio avatarUrl');
    if (!pro)
      throw AppError.notFound('PRO_NOT_FOUND', 'Professional not found');
    res.json({ ok: true, data: pro, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.createServiceOrder = async (req, res, next) => {
  try {
    const { targetId, description } = req.body;
    if (!targetId)
      throw AppError.badRequest('INVALID_ORDER', 'Target is required');
    const target = await User.findOne({
      _id: targetId,
      role: 'verified',
      isVerified: true,
    });
    if (!target)
      throw AppError.badRequest('INVALID_TARGET', 'Invalid professional');

    const order = await Order.create({
      type: 'service',
      customerId: req.user._id,
      targetId,
      items: [
        {
          name: description || 'Service Request',
          price: 0,
          quantity: 1,
          total: 0,
        },
      ],
      totals: { subtotal: 0, discount: 0, total: 0 },
    });

    res.status(201).json({ ok: true, data: { order }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.updateServiceOrder = async (req, res, next) => {
  try {
    const { action } = req.body;
    const order = await Order.findById(req.params.id)
      .populate('customerId', 'name phone')
      .lean();
    if (!order || order.type !== 'service')
      throw AppError.notFound('ORDER_NOT_FOUND', 'Order not found');
    if (order.targetId.toString() !== req.user._id.toString())
      throw AppError.forbidden('NOT_AUTHORIZED', 'Not authorized');

    if (action === 'accept') {
      const updated = await Order.findByIdAndUpdate(
        req.params.id,
        { status: 'accepted', contactSharedAt: new Date() },
        { new: true }
      ).populate('customerId', 'name phone');
      return res.json({ ok: true, data: updated, traceId: req.traceId });
    }

    if (action === 'reject') {
      const updated = await Order.findByIdAndUpdate(
        req.params.id,
        { status: 'cancelled' },
        { new: true }
      ).populate('customerId', 'name phone');
      return res.json({ ok: true, data: updated, traceId: req.traceId });
    }

    throw AppError.badRequest('INVALID_ACTION', 'Unknown action');
  } catch (err) {
    next(err);
  }
};

