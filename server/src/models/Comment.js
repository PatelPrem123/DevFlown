import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: [true, 'Task ID is required'],
      index: true
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
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author ID is required'],
      index: true
    },
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      maxlength: [5000, 'Comment content cannot exceed 5000 characters']
    },
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        size: { type: Number, default: 0 },
        mimeType: { type: String, default: 'application/octet-stream' }
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

commentSchema.index({ taskId: 1, createdAt: 1 });

export const Comment = mongoose.model('Comment', commentSchema);
export default Comment;
