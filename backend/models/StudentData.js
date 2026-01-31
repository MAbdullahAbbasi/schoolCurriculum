import mongoose from 'mongoose';

const studentDataSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
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

// Create index on registrationNumber for faster lookups
studentDataSchema.index({ registrationNumber: 1 });

const StudentData = mongoose.model('StudentData', studentDataSchema, 'studentsData');

export default StudentData;
