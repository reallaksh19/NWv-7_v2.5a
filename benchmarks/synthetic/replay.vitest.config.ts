import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'node', include: ['benchmarks/synthetic/replay.harness.test.ts'], globals: true, testTimeout: 600000 },
});
