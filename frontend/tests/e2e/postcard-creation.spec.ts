import { test, expect } from '@playwright/test'
import {
  setupStandardMocks,
  mockPostcardSubmit,
  gotoApp,
  fillValidAddress,
  uploadTestImage,
  writeMessage,
} from './helpers'

test.describe('Postcard Creation Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    await setupStandardMocks(page)
    await mockPostcardSubmit(page)
  })

  test('complete postcard creation flow: fill address, upload image, write message, submit', async ({ page }) => {
    await gotoApp(page)

    // Step 1: Fill address
    await fillValidAddress(page)
    // Progress should update after saving address
    await expect(page.getByText('Complete: 1 of 3 steps')).toBeVisible()

    // Step 2: Write a message
    await writeMessage(page, 'Hello from the E2E test! This is a postcard message.')
    await expect(page.getByText('Complete: 2 of 3 steps')).toBeVisible()

    // Step 3: Upload an image
    await uploadTestImage(page)
    // Wait for image to be processed
    await expect(page.locator('.alert-success').filter({ hasText: 'test-image.png' })).toBeVisible()

    // All steps complete - "Ready to Send" card should appear
    await expect(page.getByText('Ready to Send!')).toBeVisible()
    await expect(page.getByText(/Your postcard will be sent to John Doe in Toronto, ON/)).toBeVisible()

    // Submit the postcard
    await page.getByRole('button', { name: 'Send Postcard' }).click()

    // Should show success state
    await expect(page.locator('.badge-success').first()).toContainText('Postcard Sent Successfully')
    await expect(page.getByText('postcard_test_mock123')).toBeVisible()
    await expect(page.getByText('Test Mode')).toBeVisible()

    // Verify postcard details are displayed
    await expect(page.getByText('6x4')).toBeVisible()
    await expect(page.getByText('No (Test)')).toBeVisible()

    // Verify recipient info
    await expect(page.getByText('John Doe')).toBeVisible()
    await expect(page.getByText('123 Main Street')).toBeVisible()
  })

  test('create another postcard resets the form', async ({ page }) => {
    await gotoApp(page)
    await fillValidAddress(page)
    await writeMessage(page, 'Test message')
    await uploadTestImage(page)
    await expect(page.getByText('Ready to Send!')).toBeVisible()

    await page.getByRole('button', { name: 'Send Postcard' }).click()
    await expect(page.locator('.badge-success').first()).toContainText('Postcard Sent Successfully')

    // Click "Create Another Postcard"
    await page.getByRole('button', { name: 'Create Another Postcard' }).click()

    // Form should be reset - back to builder view
    await expect(page.locator('h2:has-text("Create Your Postcard")')).toBeVisible()
    await expect(page.getByText('Complete: 0 of 3 steps')).toBeVisible()
  })

  test('progress bar advances correctly through steps', async ({ page }) => {
    await gotoApp(page)

    // Initially 0/3
    await expect(page.getByText('Complete: 0 of 3 steps')).toBeVisible()

    // After address: 1/3
    await fillValidAddress(page)
    await expect(page.getByText('Complete: 1 of 3 steps')).toBeVisible()

    // After message: 2/3
    await writeMessage(page, 'Hello!')
    await expect(page.getByText('Complete: 2 of 3 steps')).toBeVisible()

    // After image: 3/3 - ready to send
    await uploadTestImage(page)
    await expect(page.getByText('Ready to Send!')).toBeVisible()
  })

  test('send button shows loading state during submission', async ({ page }) => {
    // Use a delayed mock to see the loading state
    await page.route('**/api/postcards', async (route) => {
      if (route.request().method() === 'POST') {
        await new Promise(resolve => setTimeout(resolve, 500))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            testMode: true,
            postcard: {
              id: 'postcard_test_delayed',
              object: 'postcard',
              live: false,
              to: { firstName: 'John', lastName: 'Doe', addressLine1: '123 Main St', city: 'Toronto', provinceOrState: 'ON', postalOrZip: 'M5H2N2', countryCode: 'CA' },
              from: { firstName: 'S', lastName: 'S', addressLine1: '1 St', city: 'Vancouver', provinceOrState: 'BC', postalOrZip: 'V6B1A1', countryCode: 'CA' },
              size: '6x4',
              status: 'ready',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }),
        })
      } else {
        await route.continue()
      }
    })

    await gotoApp(page)
    await fillValidAddress(page)
    await writeMessage(page, 'Test')
    await uploadTestImage(page)
    await expect(page.getByText('Ready to Send!')).toBeVisible()

    await page.getByRole('button', { name: 'Send Postcard' }).click()

    // Should show loading state
    await expect(page.getByText('Sending...')).toBeVisible()
    await expect(page.locator('.loading-spinner')).toBeVisible()

    // Then should complete
    await expect(page.locator('.badge-success').first()).toContainText('Postcard Sent Successfully')
  })

  test('submission error shows error alert', async ({ page }) => {
    await page.route('**/api/postcards', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Address validation failed',
          }),
        })
      } else {
        await route.continue()
      }
    })

    await gotoApp(page)
    await fillValidAddress(page)
    await writeMessage(page, 'Test')
    await uploadTestImage(page)
    await expect(page.getByText('Ready to Send!')).toBeVisible()

    await page.getByRole('button', { name: 'Send Postcard' }).click()

    // Should show error message
    await expect(page.locator('.alert-error').filter({ hasText: 'Address validation failed' })).toBeVisible()
  })
})
