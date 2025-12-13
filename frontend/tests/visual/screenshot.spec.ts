import { test, expect } from '@playwright/test';
import { VIEWPORTS, SCREENSHOT_OPTIONS, COMPONENT_STATES } from './visual.config';

test.describe('Fam-Mail App Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for any network requests to complete
    await page.waitForLoadState('networkidle');
  });

  test('homepage - empty state', async ({ page }) => {
    await page.goto('/');

    // Wait for app to load
    await page.waitForSelector('[data-testid="app"]', { timeout: 5000 });

    // Take screenshots for each viewport
    await expect(page).toHaveScreenshot('homepage/empty-state-mobile.png', {
      ...SCREENSHOT_OPTIONS,
      fullPage: true,
    });
  });

  test('form - validation states', async ({ page }) => {
    await page.goto('/');

    // Wait for form to be ready
    await page.waitForSelector('[data-testid="postcard-builder"]');

    // Test empty form validation
    await page.click('[data-testid="submit-button"]');
    await page.waitForTimeout(500); // Wait for validation messages

    await expect(page).toHaveScreenshot('form/validation-errors.png', SCREENSHOT_OPTIONS);
  });

  test('form - filled state', async ({ page }) => {
    await page.goto('/');

    // Fill in the form with test data
    await page.fill('[data-testid="recipient-name"]', 'John');
    await page.fill('[data-testid-last-name="recipient-last-name"]', 'Doe');
    await page.fill('[data-testid-address-line1="address-line1"]', '123 Main St');
    await page.fill('[data-testid-address-city="address-city"]', 'San Francisco');
    await page.selectOption('[data-testid-address-state="address-state"]', 'CA');
    await page.fill('[data-testid-address-zip="address-zip"]', '94105');
    await page.fill('[data-testid="message-input"]', 'Hello from Fam-Mail!');

    await expect(page).toHaveScreenshot('form/filled-form.png', SCREENSHOT_OPTIONS);
  });

  test('responsive layouts', async ({ page }) => {
    await page.goto('/');

    // Test mobile view
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('responsive/mobile-view.png', SCREENSHOT_OPTIONS);

    // Test tablet view
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('responsive/tablet-view.png', SCREENSHOT_OPTIONS);

    // Test desktop view
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('responsive/desktop-view.png', SCREENSHOT_OPTIONS);

    // Test widescreen view
    await page.setViewportSize(VIEWPORTS.widescreen);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('responsive/widescreen-view.png', SCREENSHOT_OPTIONS);
  });

  test('component states - address form', async ({ page }) => {
    await page.goto('/');

    // Focus state
    await page.focus('[data-testid="recipient-name"]');
    await expect(page.locator('[data-testid="address-form"]')).toHaveScreenshot(
      'components/address-form-focus.png',
      SCREENSHOT_OPTIONS
    );

    // Hover state
    await page.hover('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="submit-button"]')).toHaveScreenshot(
      'components/submit-button-hover.png',
      SCREENSHOT_OPTIONS
    );

    // Disabled state (when form is empty)
    const submitButton = page.locator('[data-testid="submit-button"]');
    await expect(submitButton).toBeDisabled();
    await expect(submitButton).toHaveScreenshot(
      'components/submit-button-disabled.png',
      SCREENSHOT_OPTIONS
    );
  });

  test('loading and error states', async ({ page }) => {
    // Mock API responses for different states
    await page.route('/api/health', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Backend connection failed' }),
      });
    });

    await page.goto('/');

    // Should show error state
    await page.waitForSelector('[data-testid="error-message"]', { timeout: 5000 });
    await expect(page).toHaveScreenshot('states/backend-error.png', SCREENSHOT_OPTIONS);

    // Remove mock and test loading state
    await page.unroute('/api/health');

    // Intercept submit request to show loading
    await page.route('/api/postcards', async route => {
      // Don't fulfill, keep it pending to show loading state
      await page.waitForTimeout(1000);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, id: 'test-123' }),
      });
    });

    // Fill form and submit
    await page.fill('[data-testid="recipient-name"]', 'Test User');
    await page.fill('[data-testid="address-line1"]', '123 Test St');
    await page.fill('[data-testid="address-city"]', 'Test City');
    await page.selectOption('[data-testid="address-state"]', 'CA');
    await page.fill('[data-testid="address-zip"]', '12345');

    // Mock file upload
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake image data'),
    });

    await page.click('[data-testid="submit-button"]');

    // Capture loading state
    await expect(page).toHaveScreenshot('states/submission-loading.png', SCREENSHOT_OPTIONS);
  });

  test('success state', async ({ page }) => {
    // Mock successful submission
    await page.route('/api/postcards', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          id: 'test-123',
          message: 'Postcard sent successfully!'
        }),
      });
    });

    await page.goto('/');

    // Fill and submit form
    await page.fill('[data-testid="recipient-name"]', 'Success Test');
    await page.fill('[data-testid="address-line1"]', '456 Success Ave');
    await page.fill('[data-testid="address-city"]', 'Victory City');
    await page.selectOption('[data-testid="address-state"]', 'NY');
    await page.fill('[data-testid="address-zip"]', '10001');

    // Mock file upload
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'success.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake image data'),
    });

    await page.click('[data-testid="submit-button"]');

    // Wait for success message
    await page.waitForSelector('[data-testid="success-message"]', { timeout: 5000 });
    await expect(page).toHaveScreenshot('states/submission-success.png', SCREENSHOT_OPTIONS);
  });
});