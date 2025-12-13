import { test, expect } from '@playwright/test';

test.describe('Postcard Creation Flow - Simple Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:6200');
    await page.waitForSelector('[data-testid="app"]');
  });

  test('complete end-to-end flow', async ({ page }) => {
    // 1. Initial state
    await expect(page.locator('h1:has-text("Create Your Postcard")')).toBeVisible();
    await expect(page.locator('[data-testid="submit-button"]')).not.toBeVisible();
    await page.screenshot({ path: '.claude_sessions/001/flow_01_initial.png', fullPage: true });

    // 2. Fill address
    await page.locator('[data-testid-first-name="recipient-name"]').fill('John');
    await page.locator('[data-testid-last-name="recipient-last-name"]').fill('Doe');
    await page.locator('[data-testid-address-line1="address-line1"]').fill('123 Main St');
    await page.locator('[data-testid-address-city="address-city"]').fill('San Francisco');
    await page.locator('[data-testid-address-state="address-state"]').selectOption('CA');
    await page.locator('input[name="postalOrZip"]').fill('94105');
    await page.waitForTimeout(1000); // Wait for auto-submit
    await page.screenshot({ path: '.claude_sessions/001/flow_02_address_filled.png', fullPage: true });

    // 3. Add message
    const messageInput = page.locator('[data-testid="message-input"] textarea');
    await messageInput.fill('Hello there! This is a test message.');
    await page.waitForTimeout(500); // Wait for message to register
    await page.screenshot({ path: '.claude_sessions/001/flow_03_message_added.png', fullPage: true });

    // 4. Upload image
    const fileInput = page.locator('input#postcard-front-image');
    await fileInput.setInputFiles({
      name: 'test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A', 'base64')
    });
    await page.waitForSelector('.alert-success', { timeout: 10000 });
    await page.screenshot({ path: '.claude_sessions/001/flow_04_image_uploaded.png', fullPage: true });

    // 5. Check submit button appears
    await expect(page.locator('[data-testid="submit-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="submit-button"]')).toContainText('Send Postcard');
    await expect(page.locator('text=Complete: 3 of 3 steps')).toBeVisible();
    await page.screenshot({ path: '.claude_sessions/001/flow_05_ready_to_submit.png', fullPage: true });

    // 6. Verify submit button is enabled
    const isButtonEnabled = await page.locator('[data-testid="submit-button"]').isEnabled();
    expect(isButtonEnabled).toBe(true);

    // 7. Check recipient display
    await expect(page.locator('text=Your postcard will be sent to John Doe in San Francisco, CA')).toBeVisible();
    await page.screenshot({ path: '.claude_sessions/001/flow_06_final_state.png', fullPage: true });
  });

  test('check preview iframes', async ({ page }) => {
    await expect(page.locator('iframe[title="Postcard Front Preview"]')).toBeVisible();
    await expect(page.locator('iframe[title="Postcard Back Preview"]')).toBeVisible();
  });

  test('validation prevents submit', async ({ page }) => {
    // Fill only partial form
    await page.locator('[data-testid-first-name="recipient-name"]').fill('John');

    // Submit button should not be visible
    await expect(page.locator('[data-testid="submit-button"]')).not.toBeVisible();

    // Progress should be partial
    await expect(page.locator('text=Complete: 1 of 3 steps')).toBeVisible();
  });
});