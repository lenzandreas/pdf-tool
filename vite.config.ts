import { defineConfig } from 'vite';

// Relative base so the build works from any folder on the web server
// (e.g. https://example.com/ or https://example.com/pdf/).
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
  },
  worker: { format: 'es' },
});
