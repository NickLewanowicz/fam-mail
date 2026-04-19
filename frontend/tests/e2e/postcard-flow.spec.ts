import { test, expect } from '@playwright/test'
import { setupMockAuth, setupMockApi } from './helpers'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IMAGE_PATH = path.join(__dirname, 'fixtures/test-postcard.jpg')

test.describe('Postcard Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAuth(page)
    await setupMockApi(page)
  })

  test('dashboard shows hero CTA and empty drafts', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Send a Postcard')).toBeVisible()
    await expect(page.getByText('Create New Postcard')).toBeVisible()
    await expect(page.getByText('No drafts yet')).toBeVisible()
  })

  test('navbar shows Fam Mail and New Postcard link', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Fam Mail')).toBeVisible()
    await expect(page.getByRole('link', { name: 'New Postcard', exact: true })).toBeVisible()
  })

  test('navigate to create page from CTA', async ({ page }) => {
    await page.goto('/')
    await page.getByText('Create New Postcard').click()
    await expect(page).toHaveURL('/create')
    await expect(page.getByText('Choose a Photo')).toBeVisible()
  })

  test('wizard step 1: photo upload', async ({ page }) => {
    await page.goto('/create')
    await expect(page.getByText('Choose a Photo')).toBeVisible()
    await expect(page.getByText('Drop an image here or click to browse')).toBeVisible()

    const nextButton = page.getByRole('button', { name: 'Next: Write Message' })
    await expect(nextButton).toBeDisabled()

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(IMAGE_PATH)
    await expect(page.getByAltText('Selected')).toBeVisible()
    await expect(nextButton).toBeEnabled()
  })

  test('wizard step 2: message writing', async ({ page }) => {
    await page.goto('/create')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(IMAGE_PATH)
    await page.getByRole('button', { name: 'Next: Write Message' }).click()

    await expect(page.getByText('Write Your Message')).toBeVisible()
    const textarea = page.getByRole('textbox')
    await textarea.fill('Hello from the E2E test!')
    await expect(page.getByText('24/500')).toBeVisible()
  })

  test('wizard step 3: address entry with validation', async ({ page }) => {
    await page.goto('/create')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(IMAGE_PATH)
    await page.getByRole('button', { name: 'Next: Write Message' }).click()

    await page.getByRole('textbox').fill('Test message')
    await page.getByRole('button', { name: 'Next: Add Address' }).click()

    await expect(page.getByRole('heading', { name: 'Recipient Address' })).toBeVisible()

    await page.getByRole('button', { name: 'Next: Review' }).click()
    await expect(page.getByText('Required').first()).toBeVisible()

    await page.getByPlaceholder('Jane').fill('Jane')
    await page.getByPlaceholder('Doe').fill('Doe')
    await page.getByPlaceholder('123 Main Street').fill('123 Main St')
    await page.getByPlaceholder('Toronto').fill('Toronto')
    await page.getByPlaceholder('ON', { exact: true }).fill('ON')
    await page.getByPlaceholder('M5V 2T6').fill('M5V 2T6')
  })

  test('full flow: create and send postcard', async ({ page }) => {
    await page.goto('/create')

    // Step 1: Photo
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(IMAGE_PATH)
    await page.getByRole('button', { name: 'Next: Write Message' }).click()

    // Step 2: Message
    await page.getByRole('textbox').fill('Wishing you a wonderful day!')
    await page.getByRole('button', { name: 'Next: Add Address' }).click()

    // Step 3: Address
    await page.getByPlaceholder('Jane').fill('Jane')
    await page.getByPlaceholder('Doe').fill('Doe')
    await page.getByPlaceholder('123 Main Street').fill('123 Main St')
    await page.getByPlaceholder('Toronto').fill('Toronto')
    await page.getByPlaceholder('ON', { exact: true }).fill('ON')
    await page.getByPlaceholder('M5V 2T6').fill('M5V 2T6')
    await page.getByRole('button', { name: 'Next: Review' }).click()

    // Step 4: Review
    await expect(page.getByRole('heading', { name: 'Review Your Postcard' })).toBeVisible()
    await expect(page.getByText('Photo uploaded')).toBeVisible()
    await expect(page.getByText(/Message \(28 chars\)/)).toBeVisible()
    await expect(page.getByText('Jane Doe, Toronto, ON')).toBeVisible()

    // Send
    await page.getByRole('button', { name: 'Send Postcard' }).click()

    // Success
    await expect(page.getByText('Postcard Sent!')).toBeVisible()
    await expect(page.getByText('Test Mode')).toBeVisible()
    await expect(page.getByText('mock_postcard_e2e')).toBeVisible()
  })

  test('postcard preview flips between front and back', async ({ page }) => {
    await page.goto('/create')
    await expect(page.getByText(/postcard.*Front/)).toBeVisible()

    await page.getByRole('button', { name: 'Flip' }).click()
    await expect(page.getByText(/postcard.*Back/)).toBeVisible()

    await page.getByRole('button', { name: 'Flip' }).click()
    await expect(page.getByText(/postcard.*Front/)).toBeVisible()
  })

  test('step indicator allows clicking through steps', async ({ page }) => {
    await page.goto('/create')
    await expect(page.getByText('Choose a Photo')).toBeVisible()

    await page.locator('.step').nth(1).click()
    await expect(page.getByText('Write Your Message')).toBeVisible()

    await page.locator('.step').nth(2).click()
    await expect(page.getByRole('heading', { name: 'Recipient Address' })).toBeVisible()

    await page.locator('.step').nth(0).click()
    await expect(page.getByText('Choose a Photo')).toBeVisible()
  })

  test('back navigation works between steps', async ({ page }) => {
    await page.goto('/create')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(IMAGE_PATH)
    await page.getByRole('button', { name: 'Next: Write Message' }).click()

    await expect(page.getByText('Write Your Message')).toBeVisible()
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page.getByText('Choose a Photo')).toBeVisible()
  })

  test('user can create another postcard after sending', async ({ page }) => {
    await page.goto('/create')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(IMAGE_PATH)
    await page.getByRole('button', { name: 'Next: Write Message' }).click()
    await page.getByRole('textbox').fill('Test')
    await page.getByRole('button', { name: 'Next: Add Address' }).click()

    await page.getByPlaceholder('Jane').fill('Jane')
    await page.getByPlaceholder('Doe').fill('Doe')
    await page.getByPlaceholder('123 Main Street').fill('123 Main St')
    await page.getByPlaceholder('Toronto').fill('Toronto')
    await page.getByPlaceholder('ON', { exact: true }).fill('ON')
    await page.getByPlaceholder('M5V 2T6').fill('M5V 2T6')
    await page.getByRole('button', { name: 'Next: Review' }).click()

    await page.getByRole('button', { name: 'Send Postcard' }).click()
    await expect(page.getByText('Postcard Sent!')).toBeVisible()

    await page.getByRole('button', { name: 'Create Another' }).click()
    await expect(page.getByText('Choose a Photo')).toBeVisible()
  })
})

test.describe('Authentication', () => {
  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.route('**/api/auth/me', route =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthorized' }) })
    )
    await page.goto('/')
    await expect(page.getByRole('button', { name: /Sign in/ })).toBeVisible()
  })
})
