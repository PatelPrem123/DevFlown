import Task from '../models/Task.js';
import { FRACTIONAL_INDEXING, KANBAN_COLUMN_LIST } from '../config/constants.js';

/**
 * Computes the new fractional orderIndex between two adjacent cards (DEC-003)
 * @param {number|null} prevOrder - orderIndex of the card above, or null if dropped at top
 * @param {number|null} nextOrder - orderIndex of the card below, or null if dropped at bottom
 * @returns {number} The calculated floating-point orderIndex
 */
export const calculateFractionalOrder = (prevOrder, nextOrder) => {
  // Scenario 1: Empty column or no adjacent cards
  if (prevOrder === null && nextOrder === null) {
    return FRACTIONAL_INDEXING.INITIAL_BASE; // 1000.0
  }

  // Scenario 2: Dropped at top of column (before lowest card)
  if (prevOrder === null && nextOrder !== null) {
    if (nextOrder > FRACTIONAL_INDEXING.DEFAULT_GAP) {
      return nextOrder - FRACTIONAL_INDEXING.DEFAULT_GAP;
    }
    // If nextOrder <= 1000, take midpoint between 0 and nextOrder
    return nextOrder / 2.0;
  }

  // Scenario 3: Dropped at bottom of column (after highest card)
  if (prevOrder !== null && nextOrder === null) {
    return prevOrder + FRACTIONAL_INDEXING.DEFAULT_GAP;
  }

  // Scenario 4: Dropped between two existing cards (Midpoint Calculation)
  return (prevOrder + nextOrder) / 2.0;
};

/**
 * Checks whether the gap between two orders has collapsed below precision limits
 */
export const isPrecisionExhausted = (prevOrder, nextOrder) => {
  if (prevOrder !== null && nextOrder !== null) {
    return Math.abs(nextOrder - prevOrder) < FRACTIONAL_INDEXING.MIN_PRECISION_GAP;
  }
  return false;
};

/**
 * Re-balances all cards in a column to uniform spacing (1000, 2000, 3000...)
 * Prevents IEEE 754 floating-point underflow
 */
export const rebalanceColumnOrders = async (projectId, columnId) => {
  const tasks = await Task.find({ projectId, status: columnId })
    .sort({ orderIndex: 1 })
    .select('_id orderIndex');

  if (tasks.length === 0) return 0;

  const bulkOps = tasks.map((task, index) => ({
    updateOne: {
      filter: { _id: task._id },
      update: { $set: { orderIndex: (index + 1) * FRACTIONAL_INDEXING.DEFAULT_GAP } }
    }
  }));

  await Task.bulkWrite(bulkOps);
  return tasks.length;
};

/**
 * Orchestrates card movement, single-document $O(1)$ persistence, and precision guards
 */
export const moveCard = async (task, targetColumnId, prevOrder, nextOrder) => {
  if (!KANBAN_COLUMN_LIST.includes(targetColumnId)) {
    throw new Error(`Invalid target Kanban column: '${targetColumnId}'`);
  }

  const oldStatus = task.status;
  const newOrderIndex = calculateFractionalOrder(prevOrder, nextOrder);

  task.status = targetColumnId;
  task.orderIndex = newOrderIndex;
  await task.save();

  // Check if precision re-balance is needed
  let rebalanced = false;
  if (isPrecisionExhausted(prevOrder, nextOrder)) {
    await rebalanceColumnOrders(task.projectId, targetColumnId);
    rebalanced = true;
  }

  return {
    task,
    oldStatus,
    newStatus: targetColumnId,
    newOrderIndex,
    rebalanced
  };
};
