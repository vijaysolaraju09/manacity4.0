const mongoose = require("mongoose");

const preferencesSchema = new mongoose.Schema(
  {
    theme: {
      type: String,
      enum: ["light", "dark", "colored"],
      default: "light",
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^\d{10,14}$/,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      // eslint-disable-next-line no-useless-escape
      match: /^(?:[a-zA-Z0-9_'^&\/+{}\-]+(?:\.[a-zA-Z0-9_'^&\/+{}\-]+)*|"(?:[\001-\010\013\014\016-\037!#-\[\]-\177]|\\[\001-\011\013\014\016-\177])*")@(?:(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-zA-Z-]*[a-zA-Z]:[\001-\011\013\014\016-\177]+)\])$/,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["customer", "verified", "business", "admin"],
      default: "customer",
    },
    location: { type: String, trim: true },
    address: { type: String, trim: true },
    isVerified: { type: Boolean, default: false, alias: "verified" },
    isActive: { type: Boolean, default: true },
    verificationStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },
    profession: { type: String },
    bio: { type: String, maxlength: 500 },
    avatarUrl: { type: String },
    preferences: { type: preferencesSchema, default: () => ({}) },
    businessStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },
  },
  { timestamps: true }
);

userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true, sparse: true });

userSchema.pre("save", function (next) {
  if (this.phone) {
    this.phone = this.phone.replace(/\D/g, "");
  }
  if (this.email === "") {
    this.email = undefined;
  }
  next();
});

userSchema.methods.toProfileJSON = function () {
  return {
    id: this._id,
    name: this.name,
    phone: this.phone,
    email: this.email ?? null,
    role: this.role,
    location: this.location ?? "",
    address: this.address ?? "",
    isVerified: !!this.isVerified,
    verificationStatus: this.verificationStatus,
    profession: this.profession ?? "",
    bio: this.bio ?? "",
    avatar: this.avatarUrl ?? null,
    avatarUrl: this.avatarUrl ?? null,
    businessStatus: this.businessStatus ?? "none",
  };
};

module.exports = mongoose.model("User", userSchema);
