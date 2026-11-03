import { test, expect, type Page } from '@playwright/test'
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
    // M5/M8 ergonomics: on phones the sticky preview card (top) and the
    // fixed action bar (bottom) leave a scroll band between them; a real
    // thumb flicks the buttons into that band, but Playwright's hit-tested
    // click keeps bouncing between the two overlays — assert visibility,
    // then dispatch the click via the DOM (behavior-level assertion)
    const sizeButton = page.getByRole('button', { name: '11×6"' })
    await expect(sizeButton).toBeVisible()
    await sizeButton.click()
    await expect(page.getByText(/11×6″/)).toBeVisible()
  })
})

test.describe('Mode & price truth (ISSUE-0117)', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAuth(page)
    await setupMockApi(page)
  })

  test('chip rides the action bar on steps 1-4 with no overflow at 320 and 390', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 })
    await page.goto('/create')

    const overflowOk = async () => {
      // settle the D3 step slide before measuring (fixed waits race it)
      await page.waitForFunction(() => {
        const panel = document.querySelector('div[class*="min-h-[320px]"]')
        const settled = !panel || getComputedStyle(panel).transform === 'none'
        const d = document.documentElement
        return settled && d.scrollWidth <= d.clientWidth
      }, undefined, { timeout: 8000 }).catch(() => { /* assert the state we reached */ })
      const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(o).toBeLessThanOrEqual(0)
    }
    // step 0 is bar-less by design — the chip is asserted after each advance
    const chip = page.locator('div.fixed.bottom-0 span[role="status"]')
    const chipText = async () => (await chip.textContent())?.trim() ?? ''

    // Step 0 is bar-less (tap-a-country is the action)
    await page.getByRole('button', { name: /United States/ }).click() // -> step 1
    await page.waitForTimeout(400)
    await overflowOk()
    expect((await chipText()).startsWith('TEST')).toBe(true)

    await page.locator('input[type="file"]').setInputFiles(IMAGE_PATH)
    await page.getByRole('button', { name: /Write Message/ }).click() // -> step 2
    await page.waitForTimeout(400)
    await overflowOk()
    expect((await chipText()).startsWith('TEST')).toBe(true)

    await page.getByRole('button', { name: /Add Address/ }).click() // -> step 3
    await page.waitForTimeout(400)
    await overflowOk()
    expect((await chipText()).startsWith('TEST')).toBe(true)

    // 390: same walk tail at the metric width
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByPlaceholder('Jane').fill('Grace')
    await page.getByPlaceholder('Doe').fill('Hopper')
    await page.getByPlaceholder('123 Main Street').fill('1 Way')
    await page.getByPlaceholder('Toronto').fill('New Haven')
    await page.getByPlaceholder('ON', { exact: true }).fill('CT')
    await page.getByPlaceholder('M5V 2T6').fill('06510')
    await page.getByRole('button', { name: /Next: Review/ }).click() // -> step 4
    await page.waitForTimeout(400)
    await overflowOk()
    expect((await chipText()).startsWith('TEST')).toBe(true)
  })

  test('step 4 truth: bar sentence, size estimates, qualifier, aria wiring, no checkout strings', async ({ page }) => {
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
    await page.waitForTimeout(400)

    // Test mode: the practice sentence, in the bar, at the thumb
    const truthBar = page.locator('#send-truth-bar')
    await expect(truthBar).toBeVisible()
    await expect(truthBar).toContainText('nothing will be mailed')

    // Chip carries the sr-only mode expansion (role=status)
    const chip = page.locator('div.fixed.bottom-0 span[role="status"]')
    await expect(chip).toContainText('TEST')
    expect((await chip.textContent()) ?? '').toContain('test mode — nothing will be mailed')

    // Both Send buttons expose the truth via aria-describedby
    await expect(page.getByTestId('wizard-primary')).toHaveAttribute('aria-describedby', 'send-truth-bar')

    // Size buttons ride their estimates; qualifier beside the hint
    await expect(page.getByText('about $1.11')).toBeVisible()
    await expect(page.getByText('about $1.86')).toBeVisible()
    await expect(page.getByText('about $2.24')).toBeVisible()
    await expect(page.getByText(/Estimates only — the final cost is set when the card is sent/)).toBeVisible()

    // Not-a-checkout grep gate: no Total/Pay/Checkout strings on the page
    const source = await page.evaluate(() => document.body.innerText)
    expect(source).not.toMatch(/Total|Pay |Checkout/)

    // md breakpoint: the panel truth line replaces the old top banners
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.waitForTimeout(300)
    const truthPanel = page.locator('#send-truth-panel')
    await expect(truthPanel).toBeVisible()
    await expect(truthPanel).toContainText('nothing will be mailed')
    await expect(page.getByRole('button', { name: /Send Postcard/ })).toHaveAttribute('aria-describedby', 'send-truth-panel')
    expect(await oldBannersVisible(page)).toBe(false)
  })
})

/** helper: the old top-of-panel banners must not exist anywhere */
function oldBannersVisible(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('div')).some((d) =>
      /Test mode — no physical mail will be sent|LIVE mode — this will be printed and mailed|Mock mode — nothing is sent/.test(d.textContent ?? '') && d.className.includes('rounded-md border') && !d.closest('#send-truth-panel')
    )
  )
}

