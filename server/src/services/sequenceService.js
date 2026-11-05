import Counter from '../models/Counter.js';

/**
 * Atomic Concurrency-Safe Task Key Sequence Engine (DEC-005)
 * Increments project counter atomically and returns human-readable formatted task identifier (e.g. FLOW-101)
 */
export const getNextTaskKey = async (projectId, projectKey) => {
  const counterName = `project_counter_${projectId}`;

  const counter = await Counter.findOneAndUpdate(
    { name: counterName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return `${projectKey.toUpperCase()}-${counter.seq}`;
};
