import { Schema } from 'mongoose';

export interface MediaAsset {
  url: string;
  alt: string;
  width?: number;
  height?: number;
  mime?: string;
  isPrimary?: boolean;
}

export const MediaAssetSchema = new Schema<MediaAsset>(
  {
    url: { type: String, required: true },
    alt: { type: String, required: true },
    width: { type: Number },
    height: { type: Number },
    mime: { type: String },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);
