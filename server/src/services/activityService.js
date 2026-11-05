import ActivityLog from '../models/ActivityLog.js';

/**
 * Append-Only Forensic Activity Ledger Service (DEC-002)
 * Records immutable timeline events asynchronously
 */
export const logActivity = async ({
  projectId,
  workspaceId,
  taskId = null,
  actorId,
  action,
  details = {}
}) => {
  try {
    return await ActivityLog.create({
      projectId,
      workspaceId,
      taskId,
      actorId,
      action,
      details
    });
  } catch (error) {
    console.error('Failed to append to ActivityLog:', error.message);
    return null;
  }
};
