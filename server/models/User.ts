import { Schema, model, Document } from 'mongoose';
import { Address, AddressSchema } from './shared/Address';

export enum Role {
  CUSTOMER = 'customer',
  VERIFIED = 'verified',
  BUSINESS = 'business',
  ADMIN = 'admin',
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export enum BusinessStatus {
  INACTIVE = 'inactive',
  ACTIVE = 'active',
}

interface Location {
  city: string;
  pincode: string;
}

interface Stats {
  ordersCount: number;
  productsCount: number;
  ratingsAvg: number;
  ratingsCount: number;
}

interface Auth {
  passwordHash: string;
  lastLoginAt?: Date;
}

interface Notifications {
  orders: boolean;
  offers: boolean;
  system: boolean;
}

interface Preferences {
  theme: string;
  language: string;
  notifications: Notifications;
}

export interface UserAttrs {
  phone: string;
  name: string;
  avatarUrl?: string;
  roles: Role[];
  verificationStatus: VerificationStatus;
  businessStatus?: BusinessStatus;
  bio?: string;
  location: Location;
  stats?: Stats;
  auth: Auth;
  preferences?: Preferences;
  addresses?: Address[];
  isDeleted?: boolean;
  deletedAt?: Date;
}

export interface UserDoc extends Document, UserAttrs {
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<Notifications>(
  {
    orders: { type: Boolean, default: true },
    offers: { type: Boolean, default: true },
    system: { type: Boolean, default: true },
  },
  { _id: false }
);

const preferencesSchema = new Schema<Preferences>(
  {
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    language: { type: String, default: 'en' },
    notifications: { type: notificationSchema, default: () => ({}) },
  },
  { _id: false }
);

const statsSchema = new Schema<Stats>(
  {
    ordersCount: { type: Number, default: 0 },
    productsCount: { type: Number, default: 0 },
    ratingsAvg: { type: Number, default: 0 },
    ratingsCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const locationSchema = new Schema<Location>(
  {
    city: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  { _id: false }
);

const authSchema = new Schema<Auth>(
  {
    passwordHash: { type: String, required: true },
    lastLoginAt: { type: Date },
  },
  { _id: false }
);

const userSchema = new Schema<UserDoc>(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    name: { type: String, required: true },
    avatarUrl: { type: String },
    roles: {
      type: [String],
      enum: Object.values(Role),
      default: [Role.CUSTOMER],
    },
    verificationStatus: {
      type: String,
      enum: Object.values(VerificationStatus),
      default: VerificationStatus.PENDING,
    },
    businessStatus: {
      type: String,
      enum: Object.values(BusinessStatus),
      default: BusinessStatus.INACTIVE,
    },
    bio: { type: String, default: '' },
    location: { type: locationSchema, required: true },
    stats: { type: statsSchema, default: () => ({}) },
    auth: { type: authSchema, required: true },
    preferences: { type: preferencesSchema, default: () => ({}) },
    addresses: { type: [AddressSchema], default: [] },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ roles: 1 });
userSchema.index({ verificationStatus: 1 });
userSchema.index({ 'location.city': 1, roles: 1 });

export const UserModel = model<UserDoc>('User', userSchema);

export default UserModel;

