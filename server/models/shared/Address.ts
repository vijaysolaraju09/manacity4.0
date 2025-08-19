import { Schema, Document } from 'mongoose';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Address extends Document {
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  coords?: Coordinates;
  isDefault: boolean;
}

export const AddressSchema = new Schema<Address>(
  {
    label: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    coords: {
      lat: { type: Number },
      lng: { type: Number },
    },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

