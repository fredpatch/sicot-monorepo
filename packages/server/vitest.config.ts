import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Mirrors tsconfig.json's "@/*" -> "./src/*" path alias so route/middleware
// tests can import the same way the app code does.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
