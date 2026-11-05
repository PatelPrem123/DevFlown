import mongoose from 'mongoose';
import { ACTIVITY_TYPES } from '../config/constants.js';

const activityLogSchema = new mongoose.Schema(
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
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
      index: true
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Actor ID is required'],
      index: true
    },
    action: {
      type: String,
      enum: Object.values(ACTIVITY_TYPES),
      required: [true, 'Action type is required'],
      index: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable append-only record
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

activityLogSchema.index({ projectId: 1, createdAt: -1 });
activityLogSchema.index({ taskId: 1, createdAt: -1 });

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export default ActivityLog;
