import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/setupTests.ts',
        css: true,
        exclude: ['tests/e2e/**', 'tests/screenshots/**', 'node_modules/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            // Scope to app code only — stray debug scripts elsewhere in the
            // repo would otherwise dilute every number.
            include: ['src/**'],
            exclude: [
                'node_modules/',
                'src/setupTests.ts',
                '**/*.test.{ts,tsx}',
                '**/*.config.{ts,js}',
            ],
            thresholds: {
                branches: 80,
                functions: 60,
                lines: 60,
                statements: 60,
            },
        },
    },
})
