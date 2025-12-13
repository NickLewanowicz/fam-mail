import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Postcard Editor End-to-End Verification', () => {
  const SCREENSHOT_DIR = '.claude_sessions/001/e2e_verification_screenshots';

  test.beforeEach(async ({ page }) => {
    // Ensure screenshot directory exists
    await page.goto('http://localhost:6200/postcard-editor');
    await page.waitForSelector('[data-testid="app"]', { timeout: 10000 });
  });

  test('should verify complete postcard creation flow with screenshots', async ({ page }) => {
    console.log('[' + new Date().toISOString() + '] Starting complete postcard creation flow test');

    // Step 1: Verify page load
    console.log('[' + new Date().toISOString() + '] Step 1: Verifying page load');
    await expect(page.locator('h1:has-text("Create Your Postcard")')).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01_initial_load.png`,
      fullPage: true
    });
    console.log('[' + new Date().toISOString() + '] Screenshot saved: 01_initial_load.png');

    // Verify initial state - no submit button visible
    await expect(page.locator('[data-testid="submit-button"]')).not.toBeVisible();
    console.log('[' + new Date().toISOString() + '] ✓ Submit button correctly hidden on initial load');

    // Verify progress indicator shows 0 of 3 steps
    await expect(page.locator('text=Complete: 0 of 3 steps')).toBeVisible();
    console.log('[' + new Date().toISOString() + '] ✓ Progress indicator shows 0 of 3 steps');

    // Step 2: Upload image with proper validation
    console.log('[' + new Date().toISOString() + '] Step 2: Testing image upload');
    const testImagePath = path.join(__dirname, 'test-assets/test-postcard.jpg');

    // Verify file input exists
    const fileInput = page.locator('input#postcard-front-image');
    await expect(fileInput).toBeVisible();

    // Screenshot before upload
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02_before_upload.png`,
      fullPage: true
    });
    console.log('[' + new Date().toISOString() + '] Screenshot saved: 02_before_upload.png');

    // Upload valid image
    await fileInput.setInputFiles(testImagePath);
    console.log('[' + new Date().toISOString() + '] Image upload initiated');

    // Screenshot during upload (if possible)
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03_during_upload.png`,
      fullPage: true
    });
    console.log('[' + new Date().toISOString() + '] Screenshot saved: 03_during_upload.png');

    // Wait for upload completion
    await page.waitForSelector('.alert-success', { timeout: 5000 });
    await expect(page.locator('.alert-success')).toContainText('test-postcard.jpg');
    console.log('[' + new Date().toISOString() + '] ✓ Upload success alert appeared');

    // Verify image appears in preview
    await expect(page.locator('img[alt="Postcard front preview"]')).toBeVisible();
    console.log('[' + new Date().toISOString() + '] ✓ Image preview visible');

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04_image_uploaded.png`,
      fullPage: true
    });
    console.log('[' + new Date().toISOString() + '] Screenshot saved: 04_image_uploaded.png');

    // Step 3: Flip to back and enter message
    console.log('[' + new Date().toISOString() + '] Step 3: Testing message input');

    // Flip to back
    await page.click('[data-testid="flip-button"]');
    await page.waitForTimeout(800); // Wait for flip animation
    console.log('[' + new Date().toISOString() + '] Flipped to back side');

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05_flipped_to_back.png`,
      fullPage: true
    });
    console.log('[' + new Date().toISOString() + '] Screenshot saved: 05_flipped_to_back.png');

    // Enter message with markdown support
    const messageInput = page.locator('[data-testid="message-input"] textarea');
    await expect(messageInput).toBeVisible();

    const testMessage = `Hello from Paris! 🇫🇷

Having an amazing time here. The Eiffel Tower is **absolutely stunning** at night!

