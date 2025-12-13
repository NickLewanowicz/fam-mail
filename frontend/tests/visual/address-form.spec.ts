import { test, expect } from '@playwright/test';

test.describe('Address Form Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5175/postcard-editor');
    // Wait for the page to load
    await page.waitForSelector('.enhanced-postcard-wrapper', { timeout: 10000 });
  });

  test('should show address form on back side of postcard', async ({ page }) => {
    // Click the flip button to show the back side
    await page.click('button[aria-label*="Show back side"]');

    // Wait for flip animation
    await page.waitForTimeout(700);

    // Check if address editor is visible
    await expect(page.locator('.address-editor')).toBeVisible();

    // Check for recipient address section
    await expect(page.locator('.recipient-address-section')).toBeVisible();

    // Check for the "Click to add recipient address" placeholder
    await expect(page.locator('text=Click to add recipient address')).toBeVisible();
  });

  test('should allow editing recipient address when clicked', async ({ page }) => {
    // Flip to back side
    await page.click('button[aria-label*="Show back side"]');
    await page.waitForTimeout(700);

    // Click on the address area to start editing
    await page.click('.address-editor');

    // Check if form fields appear
    await expect(page.locator('input[placeholder="John"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Doe"]')).toBeVisible();
    await expect(page.locator('input[placeholder="123 Main St"]')).toBeVisible();
    await expect(page.locator('input[placeholder="City"]')).toBeVisible();
    await expect(page.locator('input[placeholder="State"]')).toBeVisible();
    await expect(page.locator('input[placeholder="12345"]')).toBeVisible();

    // Check for country selector
    await expect(page.locator('select')).toBeVisible();
  });

  test('should accept keyboard input in address fields', async ({ page }) => {
    // Flip to back side and start editing
    await page.click('button[aria-label*="Show back side"]');
    await page.waitForTimeout(700);
    await page.click('.address-editor');

    // Fill in the address form
    await page.fill('input[placeholder="John"]', 'Jane');
    await page.fill('input[placeholder="Doe"]', 'Smith');
    await page.fill('input[placeholder="123 Main St"]', '456 Oak Avenue');
    await page.fill('input[placeholder="City"]', 'Springfield');
    await page.fill('input[placeholder="State"]', 'IL');
    await page.fill('input[placeholder="12345"]', '62701');

    // Verify the values were entered
    await expect(page.locator('input[placeholder="John"]')).toHaveValue('Jane');
    await expect(page.locator('input[placeholder="Doe"]')).toHaveValue('Smith');
    await expect(page.locator('input[placeholder="123 Main St"]')).toHaveValue('456 Oak Avenue');
    await expect(page.locator('input[placeholder="City"]')).toHaveValue('Springfield');
    await expect(page.locator('input[placeholder="State"]')).toHaveValue('IL');
    await expect(page.locator('input[placeholder="12345"]')).toHaveValue('62701');
  });

  test('should validate postal code formats for different countries', async ({ page }) => {
    // Flip to back side and start editing
    await page.click('button[aria-label*="Show back side"]');
    await page.waitForTimeout(700);
    await page.click('.address-editor');

    // Fill required fields first
    await page.fill('input[placeholder="John"]', 'John');
    await page.fill('input[placeholder="Doe"]', 'Doe');
    await page.fill('input[placeholder="123 Main St"]', '123 Main St');
    await page.fill('input[placeholder="City"]', 'New York');

    // Test US ZIP code
    await page.selectOption('select', 'US');
    await page.fill('input[placeholder="12345"]', '10001');
    // Should not show error
    await expect(page.locator('text=Invalid US ZIP code format')).not.toBeVisible();

    // Test Canadian postal code
    await page.selectOption('select', 'CA');
    await page.fill('input[placeholder="12345"]', 'K1A 0B1');
    // Should auto-format and not show error
    await expect(page.locator('text=Invalid Canadian postal code format')).not.toBeVisible();
  });

  test('should show return address section when enabled', async ({ page }) => {
    // Flip to back side
    await page.click('button[aria-label*="Show back side"]');
    await page.waitForTimeout(700);

    // Return address should be visible by default
    await expect(page.locator('.return-address-section')).toBeVisible();
    await expect(page.locator('text=Return Address (Optional)')).toBeVisible();
  });

  test('should display stamp placeholder', async ({ page }) => {
    // Flip to back side
    await page.click('button[aria-label*="Show back side"]');
    await page.waitForTimeout(700);

    // Check for stamp placeholder
    await expect(page.locator('.stamp-placeholder')).toBeVisible();
    await expect(page.locator('text=Stamp')).toBeVisible();
  });

  test('should exit editing mode when clicking outside', async ({ page }) => {
    // Flip to back side and start editing
    await page.click('button[aria-label*="Show back side"]');
    await page.waitForTimeout(700);
    await page.click('.address-editor');

    // Verify editing mode is active
    await expect(page.locator('input[placeholder="John"]')).toBeVisible();

    // Click outside the address editor
    await page.click('.postcard-back', { position: { x: 10, y: 10 } });

    // Wait a moment for the click outside handler
    await page.waitForTimeout(100);

    // Should return to display mode
    await expect(page.locator('input[placeholder="John"]')).not.toBeVisible();
    await expect(page.locator('text=Click to add recipient address')).toBeVisible();
  });

  test('should show postal compliance indicator', async ({ page }) => {
    // Flip to back side
    await page.click('button[aria-label*="Show back side"]');
    await page.waitForTimeout(700);

    // Check for postal compliance indicator
    await expect(page.locator('text=USPS/Canada Post Compliant')).toBeVisible();
  });

  test('should capture screenshots of address form', async ({ page }) => {
    await page.goto('http://localhost:5175/postcard-editor');
    await page.waitForSelector('.enhanced-postcard-wrapper', { timeout: 10000 });

    // Flip to back side
    await page.click('button[aria-label*="Show back side"]');
    await page.waitForTimeout(700);

    // Take screenshot of back side with address form
    await page.screenshot({
      path: 'test-results/postcard-back-with-address.png',
      fullPage: false
    });

    // Click to edit address
    await page.click('.address-editor');
    await page.waitForTimeout(200);

    // Fill with test data
    await page.fill('input[placeholder="John"]', 'John');
    await page.fill('input[placeholder="Doe"]', 'Doe');
    await page.fill('input[placeholder="123 Main St"]', '123 Main Street');
    await page.fill('input[placeholder="City"]', 'New York');
    await page.fill('input[placeholder="State"]', 'NY');
    await page.fill('input[placeholder="12345"]', '10001');

    // Take screenshot of filled form
    await page.screenshot({
      path: 'test-results/address-form-filled.png',
      fullPage: false
    });
  });
});