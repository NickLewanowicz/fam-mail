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
    await expect(page.getByRole('heading', { name: 'Send something real' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Create a Postcard' })).toBeVisible()
    await expect(page.getByText('No drafts yet')).toBeVisible()
  })

  test('navbar shows Fam Mail and New link', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Fam Mail')).toBeVisible()
    await expect(page.getByRole('link', { name: 'New', exact: true })).toBeVisible()
  })

  test('wizard: full send flow with photo, rich text, and address', async ({ page }) => {
    await page.goto('/create')

    // Step 1 — Destination
    await expect(page.getByRole('heading', { name: 'Where is this going?' })).toBeVisible()
    await page.getByRole('button', { name: /United States/ }).click()

    // Step 2 — Photo upload unlocks the next button
    const nextButton = page.getByRole('button', { name: /Write Message/ })
    await expect(nextButton).toBeDisabled()
    await page.locator('input[type="file"]').setInputFiles(IMAGE_PATH)
    await expect(nextButton).toBeEnabled()
    await nextButton.click()

    // Step 3 — Message with the rich text toolbar
    await page.getByRole('button', { name: 'Click to write...' }).click()
    const editor = page.getByRole('textbox')
    await editor.fill('Happy birthday Grace! See you at the lake.')
    // Formatting toolbar is available and inserts markdown at the cursor
    await page.getByRole('button', { name: 'Bold', exact: true }).click()
    await expect(editor).toHaveValue(/Happy birthday Grace! See you at the lake\.\*\*/)
    await page.getByRole('button', { name: 'Text color' }).click()
    await expect(page.getByRole('menuitem', { name: /Red/ })).toBeVisible()
    await page.getByRole('button', { name: 'Done' }).click()
    await page.getByRole('button', { name: /Add Address/ }).click()

    // Step 4 — Address
    await page.getByPlaceholder('Jane').fill('Grace')
    await page.getByPlaceholder('Doe').fill('Hopper')
    await page.getByPlaceholder('123 Main Street').fill('1 Spectacular Way')
    await page.getByPlaceholder('Toronto').fill('New Haven')
    await page.getByPlaceholder('ON', { exact: true }).fill('CT')
    await page.getByPlaceholder('M5V 2T6').fill('06510')
    await page.getByRole('button', { name: /Next: Review/ }).click()

    // Step 5 — Review: mode banner, checklist, size selector
    await expect(page.getByRole('heading', { name: 'Review & Send' })).toBeVisible()
    await expect(page.getByText(/To: Grace Hopper/)).toBeVisible()
    await expect(page.getByText('Photo missing')).toHaveCount(0)

    // Size selection drives the preview label
    await page.getByRole('button', { name: '11×6"' }).click()
    await expect(page.getByText(/11×6″/)).toBeVisible()
    await page.getByRole('button', { name: '6×4"' }).click()

    await page.getByRole('button', { name: 'Send Postcard' }).click()
    await expect(page.getByText('mock_postcard_e2e')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create Another' })).toBeVisible()
  })

  test('wizard: jumping ahead past an unfinished step is blocked', async ({ page }) => {
    await page.goto('/create')
    await page.getByRole('button', { name: /United States/ }).click()
    await expect(page.getByText('Upload your photo')).toBeVisible()
    // Photo has no image yet: tapping "3 Message" must not navigate
    await page.getByRole('button', { name: /^3( Message)?$/ }).click()
    await expect(page.getByText('Upload your photo')).toBeVisible()
    // And the Photo step must not show ✓
    await expect(page.getByRole('button', { name: /^2( Photo)?$/ })).not.toHaveText('✓')
  })
})
