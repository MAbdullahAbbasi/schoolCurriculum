import mongoose from 'mongoose';

const alumniSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: true,
      trim: true,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    fathersName: {
      type: String,
      default: '',
      trim: true,
    },
    grade: {
      type: String,
      required: true,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    subject: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      default: '',
      trim: true,
    },
    passedOutYear: {
      type: Number,
      required: true,
      min: 1990,
      max: 2100,
    },
  },
  {
    collection: 'alumni',
    timestamps: true,
  }
);

alumniSchema.index({ registrationNumber: 1 }, { unique: true });
alumniSchema.index({ passedOutYear: 1, studentName: 1 });

const Alumni = mongoose.model('Alumni', alumniSchema, 'alumni');

export default Alumni;
