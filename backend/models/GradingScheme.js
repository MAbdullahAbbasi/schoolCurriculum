import mongoose from 'mongoose';

const gradingRowSchema = new mongoose.Schema(
  {
    percentage: { type: String, required: true, trim: true },
    grade: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const gradingSchemeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    rows: {
      type: [gradingRowSchema],
      default: [],
    },
  },
  {
    collection: 'gradingSchemes',
    timestamps: true,
  }
);

const GradingScheme = mongoose.model('GradingScheme', gradingSchemeSchema, 'gradingSchemes');

export default GradingScheme;

