import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Deliberately minimal - plain node-environment vitest for pure permission-
// helper functions (Phase 5.3), no jsdom/testing-library/React rendering.
// Not a general frontend test framework: these files have no DOM/React
// dependency, same pattern as packages/shared and packages/server's tests.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    preserveSymlinks: true,
  },
});
