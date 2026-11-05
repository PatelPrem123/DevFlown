import mongoose from 'mongoose';

const sprintSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Sprint name is required'],
      trim: true,
      maxlength: [100, 'Sprint name cannot exceed 100 characters']
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
    goal: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Sprint goal cannot exceed 1000 characters']
    },
    status: {
      type: String,
      enum: ['planned', 'active', 'completed'],
      default: 'planned',
      index: true
    },
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    },
    totalStoryPoints: {
      type: Number,
      default: 0
    },
    completedStoryPoints: {
      type: Number,
      default: 0
    },
    startedAt: {
      type: Date,
      default: null
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

sprintSchema.index({ projectId: 1, status: 1 });
sprintSchema.index({ projectId: 1, createdAt: -1 });

export const Sprint = mongoose.model('Sprint', sprintSchema);
export default Sprint;
