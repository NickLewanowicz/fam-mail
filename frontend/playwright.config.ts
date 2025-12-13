import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for visual testing
 * Supports multiple viewports and screenshot capture
 */
export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:6200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        baseURL: 'http://localhost:6200',
      },
    },
    {
      name: 'tablet',
      use: {
        ...devices['iPad Pro'],
        baseURL: 'http://localhost:6200',
      },
    },
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1200, height: 800 },
        baseURL: 'http://localhost:6200',
      },
    },
    {
      name: 'storybook',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:6202',
      },
    },
  ],

  webServer: [
    {
      command: 'npm run dev',
      port: 6200,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run storybook',
      port: 6202,
      reuseExistingServer: !process.env.CI,
    },
  ],
});