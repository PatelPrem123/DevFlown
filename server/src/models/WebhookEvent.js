import mongoose from 'mongoose';

const webhookEventSchema = new mongoose.Schema(
  {
    deliveryId: {
      type: String,
      required: [true, 'GitHub delivery GUID is required'],
      unique: true,
      index: true
    },
    event: {
      type: String,
      required: [true, 'GitHub event name is required'],
      index: true
    },
    action: {
      type: String,
      default: null
    },
    sender: {
      type: String,
      default: null
    },
    repository: {
      type: String,
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: ['processed', 'duplicate_skipped', 'failed'],
      default: 'processed',
      index: true
    },
    payloadSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    error: {
      type: String,
      default: null
    },
    processedAt: {
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

// 30-day TTL auto-cleanup to prevent storage growth (DEC-008)
webhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const WebhookEvent = mongoose.model('WebhookEvent', webhookEventSchema);
export default WebhookEvent;
