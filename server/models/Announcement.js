const { Schema, model } = require('mongoose');

const announcementSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
    },
    image: {
      type: String,
      default: null,
      trim: true,
    },
    ctaText: {
      type: String,
      default: null,
      trim: true,
      maxlength: 80,
    },
    ctaLink: {
      type: String,
      default: null,
      trim: true,
      maxlength: 512,
    },
    active: {
      type: Boolean,
      default: false,
      index: true,
    },
    highPriority: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

announcementSchema.methods.isDeleted = function () {
  return Boolean(this.deletedAt);
};

module.exports = model('Announcement', announcementSchema);
