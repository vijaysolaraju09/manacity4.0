const { Schema, model } = require('mongoose');

const adminMessageSchema = new Schema(
  {
    type: { type: String, enum: ['banner', 'message'], default: 'banner' },
    image: String,
    message: String,
    link: String,
  },
  { timestamps: true }
);

module.exports = model('AdminMessage', adminMessageSchema);
