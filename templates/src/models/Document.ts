import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  path: string;
  storageType: 'local' | 's3';
  s3Key?: string;
  s3Bucket?: string;
  uploadedAt: Date;
  isPublic: boolean;
  description?: string;
  tags: string[];
  metadata: Record<string, any>;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
}

const documentSchema = new Schema<IDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  fileName: {
    type: String,
    required: true,
    unique: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true,
    min: 0
  },
  path: {
    type: String,
    required: true
  },
  storageType: {
    type: String,
    enum: ['local', 's3'],
    required: true,
    default: 'local'
  },
  s3Key: {
    type: String,
    sparse: true
  },
  s3Bucket: {
    type: String,
    sparse: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance
documentSchema.index({ userId: 1, uploadedAt: -1 });
documentSchema.index({ fileName: 1 });
documentSchema.index({ mimeType: 1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ isPublic: 1 });

export const DocumentModel = mongoose.model<IDocument>('Document', documentSchema);
export default DocumentModel;