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
        // Marks per course objective: { "0": 10, "1": 15, ... } (topic index -> marks)
        objectiveMarks: {
          type: Object,
          default: {},
        },
        // Question/part slot -> obtained marks: { "q1": 8, "q2-p1": 3 }
        questionMarks: {
          type: Object,
          default: {},
        },
        // Slot keys (e.g. "q1", "q2-p1") that student did not attempt -> those objectives get 0
        notAttemptedSlots: {
          type: [String],
          default: [],
        },
        // Slot keys left on choice (optional questions) when compulsory were fully attempted
        leftOnChoiceSlots: {
          type: [String],
          default: [],
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
