import { defineConfig } from 'vitest/config';

// Isolated config so the A0 determinism harness does NOT join the normal
// cert suite (the default vitest.config.js only includes src/**).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['audit/evidence/a0_determinism.harness.test.ts'],
    globals: true,
    testTimeout: 120000,
  },
});
