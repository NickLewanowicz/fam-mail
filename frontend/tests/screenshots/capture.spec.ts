import { test, expect } from '@playwright/test'
import { setupMockAuth, setupMockApi } from '../e2e/helpers'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IMAGE_PATH = path.join(__dirname, '../e2e/fixtures/test-postcard.jpg')
const OUT_DIR = path.join(__dirname, '../../docs/screenshots')

test.beforeEach(async ({ page }) => {
  await setupMockAuth(page)
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

test('capture dashboard screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Send something real' })).toBeVisible()
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop-dashboard.png') })
})

test('capture create postcard - photo step', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/create')
  await page.getByRole('button', { name: /United States/ }).click()
  await expect(page.getByText('Upload your photo')).toBeVisible()
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop-photo.png') })
})

test('capture create postcard - message step', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/create')
  await page.getByRole('button', { name: /United States/ }).click()
  await page.locator('input[type="file"]').setInputFiles(IMAGE_PATH)
  await page.getByRole('button', { name: /Write Message/ }).click()
  await page.getByRole('button', { name: 'Click to write...' }).click()
  await page.getByRole('textbox').fill('Happy birthday Grace! Wishing you a wonderful year ahead.')
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop-message.png') })
})

test('capture review screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await walkToReview(page)
  await expect(page.getByRole('heading', { name: 'Review & Send' })).toBeVisible()
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop-review.png') })
})

test('capture mobile dashboard screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Send something real' })).toBeVisible()
  await page.screenshot({ path: path.join(OUT_DIR, 'mobile-dashboard.png') })
})
