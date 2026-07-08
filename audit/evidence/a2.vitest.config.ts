import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'node', include: ['audit/evidence/a2_dump.harness.test.ts'], globals: true, testTimeout: 600000 },
});
