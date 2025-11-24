const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      minlength: 2,
      maxlength: 120,
    },
    description: {
      type: String,
      default: '',
      maxlength: 500,
      trim: true,
    },
    icon: {
      type: String,
      default: '',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    providers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

const syncActiveFlags = (doc) => {
  if (!doc) return;
  if (typeof doc.active === 'boolean' && typeof doc.isActive === 'undefined') {
    doc.isActive = doc.active;
  }
  if (typeof doc.isActive === 'boolean' && typeof doc.active === 'undefined') {
    doc.active = doc.isActive;
  }
  if (typeof doc.active === 'boolean' && typeof doc.isActive === 'boolean') {
    const normalized = doc.active;
    doc.isActive = normalized;
    doc.active = normalized;
  }
};

const syncActiveFlagsFromUpdate = (update = {}) => {
  const apply = (target = {}) => {
    if (Object.prototype.hasOwnProperty.call(target, 'active')) {
      if (!Object.prototype.hasOwnProperty.call(target, 'isActive')) {
        target.isActive = target.active;
      }
    } else if (Object.prototype.hasOwnProperty.call(target, 'isActive')) {
      target.active = target.isActive;
    }
  };

  apply(update);
  if (update.$set) apply(update.$set);
  if (update.$setOnInsert) apply(update.$setOnInsert);

  return update;
};

ServiceSchema.pre('validate', function (next) {
  syncActiveFlags(this);
  next();
});

ServiceSchema.pre('save', function (next) {
  syncActiveFlags(this);
  next();
});

ServiceSchema.pre('findOneAndUpdate', function (next) {
  this.setUpdate(syncActiveFlagsFromUpdate(this.getUpdate() || {}));
  next();
});

ServiceSchema.index({ name: 1 }, { unique: true });
ServiceSchema.index({ isActive: 1, name: 1 });
ServiceSchema.index({ active: 1, name: 1 });

module.exports = mongoose.model('Service', ServiceSchema);
