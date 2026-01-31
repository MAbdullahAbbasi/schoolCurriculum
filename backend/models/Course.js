import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    courseName: {
      type: String,
      required: true,
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
