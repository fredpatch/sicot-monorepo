import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // npm workspaces symlinks @sicot/shared into node_modules; Vite's
    // default behavior resolves that symlink to its real path under
    // packages/shared, which falls outside node_modules/ and so bypasses
    // Rollup's commonjs plugin (whose default `include` only matches
    // node_modules/**). @sicot/shared's dist is CJS, so unprocessed it
    // gets misread as ESM with zero named exports. preserveSymlinks keeps
    // the node_modules/@sicot/shared path, so the plugin actually runs.
    preserveSymlinks: true,
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      // In Docker, 'localhost' inside the client container means the client
      // container itself — must target the api service's Compose network name.
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
