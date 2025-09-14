const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    // Identity
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, unique: true, index: true, trim: true }, // E.164 or 10-digit; validated at controller/DTO level
    email: { type: String, lowercase: true, trim: true, unique: true, sparse: true }, // OPTIONAL

    // Auth
    password: { type: String, required: true, select: false }, // hashed in controller
    role: {
      type: String,
      enum: ['customer', 'business', 'admin'],
      default: 'customer',
      index: true,
    },

    // Profile (already used by controllers)
    location: { type: String, trim: true }, // dropdown area
    address: { type: String, trim: true }, // free text
    avatarUrl: { type: String, trim: true },

    // Verified provider program
    isVerified: { type: Boolean, default: false },
    verificationStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
      index: true,
    },
    profession: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 500 },

    // Account state
    status: {
      type: String,
      enum: ['active', 'suspended', 'deleted'],
      default: 'active',
      index: true,
    },
    lastLoginAt: { type: Date },
    loginCount: { type: Number, default: 0 },

    // Preferences
    prefs: {
      theme: { type: String, enum: ['light', 'dark', 'colored'], default: 'light' },
      notifications: {
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: false },
        sms: { type: Boolean, default: false },
      },
    },

    // Reserved for future OTP auth; never exposed
    otp: {
      codeHash: { type: String, select: false },
      expiresAt: { type: Date, select: false },
    },
  },
  { timestamps: true, versionKey: false }
);

// Virtual for backward compatibility if some code reads user.avatar
UserSchema.virtual('avatar').get(function () {
  return this.avatarUrl;
});

// Clean JSON output
UserSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.password;
    delete ret.otp;
    return ret;
  },
});
UserSchema.set('toObject', { virtuals: true });

// Helpful indexes (text search + common filters)
UserSchema.index(
  { name: 'text', phone: 'text', email: 'text', profession: 'text' },
  { name: 'user_text_idx' }
);

module.exports = mongoose.model('User', UserSchema);

