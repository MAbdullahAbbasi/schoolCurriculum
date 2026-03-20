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
    // Educator metadata (used in admin educator table; not for authorization).
    grade: {
      type: String,
      default: '',
      trim: true,
    },
    subject: {
      type: String,
      default: '',
      trim: true,
    },
    // Educators can teach multiple grade+subject combinations.
    educatorAssignments: {
      type: [
        {
          grade: { type: String, default: '', trim: true },
          subject: { type: String, default: '', trim: true },
        },
      ],
      default: [],
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
