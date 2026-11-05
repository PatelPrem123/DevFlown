import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectDB, disconnectDB } from '../src/config/db.js';
import Counter from '../src/models/Counter.js';
import { getNextTaskKey } from '../src/services/sequenceService.js';
import mongoose from 'mongoose';

describe('Phase 4: Concurrency-Safe Sequence Increment Suite (DEC-005)', () => {
  const dummyProjectId = new mongoose.Types.ObjectId();
  const projectKey = 'CONCUR';

  beforeAll(async () => {
    await connectDB();
    await Counter.deleteMany({});
  });

  afterAll(async () => {
    await Counter.deleteMany({});
    await disconnectDB();
  });

  it('should generate 25 unique non-colliding sequential keys under concurrent race conditions', async () => {
    const concurrencyCount = 25;

    // Simulate 25 simultaneous asynchronous requests executing in parallel
    const promises = Array.from({ length: concurrencyCount }).map(() =>
      getNextTaskKey(dummyProjectId, projectKey)
    );

    const generatedKeys = await Promise.all(promises);

    // 1. Assert exactly 25 keys were generated
    expect(generatedKeys.length).toBe(concurrencyCount);

    // 2. Assert zero duplicate keys (Strict Set uniqueness check)
    const uniqueKeysSet = new Set(generatedKeys);
    expect(uniqueKeysSet.size).toBe(concurrencyCount);

    // 3. Assert all keys follow the expected format CONCUR-1 through CONCUR-25
    const sequenceNumbers = generatedKeys
      .map(k => parseInt(k.replace(`${projectKey}-`, ''), 10))
      .sort((a, b) => a - b);

    expect(sequenceNumbers[0]).toBe(1);
    expect(sequenceNumbers[sequenceNumbers.length - 1]).toBe(concurrencyCount);

    // Verify there are no gaps
    for (let i = 0; i < sequenceNumbers.length; i++) {
      expect(sequenceNumbers[i]).toBe(i + 1);
    }
  });
});
