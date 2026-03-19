import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['ADMIN', 'COURSE_ADMIN', 'EDUCATOR'],
      default: 'ADMIN',
      required: true,
    },
  },
  { collection: 'users', timestamps: true }
);

const User = mongoose.model('User', userSchema, 'users');
export default User;
