import mongoose from 'mongoose';
import { WORKSPACE_ROLES } from '../config/constants.js';

const invitationSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    role: {
      type: String,
      enum: Object.values(WORKSPACE_ROLES),
      default: WORKSPACE_ROLES.MEMBER
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired'],
      default: 'pending'
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }
  },
  {
    timestamps: true
  }
);

// TTL index to automatically purge expired invitations
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Invitation = mongoose.model('Invitation', invitationSchema);
export default Invitation;
