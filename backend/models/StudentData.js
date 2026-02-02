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
    grade: {
      type: String,
      required: true,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
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
