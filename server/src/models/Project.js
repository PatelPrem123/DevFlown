import mongoose from 'mongoose';
import { PROJECT_STATUS, PROJECT_VISIBILITY } from '../config/constants.js';

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [100, 'Project name cannot exceed 100 characters']
    },
    key: {
      type: String,
      required: [true, 'Project key is required'],
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9]{2,10}$/, 'Project key must be 2-10 uppercase alphanumeric characters (e.g. FLOW, DEV)'],
      index: true
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Project description cannot exceed 1000 characters']
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: [true, 'Parent workspace ID is required'],
      index: true
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Project creator/owner ID is required'],
      index: true
    },
    status: {
      type: String,
      enum: Object.values(PROJECT_STATUS),
      default: PROJECT_STATUS.ACTIVE,
      index: true
    },
    visibility: {
      type: String,
      enum: Object.values(PROJECT_VISIBILITY),
      default: PROJECT_VISIBILITY.PRIVATE
    },
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    },
    githubRepo: {
      owner: { type: String, default: null },
      repo: { type: String, default: null },
      fullName: { type: String, default: null },
      connectedAt: { type: Date, default: null },
      webhookId: { type: Number, default: null }
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound unique index ensuring project keys are unique within a given workspace
projectSchema.index({ workspaceId: 1, key: 1 }, { unique: true });
projectSchema.index({ workspaceId: 1, status: 1 });
projectSchema.index({ 'githubRepo.fullName': 1 });

export const Project = mongoose.model('Project', projectSchema);
export default Project;
