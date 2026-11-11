import { test, expect } from '@playwright/test'
import { setupMockAuth, setupMockApi } from '../e2e/helpers'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IMAGE_PATH = path.join(__dirname, '../e2e/fixtures/test-postcard.jpg')
const OUT_DIR = path.join(__dirname, '../../../docs/screenshots')

// Regeneration flow: docs/screenshots/README.md ("Regenerating").
// Manifest of every PNG this spec writes: docs/screenshots/README.md.

const DESKTOP = { width: 1280, height: 800 }
const MOBILE = { width: 390, height: 844 }

test.beforeEach(async ({ page }) => {
  // API mocks only — auth is set up per-test so the login captures can
  // render the real unauthenticated page.
  await setupMockApi(page)
})

async function walkToReview(page: import('@playwright/test').Page) {
  await page.goto('/create')
  await page.getByRole('button', { name: /United States/ }).click()
  await page.locator('input[type="file"]').setInputFiles(IMAGE_PATH)
  await page.getByRole('button', { name: /Write Message/ }).click()
  await page.getByRole('button', { name: 'Click to write...' }).click()
  await page.getByRole('textbox').fill('Happy birthday Grace! Wishing you a wonderful year ahead.')
  await page.getByRole('button', { name: 'Done' }).click()
  await page.getByRole('button', { name: /Add Address/ }).click()
  await page.getByPlaceholder('Jane').fill('Grace')
  await page.getByPlaceholder('Doe').fill('Hopper')
  await page.getByPlaceholder('123 Main Street').fill('1 Spectacular Way')
  await page.getByPlaceholder('Toronto').fill('New Haven')
  await page.getByPlaceholder('ON', { exact: true }).fill('CT')
  await page.getByPlaceholder('M5V 2T6').fill('06510')
  await page.getByRole('button', { name: /Next: Review/ }).click()
}

/** Upload the fixture photo on the create wizard's photo step. */
async function uploadPhoto(page: import('@playwright/test').Page) {
  await page.goto('/create')
  await page.getByRole('button', { name: /United States/ }).click()
  await page.locator('input[type="file"]').setInputFiles(IMAGE_PATH)
  await expect(page.getByAltText('Postcard front')).toBeVisible()
}

async function writeMessage(page: import('@playwright/test').Page) {
  await uploadPhoto(page)
  await page.getByRole('button', { name: /Write Message/ }).click()
  await page.getByRole('button', { name: 'Click to write...' }).click()
  await page.getByRole('textbox').fill('Happy birthday Grace! Wishing you a wonderful year ahead.')
  // The inline editor footer is the signal that the editor is live
  await expect(page.getByText('Markdown')).toBeVisible()
}

// --- Login ---------------------------------------------------------------

test('capture login screenshot', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Fam Mail' })).toBeVisible()
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop-login.png') })
})

test('capture mobile login screenshot', async ({ page }) => {
  await page.setViewportSize(MOBILE)
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Fam Mail' })).toBeVisible()
  await page.screenshot({ path: path.join(OUT_DIR, 'mobile-login.png') })
})

// --- Dashboard -----------------------------------------------------------

test('capture dashboard screenshot', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await setupMockAuth(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Send something real' })).toBeVisible()
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop-dashboard.png') })
})

test('capture mobile dashboard screenshot', async ({ page }) => {
  await page.setViewportSize(MOBILE)
  await setupMockAuth(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Send something real' })).toBeVisible()
  await page.screenshot({ path: path.join(OUT_DIR, 'mobile-dashboard.png') })
})

// --- Create wizard: destination ------------------------------------------

test('capture create postcard - destination step', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await setupMockAuth(page)
  await page.goto('/create')
  await expect(page.getByRole('heading', { name: 'Where is this going?' })).toBeVisible()
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop-create.png') })
})

// D6 (#79): the mobile capture set — the full flow (create destination,
// review, history) alongside the desktop set. Same explicit 390×844
// viewport as the dashboard capture, so the output is project-independent.
test('capture mobile create postcard - destination step', async ({ page }) => {
  await page.setViewportSize(MOBILE)
  await setupMockAuth(page)
  await page.goto('/create')
  await expect(page.getByRole('heading', { name: 'Where is this going?' })).toBeVisible()
  await page.screenshot({ path: path.join(OUT_DIR, 'mobile-create.png') })
})

// --- Create wizard: photo -------------------------------------------------

test('capture create postcard - photo step', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await setupMockAuth(page)
  await page.goto('/create')
  await page.getByRole('button', { name: /United States/ }).click()
  await expect(page.getByText('Upload your photo')).toBeVisible()
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop-photo.png') })
})

test('capture mobile create postcard - photo uploaded', async ({ page }) => {
  await page.setViewportSize(MOBILE)
  await setupMockAuth(page)
  await uploadPhoto(page)
  await page.screenshot({ path: path.join(OUT_DIR, 'mobile-photo.png') })
})

// --- Create wizard: message -----------------------------------------------

test('capture create postcard - message step', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await setupMockAuth(page)
  await writeMessage(page)
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop-message.png') })
})

test('capture mobile create postcard - message step', async ({ page }) => {
  await page.setViewportSize(MOBILE)
  await setupMockAuth(page)
  await writeMessage(page)
  await page.screenshot({ path: path.join(OUT_DIR, 'mobile-message.png') })
})

// --- Create wizard: review -------------------------------------------------

test('capture review screenshot', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await setupMockAuth(page)
  await walkToReview(page)
  await expect(page.getByRole('heading', { name: 'Review & Send' })).toBeVisible()
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop-review.png') })
})

test('capture mobile review screenshot', async ({ page }) => {
  await page.setViewportSize(MOBILE)
  await setupMockAuth(page)
  await walkToReview(page)
  await expect(page.getByRole('heading', { name: 'Review & Send' })).toBeVisible()
  await page.screenshot({ path: path.join(OUT_DIR, 'mobile-review.png') })
})

// --- History ---------------------------------------------------------------

test('capture history screenshot', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await setupMockAuth(page)
  await page.goto('/history')
  await expect(page.getByRole('heading', { name: 'Postcard History' })).toBeVisible()
  await expect(page.getByText('Grace Hopper')).toBeVisible()
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop-history.png') })
})

test('capture mobile history screenshot', async ({ page }) => {
  await page.setViewportSize(MOBILE)
  await setupMockAuth(page)
  await page.goto('/history')
  await expect(page.getByRole('heading', { name: 'Postcard History' })).toBeVisible()
  await expect(page.getByText('Grace Hopper')).toBeVisible()
  await page.screenshot({ path: path.join(OUT_DIR, 'mobile-history.png') })
})
