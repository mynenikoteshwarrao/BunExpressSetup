import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IUser extends Document {
  userId: string;
  username: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  isActive: boolean;
  lastLogin?: Date;
  lastLogout?: Date;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  emailVerified: boolean;
  emailVerificationToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  userId: {
    type: String,
    default: uuidv4,
    unique: true,
    required: true
  },
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot be more than 30 characters'],
    unique: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  lastLogout: {
    type: Date
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
UserSchema.index({ email: 1 });
UserSchema.index({ userId: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ createdAt: -1 });

// Virtual for user's public profile
UserSchema.virtual('profile').get(function(this: IUser) {
  return {
    userId: this.userId,
    username: this.username,
    email: this.email,
    role: this.role,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    emailVerified: this.emailVerified,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
});

// Pre-save middleware
UserSchema.pre('save', function(this: IUser, next) {
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase();
  }
  
  if (this.isNew && !this.userId) {
    this.userId = uuidv4();
  }
  
  next();
});

// Instance methods
UserSchema.methods.isAdmin = function(this: IUser): boolean {
  return this.role === 'admin';
};

UserSchema.methods.toPublicJSON = function(this: IUser) {
  return {
    userId: this.userId,
    username: this.username,
    email: this.email,
    role: this.role,
    isActive: this.isActive,
    emailVerified: this.emailVerified,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static methods
UserSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

UserSchema.statics.findByUserId = function(userId: string) {
  return this.findOne({ userId });
};

export const User = model<IUser>('User', UserSchema);
export default User;