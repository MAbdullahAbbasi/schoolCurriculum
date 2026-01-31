import mongoose from 'mongoose';

const recordSchema = new mongoose.Schema(
  {
    courseCode: {
      type: String,
      required: true,
      trim: true,
    },
    courseName: {
      type: String,
      required: true,
      trim: true,
    },
    students: [
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
        weightageScores: {
          type: Object,
          default: {},
        },
        overallPercentage: {
          type: Number,
          required: true,
          min: 0,
          max: 100,
        },
        overallGrade: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
  },
  {
    collection: 'records',
    timestamps: true, // Automatically add createdAt and updatedAt
  }
);

// Create indexes for faster lookups
recordSchema.index({ courseCode: 1 });
recordSchema.index({ 'students.registrationNumber': 1 });

const Record = mongoose.model('Record', recordSchema, 'records');

export default Record;
