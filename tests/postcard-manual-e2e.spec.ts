import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Test configuration
const BASE_URL = 'http://localhost:5174/postcard-editor';
const TEST_IMAGE_PATH = path.join(process.cwd(), '.claude_sessions/001/test-image.jpg');
const SCREENSHOTS_DIR = path.join(process.cwd(), '.claude_sessions/001/manual-e2e-screenshots');

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

test.describe('Postcard Editor Manual E2E Test', () => {
  test.beforeAll(async () => {
    createTestImage();
  });

  test('complete postcard creation flow - Manual Testing', async ({ page }) => {
    console.log('\n🚀 Starting manual postcard editor test...');

    // Step 1: Navigate to the page
    console.log('\n📍 Step 1: Navigating to postcard editor...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_initial_load.png'), fullPage: true });
    console.log('✅ Page loaded successfully');

    // Step 2: Check if we're on the correct page
    await expect(page).toHaveURL(/postcard-editor/);

    // Step 3: Upload an image
    console.log('\n📍 Step 2: Looking for image upload interface...');

    // Try different selectors for the image upload
    const uploadSelectors = [
      '#imageInput',
      'input[type="file"]',
      'button:has-text("Upload")',
      'button:has-text("Select")',
      'button:has-text("Choose")',
      '[data-testid="upload-button"]'
    ];

    let fileInput = null;
    for (const selector of uploadSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          console.log(`Found upload element with selector: ${selector}`);
          fileInput = element;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (fileInput) {
      // If it's a button, look for the associated file input
      if (await fileInput.getAttribute('type') !== 'file') {
        // Try to find hidden file input
        fileInput = page.locator('input[type="file"]').first();
      }

      if (await fileInput.isVisible() || await fileInput.count() > 0) {
        await fileInput.setInputFiles(TEST_IMAGE_PATH);
        console.log('✅ Image upload initiated');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_image_uploaded.png'), fullPage: true });
      }
    } else {
      console.log('⚠️ Could not find image upload interface');
    }

    // Step 4: Look for flip button
    console.log('\n📍 Step 3: Looking for flip button...');
    const flipSelectors = [
      'button:has-text("Flip")',
      'button:has-text("flip")',
      'button[onclick*="flip"]',
      '[data-testid="flip-button"]',
      'button:has(.bi-arrow-left-right)' // Bootstrap flip icon
    ];

    let flipButton = null;
    for (const selector of flipSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          flipButton = element;
          console.log(`Found flip button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (flipButton) {
      await flipButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_flipped_to_back.png'), fullPage: true });
      console.log('✅ Flipped to back side');
    } else {
      console.log('⚠️ Could not find flip button');
    }

    // Step 5: Fill in message
    console.log('\n📍 Step 4: Looking for message input...');
    const messageSelectors = [
      '#message',
      'textarea[name="message"]',
      'textarea:visible',
      '[data-testid="message-input"]'
    ];

    let messageInput = null;
    for (const selector of messageSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          messageInput = element;
          console.log(`Found message input with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (messageInput) {
      await messageInput.fill('Hello! This is a test message from the postcard editor. Testing complete functionality! 🎉');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_message_filled.png'), fullPage: true });
      console.log('✅ Message filled');
    } else {
      console.log('⚠️ Could not find message input');
    }

    // Step 6: Fill in address fields
    console.log('\n📍 Step 5: Looking for address fields...');
    const addressFields = [
      { name: 'recipientName', selector: 'input[name*="name"], input[name*="recipient"]', value: 'John Doe' },
      { name: 'addressLine1', selector: 'input[name*="address"], input[name*="street"]', value: '123 Main Street' },
      { name: 'city', selector: 'input[name*="city"]', value: 'New York' },
      { name: 'state', selector: 'input[name*="state"], input[name*="province"]', value: 'NY' },
      { name: 'zipCode', selector: 'input[name*="zip"], input[name*="postal"]', value: '10001' }
    ];

    let filledFields = 0;
    for (const field of addressFields) {
      const selectors = field.selector.split(', ');
      for (const selector of selectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 1000 })) {
            await element.fill(field.value);
            filledFields++;
            console.log(`✅ Filled ${field.name}: ${field.value}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
    }

    if (filledFields > 0) {
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_address_filled.png'), fullPage: true });
      console.log(`✅ Filled ${filledFields} address fields`);
    } else {
      console.log('⚠️ Could not find address fields');
    }

    // Step 7: Look for submit button
    console.log('\n📍 Step 6: Looking for submit button...');
    const submitSelectors = [
      'button:has-text("Submit")',
      'button:has-text("Send")',
      'button:has-text("Order")',
      'button:has-text("Create")',
      'button[type="submit"]',
      '[data-testid="submit-button"]',
      '[data-testid="send-button"]'
    ];

    let submitButton = null;
    for (const selector of submitSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          submitButton = element;
          console.log(`Found submit button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (submitButton) {
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_submit_button_found.png'), fullPage: true });
      console.log('✅ Submit button found');

      // Check if button is enabled
      const isEnabled = await submitButton.isEnabled();
      console.log(`Submit button enabled: ${isEnabled}`);

      if (isEnabled) {
        console.log('\n📍 Step 7: Clicking submit button...');
        await submitButton.click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_after_submit.png'), fullPage: true });
        console.log('✅ Submit button clicked');
      } else {
        console.log('⚠️ Submit button is disabled');
      }
    } else {
      console.log('⚠️ Could not find submit button');
    }

    // Step 8: Final state
    console.log('\n📍 Step 8: Capturing final state...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_final_state.png'), fullPage: true });

    // Look for any success or error messages
    const successSelectors = [
      '.text-green-600',
      '.success',
      '[data-testid="success"]',
      'text=success',
      'text=successfully',
      'text=thank you',
      'text=order placed'
    ];

    const errorSelectors = [
      '.text-red-600',
      '.error',
      '[data-testid="error"]',
      'text=error',
      'text=failed',
      'text=invalid'
    ];

    let hasSuccess = false;
    let hasError = false;

    for (const selector of successSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          hasSuccess = true;
          console.log(`✅ Found success message: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue
      }
    }

    for (const selector of errorSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          hasError = true;
          console.log(`❌ Found error message: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue
      }
    }

    // Final report
    console.log('\n📊 Test Summary:');
    console.log(`   - Image upload: ${fileInput ? '✅ Found' : '❌ Not found'}`);
    console.log(`   - Flip button: ${flipButton ? '✅ Found' : '❌ Not found'}`);
    console.log(`   - Message input: ${messageInput ? '✅ Found' : '❌ Not found'}`);
    console.log(`   - Address fields: ${filledFields > 0 ? `✅ Found ${filledFields}` : '❌ Not found'}`);
    console.log(`   - Submit button: ${submitButton ? '✅ Found' : '❌ Not found'}`);
    console.log(`   - Submit enabled: ${submitButton ? (await submitButton.isEnabled() ? '✅ Yes' : '❌ No') : 'N/A'}`);
    console.log(`   - Success message: ${hasSuccess ? '✅ Yes' : '❌ No'}`);
    console.log(`   - Error message: ${hasError ? '❌ Yes' : '✅ No'}`);
    console.log(`   - Screenshots saved to: ${SCREENSHOTS_DIR}`);

    // Log page content for debugging
    const pageTitle = await page.title();
    const pageUrl = page.url();
    console.log(`\n📄 Page Info:`);
    console.log(`   Title: ${pageTitle}`);
    console.log(`   URL: ${pageUrl}`);
  });
});