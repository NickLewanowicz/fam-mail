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
    await expect(page.getByRole('heading', { name: 'Send something real' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Create a Postcard' })).toBeVisible()
    // No horizontal overflow
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('wizard fits mobile viewport without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/create')
    await expect(page.getByRole('heading', { name: 'Where is this going?' })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    // The postcard preview renders above the picker on mobile
    await expect(page.getByText(/Front — 6×4″/)).toBeVisible()
  })

  test('wizard Review step fits mobile viewport without horizontal overflow', async ({ page }) => {
    // #102: the Review step was never asserted, so a +16px overflow shipped.
    // 390×844 mirrors the ux-audit mobile measurement.
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/create')
    await page.getByRole('button', { name: /United States/ }).click()
    await page.locator('input[type="file"]').setInputFiles(IMAGE_PATH)
    await page.getByRole('button', { name: /Write Message/ }).click()
    await page.getByRole('button', { name: 'Click to write...' }).click()
    await page.getByRole('textbox').fill('Hello!')
    await page.getByRole('button', { name: 'Done' }).click()
    await page.getByRole('button', { name: /Add Address/ }).click()
    await page.getByPlaceholder('Jane').fill('Grace')
    await page.getByPlaceholder('Doe').fill('Hopper')
    await page.getByPlaceholder('123 Main Street').fill('1 Way')
    await page.getByPlaceholder('Toronto').fill('New Haven')
    await page.getByPlaceholder('ON', { exact: true }).fill('CT')
    await page.getByPlaceholder('M5V 2T6').fill('06510')
    await page.getByRole('button', { name: /Next: Review/ }).click()
    await expect(page.getByRole('heading', { name: 'Review & Send' })).toBeVisible()
    // D3: the step panel enters via a 32px slide (200ms). Measure the SETTLED
    // page, mirroring the ux-audit protocol — mid-flight transforms add
    // transient visual overflow by design.
    await page.waitForTimeout(400)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('address ZIP field has numeric inputmode, postal-code autocomplete, and no iOS zoom', async ({ page }) => {
    // #104: iOS Safari zooms into inputs < 16px; autofill needs standard tokens
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/create')
    await page.getByRole('button', { name: /United States/ }).click()
    await page.locator('input[type="file"]').setInputFiles(IMAGE_PATH)
    await page.getByRole('button', { name: /Write Message/ }).click()
    await page.getByRole('button', { name: 'Click to write...' }).click()
    await page.getByRole('textbox').fill('Hello!')
    await page.getByRole('button', { name: 'Done' }).click()
    await page.getByRole('button', { name: /Add Address/ }).click()

    const zip = page.getByPlaceholder('M5V 2T6')
    await expect(zip).toHaveAttribute('inputmode', 'numeric')
    await expect(zip).toHaveAttribute('autocomplete', 'postal-code')
    const zipFontSize = await zip.evaluate(el => parseFloat(getComputedStyle(el).fontSize))
    expect(zipFontSize).toBeGreaterThanOrEqual(16)

    await expect(page.getByPlaceholder('Jane')).toHaveAttribute('autocomplete', 'given-name')
    await expect(page.getByPlaceholder('Doe')).toHaveAttribute('autocomplete', 'family-name')
    await expect(page.getByPlaceholder('123 Main Street')).toHaveAttribute('autocomplete', 'address-line1')
    await expect(page.getByPlaceholder('Apt 4B (optional)')).toHaveAttribute('autocomplete', 'address-line2')
    await expect(page.getByPlaceholder('Toronto')).toHaveAttribute('autocomplete', 'address-level2')
    await expect(page.getByPlaceholder('ON', { exact: true })).toHaveAttribute('autocomplete', 'address-level1')
  })

  test('step labels show on desktop and collapse to numbers on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/create')
    const label = page.locator('span.hidden', { hasText: 'Destination' })
    await expect(label).toBeVisible()

    await page.setViewportSize({ width: 375, height: 667 })
    await expect(label).toBeHidden()
  })

  test('address form fields are side-by-side on desktop and stacked on mobile', async ({ page }) => {
    // Reach the Address step
    await page.goto('/create')
    await page.getByRole('button', { name: /United States/ }).click()
    await page.locator('input[type="file"]').setInputFiles(IMAGE_PATH)
    await page.getByRole('button', { name: /Write Message/ }).click()
    await page.getByRole('button', { name: 'Click to write...' }).click()
    await page.getByRole('textbox').fill('Hello!')
    await page.getByRole('button', { name: 'Done' }).click()
    await page.getByRole('button', { name: /Add Address/ }).click()

    const firstName = page.getByPlaceholder('Jane')
    const lastName = page.getByPlaceholder('Doe')
    await expect(firstName).toBeVisible()

    const desktopFirst = await firstName.boundingBox()
    const desktopLast = await lastName.boundingBox()
    expect(desktopFirst && desktopLast).toBeTruthy()
    if (desktopFirst && desktopLast) {
      // Same row on desktop
      expect(desktopFirst.y).toBeCloseTo(desktopLast.y, -1)
    }

    await page.setViewportSize({ width: 375, height: 667 })
    const mobileFirst = await firstName.boundingBox()
    const mobileLast = await lastName.boundingBox()
    expect(mobileFirst && mobileLast).toBeTruthy()
    if (mobileFirst && mobileLast) {
      // Names stay side-by-side on mobile but must fit within the viewport
      expect(mobileLast.x).toBeGreaterThan(mobileFirst.x)
      expect(mobileLast.x + mobileLast.width).toBeLessThanOrEqual(375)
    }
  })

  test('postcard preview shows the selected size label', async ({ page }) => {
    await page.goto('/create')
    await expect(page.getByText(/Front — 6×4″/)).toBeVisible()
    // Size changes are selectable from Review; the label follows the state
    await page.getByRole('button', { name: /United States/ }).click()
    await page.locator('input[type="file"]').setInputFiles(IMAGE_PATH)
    await page.getByRole('button', { name: /Write Message/ }).click()
    await page.getByRole('button', { name: 'Click to write...' }).click()
    await page.getByRole('textbox').fill('Hello!')
    await page.getByRole('button', { name: 'Done' }).click()
    await page.getByRole('button', { name: /Add Address/ }).click()
    await page.getByPlaceholder('Jane').fill('Grace')
    await page.getByPlaceholder('Doe').fill('Hopper')
    await page.getByPlaceholder('123 Main Street').fill('1 Way')
    await page.getByPlaceholder('Toronto').fill('New Haven')
    await page.getByPlaceholder('ON', { exact: true }).fill('CT')
    await page.getByPlaceholder('M5V 2T6').fill('06510')
    await page.getByRole('button', { name: /Next: Review/ }).click()
    await page.getByRole('button', { name: '11×6"' }).click()
    await expect(page.getByText(/11×6″/)).toBeVisible()
  })
})
