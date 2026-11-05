import { z } from 'zod';

export const createCommentSchema = z.object({
  content: z.string().trim().min(1, 'Comment content cannot be empty').max(5000, 'Comment cannot exceed 5000 characters'),
  attachments: z.array(
    z.object({
      name: z.string().trim().min(1),
      url: z.string().url('Attachment URL must be valid'),
      size: z.number().nonnegative().optional(),
      mimeType: z.string().optional()
    })
  ).optional()
});

export const updateCommentSchema = z.object({
  content: z.string().trim().min(1).max(5000)
});
