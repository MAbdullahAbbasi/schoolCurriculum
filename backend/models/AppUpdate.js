import mongoose from 'mongoose';

/**
 * Application updates shown to Admin / Super Admin.
 * Usually sourced from GitHub commits (including historical ones).
 */
const appUpdateSchema = new mongoose.Schema(
  {
    commitSha: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    originalSubject: {
      type: String,
      default: '',
      trim: true,
    },
    authorName: {
      type: String,
      default: '',
      trim: true,
    },
    committedAt: {
      type: Date,
      required: true,
      index: true,
    },
    htmlUrl: {
      type: String,
      default: '',
      trim: true,
    },
    source: {
      type: String,
      enum: ['github', 'git', 'webhook', 'manual'],
      default: 'github',
    },
  },
  { timestamps: true }
);

appUpdateSchema.index({ committedAt: -1 });

export default mongoose.model('AppUpdate', appUpdateSchema);
