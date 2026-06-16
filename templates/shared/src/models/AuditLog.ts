import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  entityType: string; // Model name (User, Document, etc.)
  entityId: Types.ObjectId; // ID of the affected document
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';
  userId: Types.ObjectId; // Who performed the action
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  };
  timestamp: Date;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  entityType: {
    type: String,
    required: true,
    index: true
  },
  entityId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },
  action: {
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'RESTORE'],
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  changes: [{
    field: { type: String, required: true },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed }
  }],
  metadata: {
    ipAddress: String,
    userAgent: String,
    sessionId: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false // We handle timestamps manually
});

// Compound indexes for efficient querying
auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);