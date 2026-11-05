import { z } from 'zod';
import { KANBAN_COLUMN_LIST, TASK_PRIORITIES } from '../config/constants.js';

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required').max(200, 'Task title cannot exceed 200 characters'),
  description: z.string().max(20000, 'Description cannot exceed 20,000 characters').optional(),
  status: z.enum(KANBAN_COLUMN_LIST).default('backlog'),
  priority: z.enum(Object.values(TASK_PRIORITIES)).default('medium'),
  storyPoints: z.number().int().min(0).max(100).nullable().optional(),
  assigneeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid assignee user ID format').nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  labels: z.array(z.string().trim().max(50)).optional()
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(20000).optional(),
  status: z.enum(KANBAN_COLUMN_LIST).optional(),
  priority: z.enum(Object.values(TASK_PRIORITIES)).optional(),
  storyPoints: z.number().int().min(0).max(100).nullable().optional(),
  assigneeId: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  labels: z.array(z.string().trim().max(50)).optional()
});

export const moveTaskSchema = z.object({
  columnId: z.enum(KANBAN_COLUMN_LIST, {
    errorMap: () => ({ message: 'Invalid target Kanban column.' })
  }),
  prevOrderIndex: z.number().nullable().optional(),
  nextOrderIndex: z.number().nullable().optional()
});

export const taskFilterQuerySchema = z.object({
  status: z.enum(KANBAN_COLUMN_LIST).optional(),
  priority: z.enum(Object.values(TASK_PRIORITIES)).optional(),
  assigneeId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  search: z.string().trim().max(100).optional(),
  label: z.string().trim().max(50).optional()
});
