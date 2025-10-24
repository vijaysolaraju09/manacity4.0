const { Schema, model } = require('mongoose');
const { FIELD_TYPES, sanitizeHtml, sanitizeId } = require('../utils/dynamicForm');

const formFieldSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
      set: (value) => sanitizeId(value),
    },
    label: {
      type: String,
      required: true,
      trim: true,
      set: (value) => sanitizeHtml(value),
    },
    type: {
      type: String,
      enum: FIELD_TYPES,
      required: true,
    },
    required: { type: Boolean, default: false },
    placeholder: {
      type: String,
      default: '',
      set: (value) => sanitizeHtml(value),
    },
    help: {
      type: String,
      default: '',
      set: (value) => sanitizeHtml(value),
    },
    options: {
      type: [String],
      default: [],
      set: (values) =>
        Array.isArray(values)
          ? values
              .map((value) => sanitizeHtml(value))
              .filter((value) => value.length > 0)
          : [],
    },
    min: { type: Number },
    max: { type: Number },
    pattern: { type: String },
    defaultValue: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const formTemplateSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
      set: (value) => sanitizeHtml(value),
    },
    category: {
      type: String,
      enum: ['esports', 'quiz', 'sports', 'other'],
      default: 'other',
    },
    fields: { type: [formFieldSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

formTemplateSchema.index({ category: 1, createdAt: -1 });
formTemplateSchema.index({ name: 'text' });

module.exports = model('FormTemplate', formTemplateSchema);
