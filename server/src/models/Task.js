import mongoose from 'mongoose';
import { KANBAN_COLUMNS, TASK_PRIORITIES } from '../config/constants.js';

const taskSchema = new mongoose.Schema(
  {
    taskKey: {
      type: String,
      required: [true, 'Task key is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      default: '',
      maxlength: [20000, 'Description cannot exceed 20,000 characters']
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
    status: {
      type: String,
      enum: Object.values(KANBAN_COLUMNS),
      default: KANBAN_COLUMNS.BACKLOG,
      index: true
    },
    priority: {
      type: String,
      enum: Object.values(TASK_PRIORITIES),
      default: TASK_PRIORITIES.MEDIUM,
      index: true
    },
    orderIndex: {
      type: Number,
      required: true,
      default: 1000.0,
      index: true
    },
    storyPoints: {
      type: Number,
      min: [0, 'Story points cannot be negative'],
      max: [100, 'Story points cannot exceed 100'],
      default: null
    },
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter ID is required'],
      index: true
    },
    sprintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sprint',
      default: null,
      index: true
    },
    milestoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Milestone',
      default: null,
      index: true
    },
    dueDate: {
      type: Date,
      default: null,
      index: true
    },
    labels: {
      type: [String],
      default: [],
      index: true
    },
    githubCommits: [
      {
        commitHash: { type: String, required: true },
        message: { type: String, required: true },
        author: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        url: { type: String, default: '' }
      }
    ],
    githubPullRequests: [
      {
        prNumber: { type: Number, required: true },
        prUrl: { type: String, required: true },
        title: { type: String, required: true },
        state: { type: String, enum: ['open', 'closed', 'merged'], default: 'open' },
        branchName: { type: String, default: '' }
      }
    ]
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

// Compound indexes for optimal Kanban querying and tenant isolation
taskSchema.index({ projectId: 1, status: 1, orderIndex: 1 });
taskSchema.index({ workspaceId: 1, assigneeId: 1 });

export const Task = mongoose.model('Task', taskSchema);
export default Task;
