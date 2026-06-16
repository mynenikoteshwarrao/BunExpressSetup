import mongoose, { Document, Schema, Types } from 'mongoose';

export interface I{{modelName}} extends Document {
  _id: Types.ObjectId;
  {{modelFields}}
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const {{modelNameLower}}Schema = new Schema<I{{modelName}}>({
  {{schemaFields}},
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
{{modelNameLower}}Schema.index({ isDeleted: 1 });
{{modelNameLower}}Schema.index({ createdAt: -1 });
{{modelNameLower}}Schema.index({ updatedAt: -1 });

// Add any custom indexes based on searchable fields
// Example: {{modelNameLower}}Schema.index({ name: 'text', description: 'text' });

export const {{modelName}} = mongoose.model<I{{modelName}}>('{{modelName}}', {{modelNameLower}}Schema);
export default {{modelName}};