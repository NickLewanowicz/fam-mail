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
const resultsPathFor = (projectName: string) => path.join(__dirname, `ux-audit-results-${projectName}.json`)

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
      if (!(r.width > 0 && r.height > 0)) return
      // Visually-hidden elements (sr-only skip link etc.) are not touch targets
      const cls = (el as HTMLElement).className
      const hidden = /sr-only|visually-hidden/.test(typeof cls === 'string' ? cls : '') || (r.width < 2 && r.height < 2)
      if (hidden) return
      // 0.5px tolerance: a declared-44px target can measure 44±0.0001 from
      // device-pixel snapping, which must not flake the audit
      if (r.width < 43.5 || r.height < 43.5) {
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

// #110: seeded draft so the dashboard draft-card controls (Export/Delete,
// search) and the /drafts/:id editor surface are part of every audit run
const SEED_DRAFT = {
  id: 'draft-e2e-seeded',
  userId: 'user-e2e-test',
  recipientAddress: {
    firstName: 'Grace', lastName: 'Hopper', addressLine1: '1 Spectacular Way',
    city: 'New Haven', provinceOrState: 'CT', postalOrZip: '06510', countryCode: 'US',
  },
  senderAddress: {
    firstName: 'Grace', lastName: 'Hopper', addressLine1: '1 Spectacular Way',
    city: 'New Haven', provinceOrState: 'CT', postalOrZip: '06510', countryCode: 'US',
  },
  message: 'Seeded audit draft',
  state: 'ready',
  size: '6x4',
  createdAt: '2026-11-02T00:00:00Z',
  updatedAt: '2026-11-02T00:00:00Z',
}


/** #110: walk the seeded draft through message editing (inline editor open)
 *  to Review, measuring every intermediate surface. */
async function runDraftToReview(page: import('@playwright/test').Page) {
  await page.goto('/drafts/draft-e2e-seeded')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(400)

  // Re-pick the destination (draft load restores the address but not the
  // country state), then attach the fixture photo to unlock the wizard
  await page.getByRole('button', { name: /United States/ }).click()
  await page.waitForTimeout(400)
  await page.locator('input[type="file"]').setInputFiles(IMAGE_PATH)
  await page.getByRole('button', { name: /Write Message/ }).click()
  await page.waitForTimeout(400)

  // Open the inline message editor (draft already carries a message, so the
  // zone shows the rendered text, not the "Click to write..." placeholder).
  // Click the zone itself — a raw text-node click can land on the Flip
  // control that paints over the mirrored back face and flip the card.
  await page.locator('div[role="button"]').filter({ hasText: 'Seeded audit draft' }).first().click()
  await page.getByRole('textbox').first().waitFor({ state: 'visible' })
  await page.waitForTimeout(400)
}


async function auditProject(projectName: string, isMobile: boolean) {
  const pages: Record<string, PageMetrics> = {}
  const consoleIssues: string[] = []

  test(`${projectName}: walkthrough collects console issues + page metrics`, async ({ page }) => {
    test.skip(test.info().project.name !== projectName, 'runs only in its own viewport project')

    page.on('console', msg => {
      if (msg.type() === 'error') consoleIssues.push(`console.error @ ${page.url()}: ${msg.text().slice(0, 200)}`)
    })
    page.on('pageerror', err => consoleIssues.push(`pageerror @ ${page.url()}: ${String(err).slice(0, 200)}`))

    await setupMockAuth(page)
    await setupMockApi(page)
    // Audit must be hermetic: any API call the helpers don't mock gets a benign
    // response instead of falling through to a real backend (401 console noise).
    await page.route('**/api/**', route => {
      const url = route.request().url()
      if (url.match(/\/api\/(auth\/me|health)(\?|$)/) || url.includes('/api/postgrid/status')) {
        return route.fallback()
      }
      if (url.match(/\/api\/drafts\/draft-e2e-seeded$/)) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ draft: SEED_DRAFT }) })
      }
      if (url.includes('/api/drafts')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ drafts: [SEED_DRAFT] }) })
      }
      if (url.includes('/api/postcards')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[]}' })
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[]}' })
    })

    await page.goto('/')
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(300)
    pages.dashboard = await measurePage(page)

    // #110: seeded draft surfaces — draft card on the dashboard (measured
    // above), the draft editor, the open inline message editor, and each
    // subsequent wizard step through Review
    await runDraftToReview(page)
    pages.draftEditor = await measurePage(page)

    await page.getByRole('button', { name: 'Done' }).click()
    await page.getByRole('button', { name: /Add Address/ }).click()
    // D3: settle the step transition (exit + 32px enter slide) before
    // measuring — a fixed wait races under parallel-worker CPU load
    await page.waitForFunction(() => {
      const panel = document.querySelector('div[class*="min-h-[320px]"]')
      const settled = !panel || getComputedStyle(panel).transform === 'none'
      const d = document.documentElement
      return settled && d.scrollWidth <= d.clientWidth
    }, undefined, { timeout: 8000 }).catch(() => { /* measure whatever state we reached */ })
    pages.wizardAddress = await measurePage(page)

    await page.getByRole('button', { name: /Next: Review/ }).click()
    await page.waitForTimeout(400)
    pages.wizardReview = await measurePage(page)

    await page.goto('/history')
    await page.waitForTimeout(300)
    pages.history = await measurePage(page)

    results.projects[projectName] = {
      isMobile,
      pages,
      consoleErrors: consoleIssues,
    }

    fs.writeFileSync(resultsPathFor(projectName), JSON.stringify(results.projects[projectName], null, 2))

    // Regression floors only — targets live in docs/design/ux-metrics.md
    expect([...new Set(consoleIssues)], 'console must stay clean during walkthrough').toEqual([])

    // Mobile floors (#102/#103/#104 acceptance): 0 overflow, 0 undersized
    // targets (visually-hidden exempt), 0 inputs under 16px on every audited page
    if (isMobile) {
      for (const [name, m] of Object.entries(pages)) {
        expect(m.overflowPx, `${name}: horizontal overflow at mobile width`).toBeLessThanOrEqual(0)
        expect(m.undersizedTargets, `${name}: touch targets under 44px`).toEqual([])
        expect(m.inputsUnder16px, `${name}: inputs under 16px (iOS focus zoom)`).toBe(0)
      }
    }
  })
}

auditProject('desktop', false)
auditProject('mobile', true)
