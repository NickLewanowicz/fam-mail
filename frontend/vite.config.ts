import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      // Generate bundle analysis report on build (open stats.html to inspect)
      visualizer({
        filename: 'dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
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
            if (id.includes('node_modules/react-router-dom/')) return 'vendor-router';

            // Markdown parser + sanitizer
            if (id.includes('node_modules/marked/')) return 'vendor-markdown';
            if (id.includes('node_modules/dompurify/')) return 'vendor-sanitize';
          },
        },
      },
    },
  };
});
