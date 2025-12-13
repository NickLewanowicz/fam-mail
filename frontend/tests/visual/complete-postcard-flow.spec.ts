import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Complete Postcard Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main page
    await page.goto('http://localhost:6200');

    // Wait for the page to load
    await page.waitForSelector('[data-testid="app"]');
  });

  test('should complete full postcard creation flow', async ({ page }) => {
    // Step 1: Initial state
    await page.screenshot({ path: '.claude_sessions/001/01_initial_state.png', fullPage: true });

    // Check if we're on the correct page
    await expect(page.locator('h1:has-text("Create Your Postcard")')).toBeVisible();

    // Step 2: Fill in address form
    // Fill in recipient address
    await page.locator('[data-testid-first-name="recipient-name"]').fill('John');
    await page.locator('[data-testid-last-name="recipient-last-name"]').fill('Doe');
    await page.locator('input[name="addressLine1"]').fill('123 Main St');
    await page.locator('input[name="addressLine2"]').fill('Apt 4B');
    await page.locator('input[name="city"]').fill('San Francisco');
    await page.locator('input[name="provinceOrState"]').fill('CA');
    await page.locator('input[name="postalOrZip"]').fill('94105');

    await page.screenshot({ path: '.claude_sessions/001/02_address_filled.png', fullPage: true });

    // Step 3: Add a message
    const messageInput = page.locator('[data-testid="message-input"] textarea');
    await messageInput.fill('Hello!\n\nThis is a test postcard message. **Bold text** and *italic text* are supported!\n\nBest wishes,\nSender');

    await page.screenshot({ path: '.claude_sessions/001/03_message_entered.png', fullPage: true });

    // Step 4: Upload an image
    // Get the test image path (assuming we have one)
    const testImagePath = path.join(__dirname, 'test-assets/test-image.jpg');

    // Create a test image file as buffer
    const testImageBuffer = Buffer.from(
      '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A'
    , 'base64');

    // Handle file upload by setting up the file input
    const fileInput = page.locator('input#postcard-front-image');
    await fileInput.setInputFiles({
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: testImageBuffer
    });

    // Wait for the upload to complete
    await page.waitForSelector('.alert-success');
    await expect(page.locator('.alert-success')).toContainText('test-image.jpg');

    await page.screenshot({ path: '.claude_sessions/001/04_image_uploaded.png', fullPage: true });

    // Step 5: Check if submit button appears
    const submitButton = page.locator('[data-testid="submit-button"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toContainText('Send Postcard');

    // Check progress indicator
    await expect(page.locator('.progress-bar')).toHaveCSS('width', '100%');
    await expect(page.locator('text=Complete: 3 of 3 steps')).toBeVisible();

    await page.screenshot({ path: '.claude_sessions/001/05_ready_to_submit.png', fullPage: true });

    // Step 6: Submit the postcard (but don't actually send in test)
    // We'll check the click handler instead
    const isButtonEnabled = await submitButton.isEnabled();
    expect(isButtonEnabled).toBe(true);

    // Check the recipient info in the ready to send card
    await expect(page.locator('text=Your postcard will be sent to John Doe in San Francisco, CA')).toBeVisible();

    // Step 7: Test submit button loading state (simulate without actual submission)
    // We'll check if the button has the correct classes for the loading state
    const buttonClasses = await submitButton.getAttribute('class');
    expect(buttonClasses).toContain('btn');
    expect(buttonClasses).toContain('btn-lg');

    await page.screenshot({ path: '.claude_sessions/001/06_submit_button_present.png', fullPage: true });
  });

  test('should show validation errors when form is incomplete', async ({ page }) => {
    // Check initial state - no submit button should be visible
    const submitButton = page.locator('[data-testid="submit-button"]');
    await expect(submitButton).not.toBeVisible();

    // Fill partial form
    await page.locator('[data-testid-first-name="recipient-name"]').fill('John');

    // Still no submit button
    await expect(submitButton).not.toBeVisible();

    // Add image but no message or full address
    const testImageBuffer = Buffer.from(
      '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A'
    , 'base64');

    const fileInput = page.locator('input#postcard-front-image');
    await fileInput.setInputFiles({
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: testImageBuffer
    });

    // Still no submit button - missing complete address and message
    await expect(submitButton).not.toBeVisible();

    // Check progress indicator shows partial completion
    const progressText = await page.locator('text=Complete:').textContent();
    expect(progressText).toContain('Complete: 1 of 3 steps');
  });

  test('should handle image upload errors', async ({ page }) => {
    // Try to upload a file with invalid type
    const fileInput = page.locator('input#postcard-front-image');
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('This is not an image')
    });

    // Should show error message
    await expect(page.locator('.alert-error')).toContainText('Invalid file type');

    // Clear error by removing image
    await page.click('text=Change Image');
  });

  test('should toggle safe zones', async ({ page }) => {
    // Safe zones should be on by default
    await expect(page.locator('text=Safe Zone Guide:')).toBeVisible();

    // Toggle safe zones off
    const toggle = page.locator('input[type="checkbox"]');
    await toggle.click();

    // Safe zone guide should disappear
    await expect(page.locator('text=Safe Zone Guide:')).not.toBeVisible();

    // Toggle back on
    await toggle.click();
    await expect(page.locator('text=Safe Zone Guide:')).toBeVisible();
  });

  test('should show live preview updates', async ({ page }) => {
    // Check preview iframes exist
    await expect(page.locator('iframe[title="Postcard Front Preview"]')).toBeVisible();
    await expect(page.locator('iframe[title="Postcard Back Preview"]')).toBeVisible();

    // Add message and check back preview updates
    const messageInput = page.locator('[data-testid="message-input"] textarea');
    await messageInput.fill('Test message');

    // The back preview iframe should update (we can't easily check iframe content in Playwright)
    // but we can verify the iframe is still there
    await expect(page.locator('iframe[title="Postcard Back Preview"]')).toBeVisible();
  });
});