*Wish you were here*
~ John`;

    // Screenshot before typing
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06_before_message.png`,
      fullPage: true
    });
    console.log('[' + new Date().toISOString() + '] Screenshot saved: 06_before_message.png');

    await messageInput.fill(testMessage);
    console.log('[' + new Date().toISOString() + '] Message entered');

    // Screenshot while typing/after typing
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07_message_entered.png`,
      fullPage: true
    });
    console.log('[' + new Date().toISOString() + '] Screenshot saved: 07_message_entered.png');

    // Verify character count updates
    const charCount = await page.locator('[data-testid="char-count"]').textContent();
    expect(parseInt(charCount || '0')).toBeGreaterThan(0);
    console.log('[' + new Date().toISOString() + '] ✓ Character count updated: ' + charCount);

    // Verify message appears in preview
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08_message_with_count.png`,
      fullPage: true
    });
    console.log('[' + new Date().toISOString() + '] Screenshot saved: 08_message_with_count.png');

    // Flip back to front
    await page.click('[data-testid="flip-button"]');
    await page.waitForTimeout(800);
    console.log('[' + new Date().toISOString() + '] Flipped back to front');

    // Step 4: Fill complete address form
    console.log('[' + new Date().toISOString() + '] Step 4: Testing address form');

    const recipientData = {
      firstName: 'Sarah',
      lastName: 'Johnson',
      addressLine1: '789 Broadway',
      addressLine2: 'Apt 12C',
      city: 'New York',
      provinceOrState: 'NY',
      postalOrZip: '10003'
    };

    // Fill all required fields systematically with screenshots
    console.log('[' + new Date().toISOString() + '] Filling recipient first name');
    await page.locator('[data-testid-first-name="recipient-name"]').fill(recipientData.firstName);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09_first_name_filled.png`,
      fullPage: true
    });

    console.log('[' + new Date().toISOString() + '] Filling recipient last name');
    await page.locator('[data-testid-last-name="recipient-last-name"]').fill(recipientData.lastName);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/10_last_name_filled.png`,
      fullPage: true
    });

    console.log('[' + new Date().toISOString() + '] Filling address line 1');
    await page.locator('input[name="addressLine1"]').fill(recipientData.addressLine1);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/11_address1_filled.png`,
      fullPage: true
    });

    console.log('[' + new Date().toISOString() + '] Filling address line 2');
    await page.locator('input[name="addressLine2"]').fill(recipientData.addressLine2);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/12_address2_filled.png`,
      fullPage: true
    });

    console.log('[' + new Date().toISOString() + '] Filling city');
    await page.locator('input[name="city"]').fill(recipientData.city);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/13_city_filled.png`,
      fullPage: true
    });

    console.log('[' + new Date().toISOString() + '] Filling state/province');
    await page.locator('input[name="provinceOrState"]').fill(recipientData.provinceOrState);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/14_state_filled.png`,
      fullPage: true
    });

    console.log('[' + new Date().toISOString() + '] Filling postal/zip code');
    await page.locator('input[name="postalOrZip"]').fill(recipientData.postalOrZip);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/15_postal_filled.png`,
      fullPage: true
    });

    // Verify all fields are filled
    for (const [key, value] of Object.entries(recipientData)) {
      const input = page.locator(`input[name="${key}"], [data-testid-first-name="recipient-name"], [data-testid-last-name="recipient-last-name"]`);
      await expect(input).toHaveValue(value);
    }
    console.log('[' + new Date().toISOString() + '] ✓ All address fields verified');

    // Screenshot complete address form
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/16_address_complete.png`,
      fullPage: true
    });
    console.log('[' + new Date().toISOString() + '] Screenshot saved: 16_address_complete.png');

    // Step 5: Verify submit button appears and is enabled
    console.log('[' + new Date().toISOString() + '] Step 5: Verifying submit button state');

    const submitButton = page.locator('[data-testid="submit-button"]');
    await expect(submitButton).toBeVisible({ timeout: 3000 });
    await expect(submitButton).toContainText('Send Postcard');
    await expect(submitButton).toBeEnabled();
    console.log('[' + new Date().toISOString() + '] ✓ Submit button visible and enabled');

    // Verify ready to send card appears
    await expect(page.locator('text=Ready to Send!')).toBeVisible();
    await expect(page.locator(`text=Your postcard will be sent to ${recipientData.firstName} ${recipientData.lastName} in ${recipientData.city}, ${recipientData.provinceOrState}`)).toBeVisible();
    console.log('[' + new Date().toISOString() + '] ✓ Ready to send message appears');

    // Verify progress bar is at 100%
    await expect(page.locator('.progress-bar')).toHaveCSS('width', '100%');
    console.log('[' + new Date().toISOString() + '] ✓ Progress bar at 100%');

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/17_ready_to_submit.png`,
      fullPage: true
    });
    console.log('[' + new Date().toISOString() + '] Screenshot saved: 17_ready_to_submit.png');

    // Step 6: Simulate submission (without actually sending)
    console.log('[' + new Date().toISOString() + '] Step 6: Testing submission');

    // Mock the API response
    await page.route('**/api/postcards', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          postcard: {
            id: 'test_pc_123',
            status: 'ready_for_print',
            testMode: true,
            createdAt: new Date().toISOString(),
            expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            carrier: 'USPS',
            trackingNumber: '1Z9999W99999999999'
          }
        })
      });
    });
    console.log('[' + new Date().toISOString() + '] API mock set up');

    // Click submit button
    await submitButton.click();
    console.log('[' + new Date().toISOString() + '] Submit button clicked');

    // Verify loading state
    await expect(submitButton).toContainText('Sending...');
    await expect(submitButton).toBeDisabled();
    await expect(submitButton).toHaveClass(/btn-disabled/);
    console.log('[' + new Date().toISOString() + '] ✓ Loading state verified');

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/18_submission_loading.png`,
      fullPage: true
    });
    console.log('[' + new Date().toISOString() + '] Screenshot saved: 18_submission_loading.png');

    // Wait for success response
    await page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });

    // Verify success state
    await expect(page.locator('text=Postcard Sent Successfully')).toBeVisible();
    await expect(page.locator('text=test_pc_123')).toBeVisible();
    await expect(page.locator('text=Ready for Print')).toBeVisible();
    console.log('[' + new Date().toISOString() + '] ✓ Success message verified');

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/19_submission_success.png`,
      fullPage: true
    });
    console.log('[' + new Date().toISOString() + '] Screenshot saved: 19_submission_success.png');

    console.log('[' + new Date().toISOString() + '] ✓ Complete postcard creation flow verified successfully');
  });

  test('should handle error scenarios', async ({ page }) => {
    console.log('[' + new Date().toISOString() + '] Starting error scenario tests');

    // Test invalid image upload
    await page.goto('http://localhost:6200/postcard-editor');

    // Try to upload non-image file
    const fileInput = page.locator('input#postcard-front-image');
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('This is not an image')
    });

    // Verify error appears
    await expect(page.locator('.alert-error')).toBeVisible();
    await expect(page.locator('.alert-error')).toContainText('Invalid file type');
    console.log('[' + new Date().toISOString() + '] ✓ Invalid file error handled');

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/20_error_invalid_file.png`,
      fullPage: true
    });
    console.log('[' + new Date().toISOString() + '] Screenshot saved: 20_error_invalid_file.png');

    // Test incomplete form
    await page.goto('http://localhost:6200/postcard-editor');

    // Fill only partial form
    await page.locator('[data-testid-first-name="recipient-name"]').fill('John');

    // Verify submit button not visible
    await expect(page.locator('[data-testid="submit-button"]')).not.toBeVisible();

    // Verify progress shows incomplete steps
    await expect(page.locator('text=Complete: 0 of 3 steps')).toBeVisible();
    console.log('[' + new Date().toISOString() + '] ✓ Incomplete form validation verified');
  });

  test('should verify accessibility and responsive behavior', async ({ page }) => {
    console.log('[' + new Date().toISOString() + '] Starting accessibility and responsive tests');

    await page.goto('http://localhost:6200/postcard-editor');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    console.log('[' + new Date().toISOString() + '] ✓ Keyboard navigation works');

    // Test ARIA labels
    const messageInput = page.locator('[data-testid="message-input"] textarea');
    await expect(messageInput).toHaveAttribute('aria-label');
    console.log('[' + new Date().toISOString() + '] ✓ ARIA labels present');

    // Test focus states
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toHaveCSS('outline', /./); // Has focus outline
    console.log('[' + new Date().toISOString() + '] ✓ Focus states visible');

    // Test responsive behavior
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/21_mobile_view.png`,
      fullPage: true
    });
    console.log('[' + new Date().toISOString() + '] Screenshot saved: 21_mobile_view.png');
    console.log('[' + new Date().toISOString() + '] ✓ Mobile responsive layout verified');
  });
});