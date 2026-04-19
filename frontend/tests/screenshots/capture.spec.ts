import { test, expect, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const screenshotDir = path.resolve(__dirname, '../../../docs/screenshots')

const DEMO_USER = {
  id: 'demo-user',
  oidcSub: 'demo-sub',
  oidcIssuer: 'https://auth.example.com',
  email: 'demo@fammail.app',
  emailVerified: true,
  firstName: 'Demo',
  lastName: 'User',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

const demoDraft = {
  id: 'draft-demo-1',
  userId: 'demo-user',
  recipientAddress: {
    firstName: 'Mom',
    lastName: 'Fam',
    addressLine1: '123 Maple Ave',
    city: 'Austin',
    provinceOrState: 'TX',
    postalOrZip: '78701',
    countryCode: 'US',
  },
  message: 'Happy Birthday! 🎂',
  state: 'draft' as const,
  size: '6x4' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

async function mockAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('fam_mail_token', 'mock-token-for-screenshots')
  })
}

async function mockAPIs(page: Page) {
  await page.route('**/api/auth/me', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: DEMO_USER }),
    })
  })

  await page.route('**/api/health', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'healthy', version: '1.0.0', timestamp: new Date().toISOString() }),
    })
  })

  await page.route('**/api/drafts', route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ drafts: [demoDraft] }),
      })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })

  await page.route('**/api/postgrid/status', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ mode: 'test', mockMode: false }),
    })
  })
}

test.beforeAll(() => {
  fs.mkdirSync(screenshotDir, { recursive: true })
})

test('capture dashboard screenshot', async ({ page }) => {
  await mockAPIs(page)
  await mockAuth(page)
  await page.goto('/')
  await expect(page.getByText('Send a Postcard')).toBeVisible()
  await expect(page.getByText('Mom Fam')).toBeVisible()
  await page.screenshot({ path: path.join(screenshotDir, 'dashboard.png'), fullPage: false })
})

test('capture create postcard - photo step', async ({ page }) => {
  await mockAPIs(page)
  await mockAuth(page)
  await page.goto('/create')
  await expect(page.getByText('Choose a Photo')).toBeVisible()
  await page.screenshot({ path: path.join(screenshotDir, 'create-photo.png'), fullPage: false })
})

test('capture create postcard - message step', async ({ page }) => {
  await mockAPIs(page)
  await mockAuth(page)
  await page.goto('/create')
  await expect(page.getByText('Choose a Photo')).toBeVisible()
  await page.locator('.steps .step').nth(1).click()
  await expect(page.getByText('Write Your Message')).toBeVisible()
  await page.screenshot({ path: path.join(screenshotDir, 'create-message.png'), fullPage: false })
})

test('capture login page', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /Fam Mail/ })).toBeVisible()
  await page.screenshot({ path: path.join(screenshotDir, 'login.png'), fullPage: false })
})
