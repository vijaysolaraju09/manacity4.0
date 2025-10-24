const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const FormTemplate = require('../models/FormTemplate');
const AppError = require('../utils/AppError');
const {
  sanitizeHtml,
  validateSubmission,
  resolveFieldsFromEvent,
  normalizePhone,
} = require('../utils/dynamicForm');
const {
  computeIsRegistrationOpen,
  isOrganizer,
  loadEventOrThrow,
} = require('./eventController');

const STATUS_VALUES = ['submitted', 'accepted', 'rejected', 'waitlisted'];

const toPlainObject = (data) => {
  if (!data) return {};
  if (data instanceof Map) {
    return Object.fromEntries(data.entries());
  }
  return data;
};

const isValidUrl = (value) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch (err) {
    return false;
  }
};

const buildExampleSubmission = (fields) => {
  const sample = {};
  fields.forEach((field) => {
    if (field.defaultValue !== undefined && field.defaultValue !== null) {
      sample[field.id] = field.defaultValue;
      return;
    }
    switch (field.type) {
      case 'number':
        sample[field.id] = field.min !== undefined ? field.min : 1;
        break;
      case 'checkbox':
        sample[field.id] = field.options ? field.options.slice(0, 1) : [];
        break;
      case 'dropdown':
      case 'radio':
        sample[field.id] = field.options?.[0] || '';
        break;
      case 'email':
        sample[field.id] = 'player@example.com';
        break;
      case 'phone':
        sample[field.id] = '+911234567890';
        break;
      case 'url':
      case 'file':
        sample[field.id] = 'https://example.com/resource';
        break;
      case 'datetime':
        sample[field.id] = new Date().toISOString();
        break;
      default:
        sample[field.id] = field.placeholder || `Sample ${field.label}`;
    }
  });
  return sample;
};

const resolveForm = async (event) => {
  if (!event?.dynamicForm) {
    throw AppError.badRequest('FORM_NOT_CONFIGURED', 'Event form is not configured');
  }
  const fields = await resolveFieldsFromEvent(event, FormTemplate);
  if (!fields || !fields.length) {
    throw AppError.badRequest('FORM_NOT_CONFIGURED', 'Event form is not configured');
  }
  const isActive = event.dynamicForm?.isActive !== false;
  return {
    mode: event.dynamicForm.mode,
    templateId: event.dynamicForm.templateId,
    isActive,
    fields,
  };
};

const toIsoStringOrNull = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const formatRegistrationWindow = (event) => {
  const openAt = toIsoStringOrNull(event?.registrationOpenAt);
  const closeAt = toIsoStringOrNull(event?.registrationCloseAt);
  return {
    openAt,
    closeAt,
  };
};

const preparePayment = (input = {}) => {
  if (!input || typeof input !== 'object') {
    return { required: false };
  }
  const payment = {
    required: Boolean(input.required),
  };
  if (input.amount !== undefined) {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      throw AppError.badRequest('INVALID_PAYMENT_AMOUNT', 'Payment amount must be positive');
    }
    payment.amount = amount;
  }
  if (input.currency) {
    if (input.currency !== 'INR') {
      throw AppError.badRequest('UNSUPPORTED_CURRENCY', 'Only INR payments are supported');
    }
    payment.currency = 'INR';
  }
  if (input.proofUrl) {
    const sanitizedUrl = sanitizeHtml(String(input.proofUrl));
    if (!isValidUrl(sanitizedUrl)) {
      throw AppError.badRequest('INVALID_PROOF_URL', 'Provide a valid payment proof URL');
    }
    payment.proofUrl = sanitizedUrl;
  }
  return payment;
};

