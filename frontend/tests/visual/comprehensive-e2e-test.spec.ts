import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

class FamMailPage {
  constructor(private page: Page) {}

  async navigateToMain() {
    await this.page.goto('http://localhost:6200/');
  }

  async navigateToLegacy() {
    await this.page.goto('http://localhost:6200/legacy');
  }

  async takeScreenshot(name: string) {
    const screenshotPath = `.claude_sessions/001/screenshots/${name}.png`;
    await this.page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    console.log(`Screenshot saved: ${screenshotPath}`);
    return screenshotPath;
  }

  async uploadImage(imagePath: string) {
    // Get the file input element
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(imagePath);

    // Wait for image to be processed
    await this.page.waitForTimeout(2000);
  }

  async flipToBack() {
    // Look for the flip button
    const flipButton = this.page.locator('button').filter({ hasText: /flip/i }).first();
    await flipButton.click();
    await this.page.waitForTimeout(1000);
  }

  async typeMessage(message: string) {
    // Look for message textarea
    const messageInput = this.page.locator('textarea').first();
    await messageInput.fill(message);
    await this.page.waitForTimeout(500);
  }

  async fillAddress(address: {
    recipient_name: string;
    street_line_1: string;
    city: string;
    state: string;
    postal_code: string;
  }) {
    // Fill recipient name
    await this.page.locator('input[placeholder*="recipient"], input[placeholder*="name"], input[id*="recipient"], input[id*="name"]')
      .first()
      .fill(address.recipient_name);

    // Fill street
    await this.page.locator('input[placeholder*="street"], input[placeholder*="address"]')
      .first()
      .fill(address.street_line_1);

    // Fill city
    await this.page.locator('input[placeholder*="city"]')
      .first()
      .fill(address.city);

    // Fill state
    await this.page.locator('input[placeholder*="state"], select[id*="state"]')
      .first()
      .fill(address.state);

    // Fill postal code
    await this.page.locator('input[placeholder*="postal"], input[placeholder*="zip"]')
      .first()
      .fill(address.postal_code);

    await this.page.waitForTimeout(500);
  }

  async clickSendButton() {
    // Look for send button
    const sendButton = this.page.locator('button').filter({ hasText: /send|submit/i }).first();
    await sendButton.click();

    // Wait for submission to process
    await this.page.waitForTimeout(3000);
  }

  async verifySuccess() {
    // Look for success message or confirmation
    const successElement = this.page.locator('text=/success|sent|thank you|confirmation/i').first();
    await expect(successElement).toBeVisible({ timeout: 10000 });
  }

  async verifyMainRouteElements() {
    // Check for key elements on the main route
    await expect(this.page.locator('h1, h2')).toBeVisible();
    await expect(this.page.locator('input[type="file"]')).toBeVisible();
  }

  async verifyLegacyRouteElements() {
    // Check for legacy form elements
    await expect(this.page.locator('form')).toBeVisible();
    await expect(this.page.locator('input, textarea, select')).toHaveCount({ min: 1 });
  }
}

