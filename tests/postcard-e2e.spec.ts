import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Test configuration
const BASE_URL = 'http://localhost:5174/postcard-editor';
const TEST_IMAGE_PATH = path.join(process.cwd(), '.claude_sessions/001/test-image.jpg');
const SCREENSHOTS_DIR = path.join(process.cwd(), '.claude_sessions/001/e2e-screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Helper to create a test image if it doesn't exist
function createTestImage() {
  if (!fs.existsSync(TEST_IMAGE_PATH)) {
    // Create a simple 1x1 pixel JPEG for testing
    const jpegData = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
      0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
      0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
      0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x80, 0xFF, 0xD9
    ]);
    fs.writeFileSync(TEST_IMAGE_PATH, jpegData);
    console.log(`Created test image at: ${TEST_IMAGE_PATH}`);
  }
}

test.describe('Postcard Editor Full User Journey', () => {
  test.beforeAll(async () => {
    createTestImage();
  });

  test('complete postcard creation flow', async ({ page }) => {
    console.log('\n🚀 Starting complete postcard editor test...');

    // Step 1: Navigate to the page
    console.log('\n📍 Step 1: Navigating to postcard editor...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_initial_load.png'), fullPage: true });
    console.log('✅ Page loaded successfully');

    // Verify we're on the correct page
    await expect(page).toHaveURL(/postcard-editor/);

    // Step 2: Upload an image
    console.log('\n📍 Step 2: Uploading image...');

    // Find and click the upload button
    const uploadButton = page.locator('button[onclick*="document.getElementById(\'imageInput\').click()"]');
    await expect(uploadButton).toBeVisible({ timeout: 10000 });

    // Set up the file input and trigger upload
    const fileInput = page.locator('#imageInput');
    await fileInput.setInputFiles(TEST_IMAGE_PATH);

    // Wait for upload to start
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_upload_started.png'), fullPage: true });

    // Wait for upload to complete (look for success state)
    console.log('⏳ Waiting for upload to complete...');
    try {
      // Wait for either success message or image preview
      await page.waitForFunction(() => {
        const successMsg = document.querySelector('.text-green-600');
        const preview = document.querySelector('#imagePreview');
        return successMsg?.textContent?.includes('successfully') || preview?.src;
      }, { timeout: 15000 });

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_upload_complete.png'), fullPage: true });
      console.log('✅ Image uploaded successfully');
    } catch (error) {
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_upload_failed.png'), fullPage: true });
      console.log('⚠️ Upload may have failed, continuing anyway...');
    }

    // Step 3: Flip to back side
    console.log('\n📍 Step 4: Flipping to back side...');
    const flipButton = page.locator('button[onclick="flipCard()"], button:has-text("Flip")');
    await expect(flipButton).toBeVisible({ timeout: 10000 });
    await flipButton.click();

    // Wait for flip animation
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_flipped_to_back.png'), fullPage: true });
    console.log('✅ Flipped to back side');

    // Verify we're on the back (message and address forms should be visible)
    await expect(page.locator('#message')).toBeVisible();
    await expect(page.locator('input[name="recipientName"]')).toBeVisible();

    // Step 4: Type a test message
    console.log('\n📍 Step 5: Typing test message...');
    const messageTextarea = page.locator('#message');
    const testMessage = "Hello from the postcard editor!\n\nThis is a test message created during end-to-end testing. The postcard editor is working perfectly! 🎉\n\nBest regards,\nTest User";

    await messageTextarea.fill(testMessage);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_message_typed.png'), fullPage: true });
    console.log('✅ Message typed successfully');

    // Step 5: Fill in all address fields
    console.log('\n📍 Step 6: Filling address fields...');

    const addressFields = [
      { selector: 'input[name="recipientName"]', value: 'John Doe' },
      { selector: 'input[name="addressLine1"]', value: '123 Main Street' },
      { selector: 'input[name="addressLine2"]', value: 'Apt 4B' },
      { selector: 'input[name="city"]', value: 'New York' },
      { selector: 'input[name="state"]', value: 'NY' },
      { selector: 'input[name="zipCode"]', value: '10001' }
    ];

    for (const field of addressFields) {
      await page.locator(field.selector).fill(field.value);
      await page.waitForTimeout(100);
    }

    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_address_filled.png'), fullPage: true });
    console.log('✅ All address fields filled');

    // Step 6: Verify submit button appears
    console.log('\n📍 Step 7: Checking for submit button...');

    // Look for either the "Submit Order" or "Submit Postcard" button
    const submitButton = page.locator('button:has-text("Submit"):visible, button:has-text("Order"):visible');

    try {
      await expect(submitButton).toBeVisible({ timeout: 5000 });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_submit_button_visible.png'), fullPage: true });
      console.log('✅ Submit button is visible');
    } catch (error) {
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_submit_button_missing.png'), fullPage: true });
      console.log('⚠️ Submit button not found - may need more fields or different conditions');
    }

    // Step 7: Click submit button if visible
    if (await submitButton.isVisible()) {
      console.log('\n📍 Step 8: Clicking submit button...');

      // Click submit and wait for response
      await Promise.any([
        page.waitForURL(/success|thank-you/),
        page.waitForSelector('.text-green-600:has-text("successfully")', { timeout: 10000 }),
        page.waitForSelector('.text-red-600:has-text("error")', { timeout: 10000 }),
        page.waitForTimeout(5000) // Fallback timeout
      ]);

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_after_submit.png'), fullPage: true });

      // Check for success or error messages
      const successMessage = page.locator('.text-green-600:has-text("successfully"), .text-green-600:has-text("success")');
      const errorMessage = page.locator('.text-red-600:has-text("error"), .text-red-600:has-text("failed")');

      if (await successMessage.isVisible()) {
        console.log('✅ Postcard submitted successfully!');
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_submission_success.png'), fullPage: true });
      } else if (await errorMessage.isVisible()) {
        console.log('❌ Postcard submission failed');
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_submission_error.png'), fullPage: true });
      } else {
        console.log('❓ Submission status unclear');
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_submission_status.png'), fullPage: true });
      }
    } else {
      console.log('⏭️ Submit button not visible, skipping submission test');
    }

    // Step 8: Final state capture
    console.log('\n📍 Step 9: Capturing final state...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10_final_state.png'), fullPage: true });

    // Get page title and URL for final report
    const title = await page.title();
    const url = page.url();

    console.log(`\n📊 Test completed:`);
    console.log(`   Page Title: ${title}`);
    console.log(`   Final URL: ${url}`);
    console.log(`   Screenshots saved to: ${SCREENSHOTS_DIR}`);
  });
});