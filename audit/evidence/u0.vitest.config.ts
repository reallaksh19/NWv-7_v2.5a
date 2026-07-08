import { defineConfig } from 'vitest/config';

// Isolated config so the U0 Up Ahead determinism harness does NOT join the
// normal cert suite (the default vitest.config.js only includes src/**).
// Mirrors audit/evidence/a0.vitest.config.ts.
export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'audit/evidence/u0_determinism.harness.test.mjs',
      'audit/evidence/u0_clockprobe.harness.test.mjs',
      'audit/evidence/u0_injection.harness.test.mjs',
    ],
    globals: true,
    testTimeout: 120000,
  },
});
