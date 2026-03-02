import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    courseName: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      default: '',
      trim: true,
    },
    courseDuration: {
      type: {
        type: String,
        enum: ['days', 'weeks', 'months'],
        required: true,
      },
      value: {
        type: Number,
        required: true,
        min: 1,
      },
    },
    weightage: [
      {
        label: {
          type: String,
          required: true,
          trim: true,
        },
        percentage: {
          type: Number,
          required: true,
          min: 0,
          max: 100,
        },
      },
    ],
    startingDate: {
      type: Date,
      required: true,
    },
    topics: [
      {
        courseCode: {
          type: String,
          required: true,
          trim: true,
        },
        topicName: {
          type: String,
          required: true,
          trim: true,
        },
        marks: {
          type: Number,
          required: true,
          min: 0,
        },
        grade: {
          type: Number,
          default: null,
        },
      },
    ],
    totalQuestions: {
      type: Number,
      default: null,
      min: 1,
    },
    questions: [
      {
        questionIndex: {
          type: Number,
          required: true,
          min: 1,
        },
        topicIndices: {
          type: [Number],
          default: [],
        },
      },
    ],
  },
  {
    collection: 'courses',
    timestamps: true, // Automatically add createdAt and updatedAt
  }
);

// Create index on code for faster lookups
courseSchema.index({ code: 1 }, { unique: true });

const Course = mongoose.model('Course', courseSchema, 'courses');

export default Course;
