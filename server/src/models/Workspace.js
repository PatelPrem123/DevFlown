import mongoose from 'mongoose';

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      maxlength: [100, 'Workspace name cannot exceed 100 characters']
    },
    slug: {
      type: String,
      required: [true, 'Workspace slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug may only contain lowercase alphanumeric characters and hyphens'],
      index: true
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Workspace owner ID is required'],
      index: true
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free'
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

export const Workspace = mongoose.model('Workspace', workspaceSchema);
export default Workspace;
