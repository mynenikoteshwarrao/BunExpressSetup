import mongoose, { Document, Schema } from 'mongoose';

export interface ITinyUrl extends Document {
  originalUrl: string;
  shortUrl: string;
  shortId: string;
  createdAt: Date;
}

const tinyUrlSchema = new Schema<ITinyUrl>({
  originalUrl: { type: String, required: true },
  shortUrl: { type: String, required: true },
  shortId: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: '7d' }
});

tinyUrlSchema.index({ shortId: 1 });

export const TinyUrl = mongoose.model<ITinyUrl>('TinyUrl', tinyUrlSchema);