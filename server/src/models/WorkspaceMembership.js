import mongoose from 'mongoose';
import { WORKSPACE_ROLES } from '../config/constants.js';

const workspaceMembershipSchema = new mongoose.Schema(
  {
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
      enum: Object.values(WORKSPACE_ROLES),
      default: WORKSPACE_ROLES.MEMBER,
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

// Compound unique index ensuring a user can have only one active membership per workspace
workspaceMembershipSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

export const WorkspaceMembership = mongoose.model('WorkspaceMembership', workspaceMembershipSchema);
export default WorkspaceMembership;
