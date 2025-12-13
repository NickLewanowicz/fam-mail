import { test, expect } from '@playwright/test';
import { STORYBOOK_CATEGORIES, SCREENSHOT_OPTIONS } from './visual.config';

test.describe('Storybook Component Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Storybook
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('capture all component stories', async ({ page }) => {
    // Get all story links from the sidebar
    const storyLinks = await page.locator('[data-testid="sidebar"] a[href*="/story/"]').all();

    for (const link of storyLinks) {
      const storyName = await link.textContent();
      const storyHref = await link.getAttribute('href');

      if (!storyName || !storyHref) continue;

      console.log(`Capturing story: ${storyName}`);

      // Navigate to the story
      await page.goto(storyHref);
      await page.waitForLoadState('networkidle');

      // Wait for story to render
      await page.waitForSelector('#storybook-root', { timeout: 5000 });

      // Generate screenshot filename
      const category = getCategoryFromStory(storyHref);
      const filename = `storybook/${category}/${sanitizeFilename(storyName)}.png`;

      // Take screenshot
      await expect(page.locator('#storybook-root')).toHaveScreenshot(filename, {
        ...SCREENSHOT_OPTIONS,
        fullPage: false, // Only capture the component, not the entire Storybook UI
      });
    }
  });

  test('capture component variants', async ({ page }) => {
    // Test specific components with multiple variants
    const componentTests = [
      {
        name: 'Button',
        stories: ['Primary', 'Secondary', 'Large', 'Small', 'Disabled'],
        path: '/?path=/story/components-button--primary',
      },
      {
        name: 'AddressForm',
        stories: ['Default', 'With Errors', 'Filled', 'Disabled'],
        path: '/?path=/story/components-addressform--default',
      },
      {
        name: 'ImageUpload',
        stories: ['Empty', 'With Image', 'Drag Active', 'Error'],
        path: '/?path=/story/components-imageupload--empty',
      },
      {
        name: 'PostcardBuilder',
        stories: ['Default', 'With Image', 'Completed'],
        path: '/?path=/story/components-postcardbuilder--default',
      },
    ];

    for (const component of componentTests) {
      console.log(`Capturing variants for: ${component.name}`);

      for (const variant of component.stories) {
        // Navigate to specific variant
        const variantPath = component.path.replace('--default', `--${variant.toLowerCase().replace(' ', '-')}`);
        await page.goto(variantPath);
        await page.waitForLoadState('networkidle');

        // Wait for story to render
        await page.waitForSelector('#storybook-root', { timeout: 5000 });

        // Take screenshot
        const filename = `storybook/components/${component.name}-${variant.toLowerCase().replace(' ', '-')}.png`;
        await expect(page.locator('#storybook-root')).toHaveScreenshot(filename, SCREENSHOT_OPTIONS);
      }
    }
  });

  test('capture responsive components', async ({ page }) => {
    // Test responsive behavior for key components
    const responsiveTests = [
      {
        name: 'AddressForm',
        path: '/?path=/story/components-addressform--default',
      },
      {
        name: 'PostcardBuilder',
        path: '/?path=/story/components-postcardbuilder--default',
      },
    ];

    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1200, height: 800 },
    ];

    for (const component of responsiveTests) {
      console.log(`Capturing responsive views for: ${component.name}`);

      for (const viewport of viewports) {
        // Set viewport
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        // Navigate to component
        await page.goto(component.path);
        await page.waitForLoadState('networkidle');

        // Wait for story to render
        await page.waitForSelector('#storybook-root', { timeout: 5000 });

        // Take screenshot
        const filename = `storybook/responsive/${component.name}-${viewport.name}.png`;
        await expect(page.locator('#storybook-root')).toHaveScreenshot(filename, SCREENSHOT_OPTIONS);
      }
    }
  });

  test('capture interaction states', async ({ page }) => {
    // Test hover, focus, and active states
    await page.goto('/?path=/story/components-button--primary');
    await page.waitForLoadState('networkidle');

    const button = page.locator('#storybook-root button');

    // Default state
    await expect(button).toHaveScreenshot('storybook/interactions/button-default.png', SCREENSHOT_OPTIONS);

    // Hover state
    await button.hover();
    await expect(button).toHaveScreenshot('storybook/interactions/button-hover.png', SCREENSHOT_OPTIONS);

    // Focus state
    await button.focus();
    await expect(button).toHaveScreenshot('storybook/interactions/button-focus.png', SCREENSHOT_OPTIONS);

    // Active state (pressed)
    await button.hover();
    await page.mouse.down();
    await expect(button).toHaveScreenshot('storybook/interactions/button-active.png', SCREENSHOT_OPTIONS);
    await page.mouse.up();
  });
});

// Helper functions
function getCategoryFromStory(storyHref: string): string {
  if (storyHref.includes('components')) return 'components';
  if (storyHref.includes('forms')) return 'forms';
  if (storyHref.includes('layout')) return 'layout';
  if (storyHref.includes('ui')) return 'ui';
  return 'misc';
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}