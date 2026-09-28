import mongoose from 'mongoose';

const studentDataSchema = new mongoose.Schema(
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
      required: true,
    },
    // Optional student email (empty string when not provided).
    email: {
      type: String,
      default: '',
      trim: true,
    },
    // Class 8/9/10 only: "Biology" or "Computer" (student choice). Omitted or empty for other grades.
    subject: {
      type: String,
      trim: true,
      default: '',
      enum: ['', 'Biology', 'Computer'], // Class 8/9/10: Biology or Computer
    },
    /**
     * Student portal (separate from staff User accounts).
     * Username is always registrationNumber — no separate username field.
     */
    portalAssigned: {
      type: Boolean,
      default: false,
    },
    portalPasswordHash: {
      type: String,
      default: '',
    },
    /** Admin-visible credential for Seedlings UI; auth uses portalPasswordHash. */
    portalPasswordDisplay: {
      type: String,
      default: '',
    },
    portalAssignedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'studentsData',
    timestamps: true, // Automatically add createdAt and updatedAt
  }
);

// Create unique index on registrationNumber for faster lookups
studentDataSchema.index({ registrationNumber: 1 }, { unique: true });

const StudentData = mongoose.model('StudentData', studentDataSchema, 'studentsData');

export default StudentData;