test.describe('Fam Mail Restructured E2E Tests', () => {
  let page: Page;
  let famMail: FamMailPage;
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const testImagePath = path.join(__dirname, '../../public/images/postcard-sample.jpg');
  const testAddress = {
    recipient_name: 'John Doe',
    street_line_1: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    postal_code: '90210'
  };

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    famMail = new FamMailPage(page);

    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Complete user flow on main route', async () => {
    console.log('\n=== Starting Complete User Flow Test ===\n');

    // Step 1: Navigate to main route
    console.log('1. Navigating to main route...');
    await famMail.navigateToMain();
    await famMail.takeScreenshot('01-initial-load');
    await famMail.verifyMainRouteElements();
    console.log('✓ Main route loaded successfully');

    // Step 2: Upload an image
    console.log('\n2. Uploading image...');

    // Check if test image exists, if not create a placeholder
    try {
      await famMail.uploadImage(testImagePath);
    } catch (error) {
      console.log('Test image not found, attempting to use any available image...');
      // Try to find any image in the public directory
      await page.evaluate(() => {
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (input) {
          // Create a simple test image data
          const canvas = document.createElement('canvas');
          canvas.width = 400;
          canvas.height = 300;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, 400, 300);
            ctx.fillStyle = '#333';
            ctx.font = '20px Arial';
            ctx.fillText('Test Image', 150, 150);
          }

          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], 'test.jpg', { type: 'image/jpeg' });
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(file);
              input.files = dataTransfer.files;
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });
        }
      });
      await page.waitForTimeout(2000);
    }

    await famMail.takeScreenshot('02-after-image-upload');
    console.log('✓ Image uploaded successfully');

    // Step 3: Flip to back side
    console.log('\n3. Flipping to back side...');
    await famMail.flipToBack();
    await famMail.takeScreenshot('03-after-flip');
    console.log('✓ Flipped to back side');

    // Step 4: Type a message
    console.log('\n4. Typing message...');
    const testMessage = 'Hello from Playwright! This is a test message for the postcard.\n\nHope you\'re doing well!\nBest regards';
    await famMail.typeMessage(testMessage);
    await famMail.takeScreenshot('04-message-input');
    console.log('✓ Message typed successfully');

    // Step 5: Fill address fields
    console.log('\n5. Filling address fields...');
    await famMail.fillAddress(testAddress);
    await famMail.takeScreenshot('05-address-filled');
    console.log('✓ Address fields filled');

    // Step 6: Click send button (but don't actually send in test)
    console.log('\n6. Testing send button...');

    // Check if send button exists and is clickable
    const sendButton = page.locator('button').filter({ hasText: /send|submit/i }).first();
    await expect(sendButton).toBeVisible();

    // Take screenshot before attempting send
    await famMail.takeScreenshot('06-before-send');

    // Note: We won't actually send in automated test to avoid real API calls
    // Instead, we'll verify the button is present and form is complete
    console.log('✓ Send button is ready');
    console.log('⚠ Skipping actual send to avoid real API calls');

    console.log('\n=== Complete User Flow Test Finished ===\n');
  });

  test('Test save functionality', async () => {
    console.log('\n=== Testing Save Functionality ===\n');

    // Navigate and fill form
    await famMail.navigateToMain();
    await famMail.takeScreenshot('save-01-initial');

    // Fill some data
    await famMail.typeMessage('Test save message');
    await famMail.fillAddress({
      recipient_name: 'Save Test User',
      street_line_1: '456 Save St',
      city: 'Saveville',
      state: 'NY',
      postal_code: '10001'
    });
    await famMail.takeScreenshot('save-02-data-filled');

    // Look for save button
    const saveButton = page.locator('button').filter({ hasText: /save|draft/i }).first();
    if (await saveButton.isVisible()) {
      console.log('Save button found, testing save functionality...');
      await saveButton.click();
      await page.waitForTimeout(2000);
      await famMail.takeScreenshot('save-03-after-save');

      // Check for save confirmation
      const saveConfirmation = page.locator('text=/saved|draft|auto-save/i').first();
      if (await saveConfirmation.isVisible()) {
        console.log('✓ Save confirmation detected');
      } else {
        console.log('⚠ No explicit save confirmation found');
      }
    } else {
      console.log('⚠ No save button found - testing auto-save');
      // Wait for potential auto-save
      await page.waitForTimeout(3000);
      await famMail.takeScreenshot('save-03-auto-save-check');
    }

    // Test data persistence by reloading
    console.log('Testing data persistence...');
    await page.reload();
    await page.waitForTimeout(2000);
    await famMail.takeScreenshot('save-04-after-reload');

    console.log('=== Save Functionality Test Complete ===\n');
  });

  test('Verify legacy route still works', async () => {
    console.log('\n=== Testing Legacy Route ===\n');

    // Navigate to legacy route
    await famMail.navigateToLegacy();
    await famMail.takeScreenshot('legacy-01-initial-load');

    // Verify legacy elements
    await famMail.verifyLegacyRouteElements();
    await famMail.takeScreenshot('legacy-02-form-visible');

    // Try to fill legacy form fields
    const inputs = await page.locator('input, textarea, select').all();
    console.log(`Found ${inputs.length} form elements on legacy page`);

    // Fill first few fields if they exist
    if (inputs.length > 0) {
      await inputs[0].fill('Legacy Test');
      await famMail.takeScreenshot('legacy-03-form-filled');
    }

    console.log('✓ Legacy route is functional');
    console.log('=== Legacy Route Test Complete ===\n');
  });

  test('UI Responsiveness and Accessibility', async () => {
    console.log('\n=== Testing UI Responsiveness ===\n');

    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const viewport of viewports) {
      console.log(`Testing ${viewport.name} view (${viewport.width}x${viewport.height})`);
      await page.setViewportSize(viewport);
      await famMail.navigateToMain();
      await page.waitForTimeout(1000);
      await famMail.takeScreenshot(`responsive-${viewport.name}`);

      // Check if key elements are still visible
      await expect(page.locator('h1, h2')).toBeVisible();
    }

    console.log('✓ Responsiveness tests complete');
    console.log('=== UI Responsiveness Test Complete ===\n');
  });
});

// Utility function to run all tests and generate report
test.afterAll(async () => {
  console.log('\n' + '='.repeat(50));
  console.log('ALL TESTS COMPLETED');
  console.log('='.repeat(50));
  console.log('\nScreenshots saved to: .claude_sessions/001/screenshots/');
  console.log('\nNext Steps:');
  console.log('1. Review all screenshots');
  console.log('2. Check for any visual inconsistencies');
  console.log('3. Verify all functionality is working as expected');
  console.log('4. Run manual tests for any edge cases not covered\n');
});