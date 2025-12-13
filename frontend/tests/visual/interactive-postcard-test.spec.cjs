const { test, expect } = require('@playwright/test');

test.describe('Postcard Editor Interactive Functionality', () => {
  test('full user interaction flow', async ({ page }) => {
    // Navigate to the main route
    await page.goto('http://localhost:5173/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Take initial screenshot
    await page.screenshot({
      path: '.claude_sessions/001/01_initial_load.png',
      fullPage: true
    });

    // Step 1: Upload an image
    console.log('Step 1: Uploading image...');

    // Find and click the dropzone to activate it
    const dropzone = page.locator('.dropzone').first();
    await expect(dropzone).toBeVisible({ timeout: 10000 });

    // Click the dropzone first
    await dropzone.click();

    // Then find the hidden file input and upload a test image
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    // Create a simple test image buffer (1x1 PNG)
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    );

    await fileInput.setInputFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: testImageBuffer
    });

    // Wait for image upload to complete
    await page.waitForTimeout(2000);

    // Verify image is uploaded
    const uploadedImage = page.locator('.preview-image img');
    await expect(uploadedImage).toBeVisible({ timeout: 5000 });

    // Screenshot after image upload
    await page.screenshot({
      path: '.claude_sessions/001/02_after_image_upload.png',
      fullPage: true
    });

    // Step 2: Click the flip button to see the back
    console.log('Step 2: Flipping to back side...');

    // Find the flip button (should be visible after image upload)
    const flipButton = page.locator('button:has-text("Flip to see message")').or(
      page.locator('[data-testid="flip-button"]')
    ).or(
      page.locator('button').filter({ hasText: /flip/i })
    );

    await expect(flipButton).toBeVisible({ timeout: 5000 });
    await flipButton.click();

    // Wait for flip animation
    await page.waitForTimeout(1000);

    // Screenshot after flipping
    await page.screenshot({
      path: '.claude_sessions/001/03_after_flip.png',
      fullPage: true
    });

    // Step 3: Type a message in the message area
    console.log('Step 3: Typing message...');

    // Try multiple selectors for the message textarea
    let messageTextarea = page.locator('.cm-editor textarea').first().or(
      page.locator('[data-testid="message-textarea"]')
    ).or(
      page.locator('textarea').filter({ hasText: '' })
    );

    // If still not found, try to find any textarea in the postcard area
    const allTextareas = await page.locator('textarea').count();
    if (allTextareas === 0) {
      // Try clicking on the message area to activate the editor
      const messageArea = page.locator('.postcard-back').or(
        page.locator('.message-area')
      ).or(
        page.locator('[data-testid="message-area"]')
      );

      if (await messageArea.isVisible()) {
        await messageArea.click();
        await page.waitForTimeout(500);
        messageTextarea = page.locator('.cm-editor textarea').first();
      }
    }

    await expect(messageTextarea).toBeVisible({ timeout: 5000 });
    await messageTextarea.click();
    await messageTextarea.fill('Hello from the other side! This is a test message for the postcard. I hope you enjoy it!');

    // Wait for the editor to process the input
    await page.waitForTimeout(1000);

    // Screenshot after typing message
    await page.screenshot({
      path: '.claude_sessions/001/04_after_message.png',
      fullPage: true
    });

    // Step 4: Fill in address fields
    console.log('Step 4: Filling address fields...');

    // Define address field selectors based on labels
    const addressFields = [
      { label: /send to/i, value: 'John Doe', placeholder: /recipient/i },
      { label: /street/i, value: '123 Main St', placeholder: /street/i },
      { label: /city|town/i, value: 'Anytown', placeholder: /city/i },
      { label: /state|province/i, value: 'CA', placeholder: /state/i },
      { label: /zip|postal/i, value: '12345', placeholder: /zip/i }
    ];

    for (const field of addressFields) {
      // Try to find input by label
      let input = page.locator('input').filter({ hasText: field.label }).first().or(
        page.locator(`input[placeholder*="${field.placeholder.source}"]`)
      ).or(
        page.locator('input').filter({ has: page.locator(`text=${field.label}`) })
      );

      const inputCount = await input.count();
      if (inputCount > 0) {
        await input.first().click();
        await input.first().fill(field.value);
        await page.waitForTimeout(200);
      }
    }

    // Alternative approach: Find all address inputs and fill them
    const addressInputs = page.locator('.address-form input, .address-fields input, input[placeholder*="name"], input[placeholder*="street"], input[placeholder*="city"], input[placeholder*="state"], input[placeholder*="zip"]');
    const inputCount = await addressInputs.count();

    if (inputCount > 0) {
      const addressValues = ['John Doe', '123 Main St', 'Anytown', 'CA', '12345'];
      for (let i = 0; i < Math.min(inputCount, addressValues.length); i++) {
        await addressInputs.nth(i).click();
        await addressInputs.nth(i).fill(addressValues[i]);
        await page.waitForTimeout(200);
      }
    }

    // Screenshot after filling address
    await page.screenshot({
      path: '.claude_sessions/001/05_after_address.png',
      fullPage: true
    });

    // Step 5: Click the send button
    console.log('Step 5: Clicking send button...');

    // Find the send button
    const sendButton = page.locator('button:has-text("Send")').or(
      page.locator('button:has-text("Send Postcard")')
    ).or(
      page.locator('[data-testid="send-button"]')
    ).or(
      page.locator('button').filter({ hasText: /send/i })
    );

    // Check if send button is visible and enabled
    const sendButtonVisible = await sendButton.isVisible();

    if (sendButtonVisible) {
      // Check if button is disabled
      const isDisabled = await sendButton.isDisabled();

      if (isDisabled) {
        console.log('Send button is disabled - checking form validation...');

        // Check for any validation errors
        const errorMessages = page.locator('.error-message, .validation-error, [role="alert"]');
        const errorCount = await errorMessages.count();

        if (errorCount > 0) {
          console.log(`Found ${errorCount} validation error(s)`);
          for (let i = 0; i < errorCount; i++) {
            const errorText = await errorMessages.nth(i).textContent();
            console.log(`Error ${i + 1}: ${errorText}`);
          }
        }
      } else {
        await sendButton.click();

        // Wait for any response
        await page.waitForTimeout(3000);

        // Check for success message or navigation
        const successMessage = page.locator('text=/success|sent|thank you/i').or(
          page.locator('.success-message, .notification.success')
        );

        const successVisible = await successMessage.isVisible();

        if (successVisible) {
          console.log('✅ Postcard sent successfully!');
        } else {
          console.log('Send button clicked, but no success message detected');
        }
      }
    } else {
      console.log('Send button not found - may need to flip back to front or complete more fields');
    }

    // Final screenshot
    await page.screenshot({
      path: '.claude_sessions/001/06_final_state.png',
      fullPage: true
    });

    // Step 6: Test draft save functionality
    console.log('Step 6: Testing draft save...');

    // Look for save draft button
    const saveDraftButton = page.locator('button:has-text("Save")').or(
      page.locator('[data-testid="save-draft"]')
    ).or(
      page.locator('button').filter({ hasText: /save|draft/i })
    );

    if (await saveDraftButton.isVisible()) {
      await saveDraftButton.click();
      await page.waitForTimeout(1000);
      console.log('Draft save attempted');

      await page.screenshot({
        path: '.claude_sessions/001/07_after_save_draft.png',
        fullPage: true
      });
    } else {
      console.log('No save draft button found');
    }

    // Log page state for debugging
    console.log('Final page state:');
    console.log('URL:', page.url());

    // Check console for any errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
      }
    });

    // Check for any network requests
    const responses = [];
    page.on('response', (response) => {
      if (response.url().includes('/api/') || response.url().includes('/postcard')) {
        responses.push({
          url: response.url(),
          status: response.status()
        });
      }
    });

    await page.waitForTimeout(2000);

    console.log('Network requests:', responses);
  });

  test('debug DOM structure', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');

    // Log the DOM structure for debugging
    const postcardElement = await page.locator('.postcard-container, .postcard, [data-testid="postcard"]').first();
    if (await postcardElement.isVisible()) {
      const innerHTML = await postcardElement.innerHTML();
      console.log('Postcard HTML structure:', innerHTML.substring(0, 1000));
    }

    // List all buttons
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} buttons:`);
    for (let i = 0; i < Math.min(buttons.length, 10); i++) {
      const text = await buttons[i].textContent();
      console.log(`Button ${i}: "${text}"`);
    }

    // List all inputs
    const inputs = await page.locator('input, textarea').all();
    console.log(`Found ${inputs.length} input fields:`);
    for (let i = 0; i < Math.min(inputs.length, 10); i++) {
      const placeholder = await inputs[i].getAttribute('placeholder');
      const type = await inputs[i].getAttribute('type');
      console.log(`Input ${i}: type="${type}", placeholder="${placeholder}"`);
    }
  });
});