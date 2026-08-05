import mongoose, { Types } from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/koti-app';

    await mongoose.connect(mongoURI);

    console.log(`📦 MongoDB Connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

export const closeDB = async (): Promise<void> => {
  await mongoose.connection.close();
};

export const isValidId = (id: string): boolean => Types.ObjectId.isValid(id);

export default connectDB;