exports.getEventForm = async (req, res, next) => {
  try {
    const event = await loadEventOrThrow(req.params.id);
    if (event.dynamicForm?.isActive === false) {
      throw AppError.forbidden('FORM_INACTIVE', 'Registration form is not active');
    }
    const form = await resolveForm(event);
    const registrationWindow = formatRegistrationWindow(event);
    const isRegistrationOpen = computeIsRegistrationOpen(event);
    res.json({
      ok: true,
      data: {
        mode: form.mode,
        templateId: form.templateId,
        isActive: form.isActive,
        fields: form.fields,
        registrationWindow,
        isRegistrationOpen,
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.getEventFormPreview = async (req, res, next) => {
  try {
    const event = await loadEventOrThrow(req.params.id);
    if (!isOrganizer(event, req.user)) {
      throw AppError.forbidden('NOT_ALLOWED', 'Only organizers or admins can preview forms');
    }
    const form = await resolveForm(event);
    const exampleSubmission = buildExampleSubmission(form.fields);
    const registrationWindow = formatRegistrationWindow(event);
    const isRegistrationOpen = computeIsRegistrationOpen(event);
    res.json({
      ok: true,
      data: {
        mode: form.mode,
        templateId: form.templateId,
        isActive: form.isActive,
        fields: form.fields,
        exampleSubmission,
        registrationWindow,
        isRegistrationOpen,
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.submitRegistration = async (req, res, next) => {
  let session;
  try {
    if (!req.user?._id) {
      throw AppError.unauthorized('LOGIN_REQUIRED', 'Login required');
    }
    const event = await loadEventOrThrow(req.params.id);
    if (event.dynamicForm?.isActive === false) {
      throw AppError.forbidden('FORM_INACTIVE', 'Registration form is not active');
    }
    if (!computeIsRegistrationOpen(event)) {
      throw AppError.forbidden('REGISTRATION_CLOSED', 'Registration window is closed');
    }
    const form = await resolveForm(event);
    const sanitized = validateSubmission(form.fields, req.body?.data || {});
    const payment = preparePayment(req.body?.payment || {});

    if (event.teamSize <= 1) {
      const existing = await Registration.findOne({
        eventId: event._id,
        userId: req.user._id,
      }).lean();
      if (existing) {
        throw AppError.conflict('ALREADY_REGISTERED', 'You have already registered for this event');
      }
    }

    session = await mongoose.startSession();
    let registration;
    await session.withTransaction(async () => {
      const updateResult = await Event.updateOne(
        { _id: event._id, registeredCount: { $lt: event.maxParticipants } },
        { $inc: { registeredCount: 1 } },
        { session }
      );
      if (updateResult.modifiedCount !== 1) {
        throw AppError.conflict('EVENT_FULL', 'Event registration limit reached');
      }
      const [created] = await Registration.create(
        [
          {
            eventId: event._id,
            userId: req.user._id,
            data: new Map(Object.entries(sanitized)),
            status: 'submitted',
            payment,
          },
        ],
        { session }
      );
      registration = created;
    });

    res.status(201).json({
      ok: true,
      data: {
        id: String(registration._id),
        eventId: registration.eventId,
        userId: registration.userId,
        status: registration.status,
        payment: registration.payment,
        data: sanitized,
        createdAt: registration.createdAt,
      },
      traceId: req.traceId,
    });
  } catch (err) {
    if (session) {
      await session.abortTransaction().catch(() => {});
    }
    if (err?.code === 11000) {
      next(AppError.conflict('ALREADY_REGISTERED', 'You have already registered for this event'));
    } else {
      next(err);
    }
  } finally {
    if (session) {
      await session.endSession().catch(() => {});
    }
  }
};

exports.listRegistrations = async (req, res, next) => {
  try {
    const event = await loadEventOrThrow(req.params.id);
    if (!isOrganizer(event, req.user)) {
      throw AppError.forbidden('NOT_ALLOWED', 'Only organizers or admins can view registrations');
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const statusFilter = Array.isArray(req.query.status)
      ? req.query.status
      : typeof req.query.status === 'string'
      ? req.query.status.split(',')
      : [];
    const statuses = statusFilter.filter((value) => STATUS_VALUES.includes(value));

    const baseMatch = { eventId: event._id };
    if (statuses.length) {
      baseMatch.status = { $in: statuses };
    }

    const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const searchStage = search
      ? {
          $match: {
            $or: [
              { 'user.name': { $regex: search, $options: 'i' } },
              { 'user.phone': { $regex: search.replace(/[^0-9]/g, ''), $options: 'i' } },
              { 'user.email': { $regex: search, $options: 'i' } },
            ],
          },
        }
      : null;

    const pipeline = [
      { $match: baseMatch },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ];
    if (searchStage) pipeline.push(searchStage);

    const itemsPipeline = [
      ...pipeline,
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const [items, countResult] = await Promise.all([
      Registration.aggregate(itemsPipeline),
      Registration.aggregate([...pipeline, { $count: 'total' }]),
    ]);

    const total = countResult?.[0]?.total || 0;
    const preparedItems = items.map((doc) => ({
      id: String(doc._id),
      eventId: doc.eventId,
      userId: doc.userId,
      status: doc.status,
      payment: doc.payment || { required: false },
      data: toPlainObject(doc.data),
      user: doc.user
        ? {
            id: String(doc.user._id),
            name: doc.user.name,
            phone: doc.user.phone,
            email: doc.user.email,
          }
        : null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    res.json({
      ok: true,
      data: {
        items: preparedItems,
        total,
        page,
        limit,
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateRegistrationStatus = async (req, res, next) => {
  try {
    const registration = await Registration.findById(req.params.id);
    if (!registration) {
      throw AppError.notFound('REGISTRATION_NOT_FOUND', 'Registration not found');
    }
    const event = await Event.findById(registration.eventId);
    if (!event) {
      throw AppError.notFound('EVENT_NOT_FOUND', 'Event not found');
    }
    if (!isOrganizer(event, req.user)) {
      throw AppError.forbidden('NOT_ALLOWED', 'Only organizers or admins can update registrations');
    }
    const status = req.body?.status;
    if (!STATUS_VALUES.includes(status)) {
      throw AppError.badRequest('INVALID_STATUS', 'Invalid registration status');
    }
    registration.status = status;
    if (req.body?.contact) {
      const contact = normalizePhone(String(req.body.contact));
      if (!/^\+?\d{10,13}$/.test(contact)) {
        throw AppError.badRequest('INVALID_PHONE', 'Contact phone number is invalid');
      }
      registration.data.set('contact', contact);
    }
    await registration.save();
    res.json({
      ok: true,
      data: {
        id: String(registration._id),
        status: registration.status,
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};
