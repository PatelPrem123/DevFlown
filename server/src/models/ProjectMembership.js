import mongoose from 'mongoose';
import { PROJECT_ROLES } from '../config/constants.js';

const projectMembershipSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
      index: true
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: [true, 'Workspace ID is required'],
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    role: {
      type: String,
      enum: Object.values(PROJECT_ROLES),
      default: PROJECT_ROLES.DEVELOPER,
      index: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
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

// Compound unique index ensuring each user has exactly one membership record per project
projectMembershipSchema.index({ projectId: 1, userId: 1 }, { unique: true });
projectMembershipSchema.index({ workspaceId: 1, userId: 1 });

export const ProjectMembership = mongoose.model('ProjectMembership', projectMembershipSchema);
export default ProjectMembership;
