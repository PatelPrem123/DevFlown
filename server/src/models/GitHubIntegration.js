import mongoose from 'mongoose';

const gitHubIntegrationSchema = new mongoose.Schema(
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
    githubUserId: {
      type: String,
      required: [true, 'GitHub User ID is required']
    },
    githubUsername: {
      type: String,
      required: [true, 'GitHub Username is required'],
      trim: true
    },
    githubEmail: {
      type: String,
      default: '',
      trim: true
    },
    githubAvatar: {
      type: String,
      default: ''
    },
    encryptedAccessToken: {
      type: String,
      required: [true, 'Encrypted access token is required']
    },
    scopes: {
      type: [String],
      default: ['repo', 'read:user', 'user:email']
    },
    installationId: {
      type: String,
      default: null
    },
    connectedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        delete ret.encryptedAccessToken; // Never leak ciphertext or raw credentials to JSON
        return ret;
      }
    }
  }
);

gitHubIntegrationSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });
gitHubIntegrationSchema.index({ workspaceId: 1, githubUsername: 1 });

export const GitHubIntegration = mongoose.model('GitHubIntegration', gitHubIntegrationSchema);
export default GitHubIntegration;
