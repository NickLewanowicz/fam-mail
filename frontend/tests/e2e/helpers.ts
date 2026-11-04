import type { Page } from '@playwright/test'

const MOCK_USER = {
  id: 'user-e2e-test',
  oidcSub: 'sub-test',
  oidcIssuer: 'https://auth.example.com',
  email: 'e2e@example.com',
  emailVerified: true,
  firstName: 'Test',
  lastName: 'User',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

export async function setupMockAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('fam_mail_token', 'e2e-mock-token')
  })

  await page.route('**/api/auth/me', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: MOCK_USER }),
    })
  )
}

export async function setupMockApi(page: Page) {
  await page.route('**/api/health', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'healthy', version: '1.0.0', timestamp: new Date().toISOString() }),
    })
  )

  await page.route('**/api/drafts', route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ drafts: [] }),
      })
    }
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          draft: {
            id: 'draft-e2e-new',
            userId: 'user-e2e-test',
            recipientAddress: {},
            state: 'draft',
            size: '6x4',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      })
    }
    return route.continue()
  })

  await page.route('**/api/postgrid/status', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      // D3 (country-aware ADR 0004): the status payload carries per-country
      // price estimates — US/CA sourced dashboard rates, GB unpriced
      body: JSON.stringify({
        mode: 'test',
        mockMode: false,
        pricing: {
          US: { '6x4': 0.902, '9x6': 1.023, '11x6': 1.289 },
          CA: { '6x4': 2.12, '9x6': 2.22, '11x6': 2.97 },
          GB: { '6x4': null, '9x6': null, '11x6': null },
        },
      }),
    })
  )

  await page.route('**/api/postcards', route => {
    // History list (GET) — a shaped card so /history renders content
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'pc-e2e-history-1',
              postgridId: 'mock_postcard_history_1',
              recipientName: 'Grace Hopper',
              recipientAddress: '1 Spectacular Way, New Haven, CT 06510',
              to: {
                firstName: 'Grace',
                lastName: 'Hopper',
                addressLine1: '1 Spectacular Way',
                city: 'New Haven',
                provinceOrState: 'CT',
                postalOrZip: '06510',
                countryCode: 'US',
              },
              content: {
                message: 'Happy birthday Grace! Wishing you a wonderful year ahead.',
              },
              status: 'sent',
              mode: 'test',
              createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ],
        }),
      })
    }
    // Send (POST) — the create flow's success payload
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        testMode: true,
        postcard: {
          id: 'mock_postcard_e2e',
          object: 'postcard',
          live: false,
          status: 'ready',
          size: '6x4',
          to: {
            firstName: 'Jane',
            lastName: 'Doe',
            addressLine1: '123 Main St',
            city: 'Toronto',
            provinceOrState: 'ON',
            postalOrZip: 'M5V 2T6',
            countryCode: 'CA',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    })
  })
}

export const TEST_IMAGE_PATH = 'tests/e2e/fixtures/test-postcard.jpg'
