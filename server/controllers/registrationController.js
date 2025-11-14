const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const EventRegistration = require('../models/EventRegistration');
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

const normalizeParticipantStatus = (status) => {
  const normalized = typeof status === 'string' ? status.toLowerCase() : '';
  switch (normalized) {
    case 'accepted':
    case 'approved':
    case 'confirmed':
      return 'registered';
    case 'waitlisted':
      return 'waitlisted';
    case 'checked_in':
    case 'checkedin':
      return 'checked_in';
    case 'withdrawn':
      return 'withdrawn';
    case 'disqualified':
      return 'disqualified';
    case 'rejected':
      return 'rejected';
    case 'submitted':
    default:
      return normalized || 'submitted';
  }
};

const toParticipantMembers = (value) => {
  if (!Array.isArray(value)) return undefined;
  const members = value
    .map((entry) => {
      if (!entry) return null;
      if (typeof entry === 'string') {
        const trimmed = entry.trim();
        return trimmed.length ? { name: trimmed, contact: null } : null;
      }
      if (typeof entry === 'object') {
        const record = entry;
        const nameCandidate =
          typeof record.name === 'string'
            ? record.name
            : typeof record.displayName === 'string'
            ? record.displayName
            : typeof record.player === 'string'
            ? record.player
            : null;
        const contactCandidate =
          typeof record.contact === 'string'
            ? record.contact
            : typeof record.phone === 'string'
            ? record.phone
            : typeof record.mobile === 'string'
            ? record.mobile
            : null;
        if (nameCandidate && nameCandidate.trim().length > 0) {
          return { name: nameCandidate, contact: contactCandidate ?? null };
        }
      }
      return null;
    })
    .filter(Boolean);
  return members.length ? members : undefined;
};

const resolveTeamName = (registration, data) => {
  if (registration?.teamName) return registration.teamName;
  const sources = [
    data?.teamName,
    data?.team_name,
    data?.team,
    data?.name,
    data?.captain,
  ];
  for (const source of sources) {
    if (typeof source === 'string' && source.trim().length > 0) {
      return source;
    }
  }
  return null;
};

const mapFormRegistration = (registration) => {
  if (!registration) return null;
  const data = toPlainObject(registration.data);
  const teamName = resolveTeamName(registration, data);
  const rawMembers = registration.members ?? data.members;
  const members = toParticipantMembers(rawMembers);
  const user = registration.user
    ? {
        _id: String(registration.user._id),
        name: registration.user.name ?? registration.user.username ?? null,
      }
    : null;
  const createdAt =
    registration.createdAt instanceof Date
      ? registration.createdAt.toISOString()
      : registration.createdAt ?? null;
  return {
    _id: String(registration._id),
    status: normalizeParticipantStatus(registration.status),
    teamName: typeof teamName === 'string' ? teamName : undefined,
    user,
    members,
    createdAt,
  };
};

const mapLegacyRegistration = (registration) => {
  if (!registration) return null;
  const members = Array.isArray(registration.members)
    ? toParticipantMembers(
        registration.members.map((member) => ({
          name: member?.ign || member?.name,
          contact: member?.contact,
        })),
      )
    : undefined;
  const user = registration.user
    ? { _id: String(registration.user._id), name: registration.user.name ?? registration.user.username ?? null }
    : null;
  const createdAt =
    registration.createdAt instanceof Date
      ? registration.createdAt.toISOString()
      : registration.createdAt ?? null;
  return {
    _id: String(registration._id),
    status: normalizeParticipantStatus(registration.status),
    teamName: registration.teamName || undefined,
    user,
    members,
    createdAt,
  };
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
  const openAt = toIsoStringOrNull(event?.regOpenAt ?? event?.registrationOpenAt);
  const closeAt = toIsoStringOrNull(event?.regCloseAt ?? event?.registrationCloseAt);
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

    const registrationPayload = {
      id: String(registration._id),
      _id: registration._id,
      eventId: registration.eventId,
      userId: registration.userId,
      status: registration.status,
      payment: registration.payment,
      data: sanitized,
      fields: sanitized,
      createdAt: registration.createdAt,
    };

    const totalRegistrations = await Registration.countDocuments({ eventId: event._id });
    await Event.updateOne({ _id: event._id }, { $set: { registeredCount: totalRegistrations } });

    res.status(201).json({
      ok: true,
      data: {
        registration: registrationPayload,
        ...registrationPayload,
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
    const isPrivilegedViewer = isOrganizer(event, req.user);
    const publicStatuses = ['published', 'ongoing', 'completed'];
    const isPublicVisibility = ['public', null, undefined].includes(event.visibility);
    if (!isPrivilegedViewer && (!isPublicVisibility || !publicStatuses.includes(event.status))) {
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
    const preparedItems = items.map((doc) => {
      const data = toPlainObject(doc.data);
      const teamName =
        doc.teamName ||
        data.teamName ||
        data.team_name ||
        data.name ||
        (Array.isArray(data.members) && data.members[0]?.name) ||
        null;
      const user = doc.user
        ? {
            _id: String(doc.user._id),
            name: doc.user.name,
            ...(isPrivilegedViewer
              ? { phone: doc.user.phone, email: doc.user.email }
              : {}),
          }
        : null;

      const item = {
        id: String(doc._id),
        eventId: doc.eventId,
        status: doc.status,
        teamName: typeof teamName === 'string' ? teamName : undefined,
        user,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };

      if (isPrivilegedViewer) {
        const rawMembers = Array.isArray(doc.members) ? doc.members : data.members;
        const members = Array.isArray(rawMembers)
          ? rawMembers.filter((member) => member && typeof member === 'object')
          : undefined;
        if (members) {
          item.members = members;
        }
        item.userId = doc.userId;
        item.payment = doc.payment || { required: false };
        item.data = data;
      } else {
        const paymentRequired = Boolean(doc.payment?.required);
        item.payment = { required: paymentRequired };
      }

      return item;
    });

    res.json({
      ok: true,
      data: {
        items: preparedItems,
        total,
        page,
        limit,
        preview: !isPrivilegedViewer,
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.getParticipants = async (req, res, next) => {
  try {
    const event = await loadEventOrThrow(req.params.id);
    const isPrivilegedViewer = isOrganizer(event, req.user);
    const isPublicVisibility = ['public', null, undefined].includes(event.visibility);
    const publicStatuses = ['published', 'ongoing', 'completed'];

    if (!isPrivilegedViewer && (!isPublicVisibility || !publicStatuses.includes(event.status))) {
      throw AppError.forbidden('NOT_ALLOWED', 'Participants are not available');
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [formRegistrations, legacyRegistrations] = await Promise.all([
      Registration.aggregate([
        { $match: { eventId: event._id } },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $sort: { createdAt: -1 } },
      ]),
      EventRegistration.find({ event: event._id })
        .populate('user', 'name username')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const combined = [
      ...formRegistrations.map((doc) => mapFormRegistration(doc)).filter(Boolean),
      ...legacyRegistrations.map((doc) => mapLegacyRegistration(doc)).filter(Boolean),
    ];

    combined.sort((a, b) => {
      const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    const total = combined.length;
    const items = combined.slice(skip, skip + limit);

    res.json({
      ok: true,
      data: {
        items,
        total,
        page,
        pageSize: limit,
        preview: !isPrivilegedViewer,
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
