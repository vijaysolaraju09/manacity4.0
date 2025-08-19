const { Schema, model } = require('mongoose');
const { EventModel } = require('./Event');

const registrationSchema = new Schema({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  registeredAt: { type: Date, default: Date.now },
  approvedAt: { type: Date },
}, { timestamps: true });

registrationSchema.index({ eventId: 1, userId: 1 }, { unique: true });

registrationSchema.pre('save', async function(next) {
  this.wasNew = this.isNew;
  if (!this.isNew) {
    const existing = await this.constructor.findById(this._id).select('status');
    this.prevStatus = existing ? existing.status : undefined;
  }
  if (this.isModified('status') && this.status === 'approved' && !this.approvedAt) {
    this.approvedAt = new Date();
  }
  next();
});

registrationSchema.post('save', async function(doc, next) {
  let inc = 0;
  const prev = this.prevStatus;
  if (this.wasNew) {
    if (doc.status === 'approved') inc = 1;
  } else if (prev !== doc.status) {
    if (prev !== 'approved' && doc.status === 'approved') inc = 1;
    else if (prev === 'approved' && doc.status !== 'approved') inc = -1;
  }
  if (inc !== 0) {
    await EventModel.findByIdAndUpdate(doc.eventId, { $inc: { registeredCount: inc } });
  }
  next();
});

registrationSchema.post('findOneAndDelete', async function(doc, next) {
  if (doc && doc.status === 'approved') {
    await EventModel.findByIdAndUpdate(doc.eventId, { $inc: { registeredCount: -1 } });
  }
  next();
});

const RegistrationModel = model('Registration', registrationSchema);

module.exports = { RegistrationModel };
