import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

export default defineConfig(({ mode }) => {
  // process.env wins over .env files so staged runs can override the API
  // target without writing a .env (vitest reads .env too, which broke the
  // relative-URL assertions — tracker #108).
  const env = loadEnv(mode, process.cwd(), '');
  if (process.env.VITE_API_URL) env.VITE_API_URL = process.env.VITE_API_URL;

  return {
    plugins: [
      react(),
      // Generate bundle analysis report on build (open stats.html to inspect)
      process.env.ANALYZE && visualizer({
      filename: 'dist/stats.html',
    }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:8484',
          changeOrigin: true,
        },
      },
    },
    // `vite preview` serves a built dist with the same /api proxy — the
    // deterministic way to validate a worktree build (dev-server watchers
    // don't fire inside git-ignored worktree dirs).
    preview: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:8484',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // React core — loaded eagerly (needed for any route)
            if (id.includes('node_modules/react-dom/')) return 'vendor-react-dom';
            if (id.includes('node_modules/react/')) return 'vendor-react';

            // Router — loaded eagerly in main.tsx
            if (id.includes('node_modules/react-router')) return 'vendor-router';

            // Markdown parser + sanitizer
            if (id.includes('node_modules/marked/')) return 'vendor-markdown';
            if (id.includes('node_modules/dompurify/')) return 'vendor-sanitize';
          },
        },
      },
    },
  };
});
