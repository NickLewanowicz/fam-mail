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

            // Heavy editor — lazy-loaded via dynamic import in PostcardBuilder/MessageEditor
            // @uiw/react-md-editor bundles its own CSS, codemirror, and extensions (~1MB)
            if (id.includes('node_modules/@uiw/react-md-editor/')
              || id.includes('node_modules/@codemirror/')
              || id.includes('node_modules/@lezer/')
              || id.includes('node_modules/crelt/')
              || id.includes('node_modules/w3c-keyname/')
              || id.includes('node_modules/style-mod/')
              || id.includes('node_modules/@milkdown/')) {
              return 'vendor-md-editor';
            }

            // Markdown parser + sanitizer — lazy-loaded with PostcardBuilder
            if (id.includes('node_modules/marked/')) return 'vendor-markdown';
            if (id.includes('node_modules/dompurify/')) return 'vendor-sanitize';

            // Form library — lazy-loaded with AddressForm inside PostcardBuilder
            if (id.includes('node_modules/react-hook-form/')) return 'vendor-forms';
          },
        },
      },
    },
  };
});
