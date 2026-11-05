import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Milestone title is required'],
      trim: true,
      maxlength: [200, 'Milestone title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Milestone description cannot exceed 2000 characters']
    },
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
    dueDate: {
      type: Date,
      required: [true, 'Milestone due date is required'],
      index: true
    },
    status: {
      type: String,
      enum: ['open', 'completed'],
      default: 'open',
      index: true
    },
    completedAt: {
      type: Date,
      default: null
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

milestoneSchema.index({ projectId: 1, dueDate: 1 });
milestoneSchema.index({ projectId: 1, status: 1 });

export const Milestone = mongoose.model('Milestone', milestoneSchema);
export default Milestone;
