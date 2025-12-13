import { test, expect } from '@playwright/test';

test.describe('Postcard Image Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the postcard editor page
    await page.goto('/postcard-editor');
    // Wait for the component to load
    await page.waitForSelector('.enhanced-postcard-wrapper', { timeout: 5000 });
  });

  test('should show dropzone on front side when no image is uploaded', async ({ page }) => {
    // Wait for the component to load
    await page.waitForSelector('[data-testid="postcard-front"]');

    // Check if we're on the front side initially
    const frontSide = page.locator('[data-testid="postcard-front"]');
    await expect(frontSide).toBeVisible();

    // Look for the dropzone elements
    const uploadText = page.locator('text=Click to upload image');
    await expect(uploadText).toBeVisible();

    const dragDropText = page.locator('text=or drag and drop');
    await expect(dragDropText).toBeVisible();

    // Check for the upload icon
    const uploadIcon = page.locator('svg[xmlns="http://www.w3.org/2000/svg"]');
    await expect(uploadIcon).toBeVisible();

    // Check for file input (should be hidden)
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveCount(1);
    await expect(fileInput).toBeHidden();
  });

  test('should allow click to upload image', async ({ page }) => {
    // Wait for the component to load
    await page.waitForSelector('[data-testid="postcard-front"]');

    // Get the file input
    const fileInput = page.locator('input[type="file"]');

    // Get a test image
    const testImagePath = 'public/test-image-600x400.png';

    // Upload the image
    await fileInput.setInputFiles(testImagePath);

    // Wait for the image to load
    await page.waitForTimeout(1000);

    // Check if the image is displayed
    const uploadedImage = page.locator('img[alt="Postcard front"]');
    await expect(uploadedImage).toBeVisible();

    // The upload area should no longer be visible
    const uploadText = page.locator('text=Click to upload image');
    await expect(uploadText).not.toBeVisible();
  });

  test('should allow drag and drop to upload image', async ({ page }) => {
    // Wait for the component to load
    await page.waitForSelector('[data-testid="postcard-front"]');

    // Get the dropzone area
    const dropzone = page.locator('[aria-label="Upload image for postcard front"]');

    // Get test image data
    const testImagePath = 'public/test-image-600x400.png';
    const fileData = await test.step('Read test image', async () => {
      const fs = await import('fs');
      return fs.readFileSync(testImagePath);
    });

    // Create data transfer for drag and drop
    const dataTransfer = await page.evaluateHandle((data) => {
      const dt = new DataTransfer();
      const file = new File([data], 'test-image.png', { type: 'image/png' });
      dt.items.add(file);
      return dt;
    }, fileData);

    // Simulate drag and drop
    await dropzone.dispatchEvent('dragover', { dataTransfer });
    await expect(dropzone).toHaveClass(/border-accent-blue/); // Should change color on drag over

    await dropzone.dispatchEvent('drop', { dataTransfer });

    // Wait for the image to load
    await page.waitForTimeout(1000);

    // Check if the image is displayed
    const uploadedImage = page.locator('img[alt="Postcard front"]');
    await expect(uploadedImage).toBeVisible();

    // The upload area should no longer be visible
    const uploadText = page.locator('text=Click to upload image');
    await expect(uploadText).not.toBeVisible();
  });

  test('should show editor controls after image upload', async ({ page }) => {
    // Wait for the component to load
    await page.waitForSelector('[data-testid="postcard-front"]');

    // Upload an image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('public/test-image-600x400.png');

    // Wait for the image to load
    await page.waitForTimeout(1000);

    // Look for the editor controls
    const changeButton = page.locator('button:has-text("Change")');
    const removeButton = page.locator('button:has-text("Remove")');
    const showEditorButton = page.locator('button:has-text("Show Editor")');

    // These might be hidden until hover
    const controlsContainer = page.locator('.opacity-0.group-hover\\:opacity-100');

    // Hover over the image to reveal controls
    const imageContainer = page.locator('[data-testid="postcard-front"]');
    await imageContainer.hover();

    // Now the controls should be visible
    await expect(changeButton).toBeVisible();
    await expect(removeButton).toBeVisible();
    await expect(showEditorButton).toBeVisible();
  });

  test('should maintain image after flipping card', async ({ page }) => {
    // Wait for the component to load
    await page.waitForSelector('[data-testid="postcard-front"]');

    // Upload an image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('public/test-image-600x400.png');

    // Wait for the image to load
    await page.waitForTimeout(1000);

    // Verify image is visible
    const uploadedImage = page.locator('img[alt="Postcard front"]');
    await expect(uploadedImage).toBeVisible();

    // Flip the card
    const flipButton = page.locator('button[aria-label*="Show back side"]');
    await flipButton.click();

    // Wait for flip animation
    await page.waitForTimeout(700);

    // Flip back
    const flipBackButton = page.locator('button[aria-label*="Show front side"]');
    await flipBackButton.click();

    // Wait for flip animation
    await page.waitForTimeout(700);

    // Image should still be visible
    await expect(uploadedImage).toBeVisible();
  });
});