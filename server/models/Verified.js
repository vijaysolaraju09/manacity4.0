const mongoose = require('mongoose');

const VerifiedSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    profession: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    bio: { type: String, default: '', maxlength: 500 },
    portfolio: [{ type: String }],
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    connections: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

VerifiedSchema.index({ status: 1, profession: 1, createdAt: -1 });
VerifiedSchema.index({ profession: 'text', bio: 'text' });

VerifiedSchema.methods.toCardJSON = function (u) {
  return {
    id: this._id,
    _id: this._id,
    user: u
      ? {
          _id: u._id,
          name: u.name,
          phone: u.phone,
          location: u.location,
          address: u.address,
        }
      : this.user,
    profession: this.profession,
    bio: this.bio || '',
    portfolio: this.portfolio || [],
    status: this.status,
    ratingAvg: this.ratingAvg || 0,
    ratingCount: this.ratingCount || 0,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('Verified', VerifiedSchema);
