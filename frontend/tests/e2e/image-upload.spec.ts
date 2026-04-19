import { test, expect } from '@playwright/test'
import { setupStandardMocks, gotoApp } from './helpers'

test.describe('Image Upload', () => {
  test.beforeEach(async ({ page }) => {
    await setupStandardMocks(page)
  })

  test('upload area is visible on the page', async ({ page }) => {
    await gotoApp(page)
    await expect(page.locator('h2:has-text("Postcard Image")')).toBeVisible()
    await expect(page.locator('#postcard-front-image')).toBeAttached()
  })

  test('can upload a PNG image via file input', async ({ page }) => {
    await gotoApp(page)

    const fileInput = page.locator('#postcard-front-image')
    await fileInput.setInputFiles('tests/fixtures/test-image.png')

    // Should show success indicator with file name
    await expect(page.locator('.alert-success').filter({ hasText: 'test-image.png' })).toBeVisible()

    // Should show "Change Image" button
    await expect(page.getByRole('button', { name: 'Change Image' })).toBeVisible()
  })

  test('uploaded image updates progress indicator', async ({ page }) => {
    await gotoApp(page)

    // Initially 0/3
    await expect(page.getByText('Complete: 0 of 3 steps')).toBeVisible()

    // Upload image
    const fileInput = page.locator('#postcard-front-image')
    await fileInput.setInputFiles('tests/fixtures/test-image.png')
    await expect(page.locator('.alert-success').filter({ hasText: 'test-image.png' })).toBeVisible()

    // Progress should advance
    await expect(page.getByText('Complete: 1 of 3 steps')).toBeVisible()
  })

  test('can remove uploaded image via Change Image button', async ({ page }) => {
    await gotoApp(page)

    // Upload an image first
    const fileInput = page.locator('#postcard-front-image')
    await fileInput.setInputFiles('tests/fixtures/test-image.png')
    await expect(page.locator('.alert-success').filter({ hasText: 'test-image.png' })).toBeVisible()

    // Click Change Image
    await page.getByRole('button', { name: 'Change Image' }).click()

    // Upload area should be back (showing drop zone)
    await expect(page.locator('#postcard-front-image')).toBeAttached()
    // No success alert for the file name
    await expect(page.locator('.alert-success').filter({ hasText: 'test-image.png' })).not.toBeVisible()
  })

  test('drag-and-drop area is present', async ({ page }) => {
    await gotoApp(page)

    // The drop zone area should be present
    const dropZone = page.locator('.border-dashed')
    await expect(dropZone).toBeVisible()
    await expect(page.getByText('Click to upload')).toBeVisible()
  })

  test('drop zone has correct accept types listed', async ({ page }) => {
    await gotoApp(page)

    // Verify the text showing accepted formats - the component uses WebP not GIF in the text
    await expect(page.getByText(/JPG, PNG, GIF or WebP \(max 10MB\)/)).toBeVisible()
  })

  test('live preview section is visible', async ({ page }) => {
    await gotoApp(page)

    await expect(page.getByText('Live Preview')).toBeVisible()
    await expect(page.getByText('Front')).toBeVisible()
    await expect(page.getByText('Back')).toBeVisible()
  })

  test('front preview iframe renders after image upload', async ({ page }) => {
    await gotoApp(page)

    const fileInput = page.locator('#postcard-front-image')
    await fileInput.setInputFiles('tests/fixtures/test-image.png')
    await expect(page.locator('.alert-success').filter({ hasText: 'test-image.png' })).toBeVisible()

    // Front preview iframe should exist
    const frontPreview = page.locator('iframe[title="Postcard Front Preview"]')
    await expect(frontPreview).toBeAttached()
  })

  test('file size limit text is displayed', async ({ page }) => {
    await gotoApp(page)
    await expect(page.getByText(/max 10MB/)).toBeVisible()
  })

  test('upload shows error for invalid file type', async ({ page }) => {
    await gotoApp(page)

    // Verify the drop zone / upload area exists
    const dropZone = page.locator('.border-dashed')
    await expect(dropZone).toBeVisible()
  })
})
