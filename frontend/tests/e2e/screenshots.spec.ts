import { test, expect } from '@playwright/test'
import { setupStandardMocks, gotoApp } from './helpers'

test.describe('Screenshot Regression Tests', () => {
  // Only run screenshot tests on desktop chromium to avoid flakiness
  test.skip(({ browserName }) => browserName !== 'chromium', 'Screenshot tests only on Chromium')
  test.skip(({ isMobile }) => isMobile, 'Screenshot tests only on desktop')

  test.beforeEach(async ({ page }) => {
    await setupStandardMocks(page)
  })

  test('homepage empty state', async ({ page }) => {
    await gotoApp(page)

    // Wait for everything to be stable
    await expect(page.locator('h1')).toContainText('Fam Mail')

    await expect(page).toHaveScreenshot('homepage-empty-state.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.05,
    })
  })

  test('address form section', async ({ page }) => {
    await gotoApp(page)
    await page.locator('h2:has-text("Recipient Address")').scrollIntoViewIfNeeded()

    const addressCard = page.locator('.bg-base-100.shadow-xl').first()
    await expect(addressCard).toBeVisible()

    await expect(addressCard).toHaveScreenshot('address-form-empty.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.05,
    })
  })

  test('address form filled', async ({ page }) => {
    await gotoApp(page)

    await page.locator('input[placeholder="John"]').fill('John')
    await page.locator('input[placeholder="Doe"]').fill('Doe')
    await page.locator('input[placeholder="123 Main Street"]').fill('123 Main Street')
    await page.locator('input[placeholder="Apt 4B (optional)"]').fill('Apt 4B')
    await page.locator('input[placeholder="City"]').fill('Toronto')
    await page.locator('input[placeholder="Province/State"]').fill('ON')
    await page.locator('input[placeholder="Postal/Zip Code"]').fill('M5H 2N2')

    const addressCard = page.locator('.bg-base-100.shadow-xl').first()
    await expect(addressCard).toHaveScreenshot('address-form-filled.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.05,
    })
  })

  test('image upload section', async ({ page }) => {
    await gotoApp(page)
    await page.locator('h2:has-text("Postcard Image")').scrollIntoViewIfNeeded()

    // Find the card that contains the image upload section
    const imageSection = page.locator('h2:has-text("Postcard Image")').locator('..').locator('..')
    await expect(imageSection).toBeVisible()

    await expect(imageSection).toHaveScreenshot('image-upload-empty.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.05,
    })
  })

  test('image uploaded state', async ({ page }) => {
    await gotoApp(page)

    const fileInput = page.locator('#postcard-front-image')
    await fileInput.setInputFiles('tests/fixtures/test-image.png')
    await expect(page.locator('.alert-success').filter({ hasText: 'test-image.png' })).toBeVisible()

    // Find the upload section card
    const imageSection = page.locator('h3:has-text("Upload Image")').locator('..')
    await expect(imageSection).toBeVisible()

    await expect(imageSection).toHaveScreenshot('image-uploaded.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.05,
    })
  })

  test('ready to send state', async ({ page }) => {
    await gotoApp(page)

    // Fill all required fields to get "Ready to Send"
    await page.locator('input[placeholder="John"]').fill('John')
    await page.locator('input[placeholder="Doe"]').fill('Doe')
    await page.locator('input[placeholder="123 Main Street"]').fill('123 Main Street')
    await page.locator('input[placeholder="City"]').fill('Toronto')
    await page.locator('input[placeholder="Province/State"]').fill('ON')
    await page.locator('input[placeholder="Postal/Zip Code"]').fill('M5H 2N2')
    await page.getByRole('button', { name: 'Save Address' }).click()

    const editorTextarea = page.locator('.w-md-editor textarea').first()
    await editorTextarea.click()
    await editorTextarea.fill('Hello from fam-mail!')

    const fileInput = page.locator('#postcard-front-image')
    await fileInput.setInputFiles('tests/fixtures/test-image.png')

    await expect(page.getByText('Ready to Send!')).toBeVisible()

    await expect(page).toHaveScreenshot('ready-to-send.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.05,
    })
  })
})
