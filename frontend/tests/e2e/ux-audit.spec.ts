import { test, expect } from '@playwright/test'
import { setupMockAuth, setupMockApi } from './helpers'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

/**
 * UX metrics audit — the nightshift measurement harness.
 * Measures the metrics defined in docs/design/ux-metrics.md and writes
 * frontend/tests/e2e/ux-audit-results.json (git-ignored) for round-over-round
 * comparison. Assertions here are regression floors only; target values live
 * in the metrics doc and are moved manually as rounds land.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IMAGE_PATH = path.join(__dirname, 'fixtures/test-postcard.jpg')
const RESULTS_PATH = path.join(__dirname, 'ux-audit-results.json')

type PageMetrics = {
  overflowPx: number
  undersizedTargets: Array<{ text: string; w: number; h: number }>
  inputsUnder16px: number
  inputsMissingInputmode: number
  transitionedElements: number
}

const results: Record<string, unknown> = {
  generatedAt: new Date().toISOString(),
  projects: {},
}

async function measurePage(page: import('@playwright/test').Page): Promise<PageMetrics> {
  return await page.evaluate(() => {
    const d = document.documentElement
    const undersized: Array<{ text: string; w: number; h: number }> = []
    document.querySelectorAll('button, a, input, textarea, select, [role="button"]').forEach(el => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44)) {
        undersized.push({
          text: ((el as HTMLElement).textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 40),
          w: Math.round(r.width),
          h: Math.round(r.height),
        })
      }
    })
    let inputsUnder16px = 0
    let inputsMissingInputmode = 0
    document.querySelectorAll('input, textarea').forEach(el => {
      const fs = getComputedStyle(el).fontSize
      if (parseFloat(fs) < 16) inputsUnder16px++
      const type = (el as HTMLInputElement).type
      const wantsMode = type === 'text' || type === 'tel' || !type
      if (wantsMode && !el.getAttribute('inputmode')) inputsMissingInputmode++
    })
    let transitionedElements = 0
    document.querySelectorAll('*').forEach(el => {
      const s = getComputedStyle(el)
      if ((s.transitionDuration !== '0s' && s.transitionProperty !== 'none') || s.animationName !== 'none') {
        transitionedElements++
      }
    })
    return {
      overflowPx: d.scrollWidth - d.clientWidth,
      undersizedTargets: undersized,
      inputsUnder16px,
      inputsMissingInputmode,
      transitionedElements,
    }
  })
}

async function runWizardToReview(page: import('@playwright/test').Page) {
  await page.goto('/create')
  await page.getByRole('button', { name: /United States/ }).click()
  await page.locator('input[type="file"]').setInputFiles(IMAGE_PATH)
  await page.getByRole('button', { name: /Write Message/ }).click()
  const editorButton = page.getByRole('button', { name: /Click to write/ })
  if (await editorButton.isVisible().catch(() => false)) {
    await editorButton.click()
    const box = page.getByRole('textbox').first()
    await box.fill('Nightshift audit message — please ignore, this is a test card.')
    await page.getByRole('button', { name: 'Done' }).click()
  }
  await page.getByRole('button', { name: /Add Address/ }).click()
  await page.getByRole('textbox', { name: 'Jane' }).fill('Eleanor')
  await page.getByRole('textbox', { name: 'Doe' }).fill('Kowalski')
  await page.getByRole('textbox', { name: '123 Main Street' }).fill('812 Maple Avenue')
  await page.getByRole('textbox', { name: 'Toronto' }).fill('Portland')
  await page.getByRole('textbox', { name: 'ON', exact: true }).fill('OR')
  await page.getByRole('textbox', { name: 'M5V 2T6' }).fill('97205')
  await page.getByRole('button', { name: /Next: Review/ }).click()
  await page.waitForTimeout(400)
}

async function auditProject(projectName: string, isMobile: boolean) {
  const pages: Record<string, PageMetrics> = {}
  const consoleIssues: string[] = []

  test(`${projectName}: walkthrough collects console issues + page metrics`, async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') consoleIssues.push(`console.error @ ${page.url()}: ${msg.text().slice(0, 200)}`)
    })
    page.on('pageerror', err => consoleIssues.push(`pageerror @ ${page.url()}: ${String(err).slice(0, 200)}`))

    await setupMockAuth(page)
    await setupMockApi(page)

    await page.goto('/')
    await page.waitForTimeout(300)
    pages.dashboard = await measurePage(page)

    await runWizardToReview(page)
    pages.wizardReview = await measurePage(page)

    await page.goto('/history')
    await page.waitForTimeout(300)
    pages.history = await measurePage(page)

    results.projects[projectName] = {
      isMobile,
      pages,
      consoleErrors: consoleIssues,
    }

    fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2))

    // Regression floors only — targets live in docs/design/ux-metrics.md
    expect(consoleIssues, 'console must stay clean during walkthrough').toEqual([])
  })
}

auditProject('desktop', false)
auditProject('mobile', true)
