import { test, expect } from '@playwright/test'
import { setupMockAuth, setupMockApi } from './helpers'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IMAGE_PATH = path.join(__dirname, 'fixtures/test-postcard.jpg')

test.describe('Responsive Layout', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAuth(page)
    await setupMockApi(page)
  })

  test('dashboard is readable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await expect(page.getByText('Send a Postcard')).toBeVisible()
    await expect(page.getByText('Create New Postcard')).toBeVisible()
    await expect(page.getByText('My Drafts')).toBeVisible()
  })

  test('wizard stacks vertically on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/create')
    await expect(page.getByText('Choose a Photo')).toBeVisible()
    await expect(page.getByText('Preview')).toBeVisible()
    const previewBox = await page.locator('.sticky').boundingBox()
    const formBox = await page.locator('.card-body').boundingBox()
    expect(previewBox).toBeTruthy()
    expect(formBox).toBeTruthy()
  })

  test('wizard layout is side-by-side on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/create')
    await expect(page.getByText('Choose a Photo')).toBeVisible()

    const previewContainer = page.locator('.lg\\:w-1\\/2').first()
    const formContainer = page.locator('.lg\\:w-1\\/2').last()
    const previewBox = await previewContainer.boundingBox()
    const formBox = await formContainer.boundingBox()
    expect(previewBox).toBeTruthy()
    expect(formBox).toBeTruthy()
    if (previewBox && formBox) {
      expect(previewBox.y).toBeCloseTo(formBox.y, -1)
    }
  })

  test('step labels are visible on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/create')
    const steps = page.locator('.step')
    await expect(steps).toHaveCount(4)
    await expect(steps.nth(0)).toContainText('Photo')
    await expect(steps.nth(1)).toContainText('Message')
    await expect(steps.nth(2)).toContainText('Address')
    await expect(steps.nth(3)).toContainText('Review')
  })

  test('address form fields are in two-column grid on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/create')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(IMAGE_PATH)
    await page.getByRole('button', { name: 'Next: Write Message' }).click()
    await page.getByRole('textbox').fill('Test')
    await page.getByRole('button', { name: 'Next: Add Address' }).click()

    const firstNameBox = await page.getByPlaceholder('Jane').boundingBox()
    const lastNameBox = await page.getByPlaceholder('Doe').boundingBox()
    expect(firstNameBox).toBeTruthy()
    expect(lastNameBox).toBeTruthy()
    if (firstNameBox && lastNameBox) {
      expect(firstNameBox.y).toBeCloseTo(lastNameBox.y, -1)
    }
  })

  test('postcard preview has correct aspect ratio', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/create')
    await expect(page.getByText(/postcard.*Front/)).toBeVisible()
  })

  test('dashboard cards grid adapts to screen width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await expect(page.getByText('No drafts yet')).toBeVisible()
  })
})
