import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 15000,
    fileParallelism: false, // Run test files sequentially to prevent DB race conditions
    include: ['tests/**/*.test.js']
  }
});
