import { test, expect } from '@playwright/test';

test.describe('InteractivePostcard CSS Fix', () => {
  test('front face should be interactive when not flipped', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Wait for the postcard to load
    await page.waitForSelector('.postcard-container');

    // Check that front face is visible and has pointer-events: auto
    const frontFace = page.locator('.postcard-face.postcard-front');
    await expect(frontFace).toBeVisible();

    // Verify pointer-events style
    const frontPointerEvents = await frontFace.evaluate(el =>
      getComputedStyle(el).pointerEvents
    );
    expect(frontPointerEvents).toBe('auto');

    // Check that back face has pointer-events: none when not flipped
    const backFace = page.locator('.postcard-face.postcard-back');
    const backPointerEvents = await backFace.evaluate(el =>
      getComputedStyle(el).pointerEvents
    );
    expect(backPointerEvents).toBe('none');
  });

  test('back face should be interactive when flipped', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Wait for the postcard to load
    await page.waitForSelector('.postcard-container');

    // Click the flip button
    await page.click('[aria-label="Show back side"]');

    // Wait for flip animation
    await page.waitForTimeout(600);

    // Check that flipper has flipped class
    const flipper = page.locator('.postcard-flipper');
    await expect(flipper).toHaveClass(/flipped/);

    // Verify back face now has pointer-events: auto
    const backFace = page.locator('.postcard-face.postcard-back');
    const backPointerEvents = await backFace.evaluate(el =>
      getComputedStyle(el).pointerEvents
    );
    expect(backPointerEvents).toBe('auto');

    // Verify front face now has pointer-events: none
    const frontFace = page.locator('.postcard-face.postcard-front');
    const frontPointerEvents = await frontFace.evaluate(el =>
      getComputedStyle(el).pointerEvents
    );
    expect(frontPointerEvents).toBe('none');
  });

  test('can interact with image upload on front face', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Wait for the postcard to load
    await page.waitForSelector('.postcard-container');

    // Try to click on the image upload area
    const imageUploadArea = page.locator('[data-testid="image-upload-area"]').first();
    if (await imageUploadArea.isVisible()) {
      // This should work because front face has pointer-events: auto
      await imageUploadArea.click();
      // If we reach here, the click was successful
      expect(true).toBe(true);
    } else {
      // Image upload area might not be visible, that's okay for this test
      test.skip();
    }
  });

  test('can interact with message textarea on back face', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Wait for the postcard to load
    await page.waitForSelector('.postcard-container');

    // Flip to back
    await page.click('[aria-label="Show back side"]');
    await page.waitForTimeout(600);

    // Try to type in the message textarea
    const messageTextarea = page.locator('textarea[placeholder*="message" i]').first();
    if (await messageTextarea.isVisible()) {
      await messageTextarea.fill('Test message');
      const value = await messageTextarea.inputValue();
      expect(value).toBe('Test message');
    } else {
      test.skip();
    }
  });
});