import { defineConfig } from 'vite';

export default defineConfig({
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 1200 },
  test: { environment: 'node', exclude: ['e2e/**', 'node_modules/**'] },
} as never);
