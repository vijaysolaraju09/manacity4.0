const FormTemplate = require('../models/FormTemplate');
const Event = require('../models/Event');
const AppError = require('../utils/AppError');
const { validateFieldDefinitions } = require('../utils/dynamicForm');

const toTemplateResponse = (doc) => {
  if (!doc) return null;
  const template = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(template._id),
    name: template.name,
    category: template.category,
    fields: Array.isArray(template.fields) ? template.fields : [],
    createdBy: template.createdBy,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
};

exports.createTemplate = async (req, res, next) => {
  try {
    const fields = validateFieldDefinitions(req.body.fields || []);
    if (!req.user?._id) {
      throw AppError.unauthorized('LOGIN_REQUIRED', 'Login required');
    }
    const template = await FormTemplate.create({
      name: req.body.name,
      category: req.body.category || 'other',
      fields,
      createdBy: req.user._id,
    });
    res.status(201).json({
      ok: true,
      data: toTemplateResponse(template),
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.listTemplates = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.category) {
      filter.category = req.query.category;
    }
    const templates = await FormTemplate.find(filter).sort({ updatedAt: -1 }).lean();
    res.json({
      ok: true,
      data: templates.map(toTemplateResponse),
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.getTemplate = async (req, res, next) => {
  try {
    const template = await FormTemplate.findById(req.params.id);
    if (!template) {
      throw AppError.notFound('TEMPLATE_NOT_FOUND', 'Form template not found');
    }
    res.json({ ok: true, data: toTemplateResponse(template), traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.updateTemplate = async (req, res, next) => {
  try {
    const template = await FormTemplate.findById(req.params.id);
    if (!template) {
      throw AppError.notFound('TEMPLATE_NOT_FOUND', 'Form template not found');
    }
    if (typeof req.body.name === 'string') {
      template.name = req.body.name;
    }
    if (typeof req.body.category === 'string') {
      template.category = req.body.category;
    }
    if (Array.isArray(req.body.fields)) {
      template.fields = validateFieldDefinitions(req.body.fields);
    }
    await template.save();
    res.json({ ok: true, data: toTemplateResponse(template), traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.deleteTemplate = async (req, res, next) => {
  try {
    const template = await FormTemplate.findById(req.params.id);
    if (!template) {
      throw AppError.notFound('TEMPLATE_NOT_FOUND', 'Form template not found');
    }
    const inUse = await Event.exists({ 'dynamicForm.templateId': template._id });
    if (inUse) {
      throw AppError.conflict('TEMPLATE_IN_USE', 'Template is attached to an event');
    }
    await template.deleteOne();
    res.json({ ok: true, data: true, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};
