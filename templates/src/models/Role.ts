import mongoose, { Document, Schema, Types } from 'mongoose';
import { Task } from '../enums/Task';

export interface IRole extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  tasks: Task[];
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  tasks: [{
    type: String,
    enum: Object.values(Task),
  }],
  isSystem: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function (doc: any, ret: any) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
  toObject: { virtuals: true },
});

RoleSchema.index({ name: 1 });
RoleSchema.index({ tasks: 1 });

/**
 * Check whether this role carries the SUPER_ADMIN task.
 */
RoleSchema.methods.isSuperAdmin = function (): boolean {
  return this.tasks.includes(Task.SUPER_ADMIN);
};

/**
 * Check whether this role includes a specific task.
 */
RoleSchema.methods.hasTask = function (task: Task): boolean {
  return this.tasks.includes(Task.SUPER_ADMIN) || this.tasks.includes(task);
};

export default mongoose.model<IRole>('Role', RoleSchema);
