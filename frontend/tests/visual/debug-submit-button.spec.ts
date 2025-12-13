import { test, expect } from '@playwright/test';

test.describe('Debug Submit Button Issue', () => {
  test('check submit button conditions', async ({ page }) => {
    await page.goto('http://localhost:6200');

    // Fill all fields
    await page.locator('[data-testid-first-name="recipient-name"]').fill('John');
    await page.locator('[data-testid-last-name="recipient-last-name"]').fill('Doe');
    await page.locator('[data-testid-address-line1="address-line1"]').fill('123 Main St');
    await page.locator('[data-testid-address-city="address-city"]').fill('San Francisco');
    await page.locator('[data-testid-address-state="address-state"]').selectOption('CA');
    await page.locator('input[name="postalOrZip"]').fill('94105');

    await page.waitForTimeout(1000);

    // Add message
    const messageInput = page.locator('[data-testid="message-input"] textarea');
    await messageInput.fill('Test message');
    await page.waitForTimeout(500);

    // Upload image
    const fileInput = page.locator('input#postcard-front-image');
    await fileInput.setInputFiles({
      name: 'test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A', 'base64')
    });

    await page.waitForSelector('.alert-success', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Check for submit button with different selectors
    const submitByTestId = page.locator('[data-testid="submit-button"]');
    const submitByText = page.locator('button:has-text("Send Postcard")');
    const submitByClass = page.locator('button.btn.btn-lg');

    console.log('Submit button by test-id:', await submitByTestId.count());
    console.log('Submit button by text:', await submitByText.count());
    console.log('Submit button by class:', await submitByClass.count());

    // Take screenshot to see current state
    await page.screenshot({ path: '.claude_sessions/001/debug_submit_state.png', fullPage: true });

    // Check if ready to send card is visible
    const readyCard = page.locator('text=Ready to Send!');
    console.log('Ready card visible:', await readyCard.isVisible());

    // Check progress indicator
    const progressText = page.locator('text=Complete:');
    if (await progressText.isVisible()) {
      console.log('Progress text:', await progressText.textContent());
    }
  });
});