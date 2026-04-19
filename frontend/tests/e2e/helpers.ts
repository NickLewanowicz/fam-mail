import { Page, Route } from '@playwright/test'

/**
 * Mock the backend health endpoint so the app thinks it's connected
 */
export async function mockBackendHealth(page: Page) {
  await page.route('**/api/health', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Fam Mail API is running',
        testMode: true,
      }),
    })
  })
}

/**
 * Mock auth endpoints so the app thinks the user is authenticated.
 * Sets localStorage token and mocks /api/auth/me to return a valid user.
 */
export async function mockAuthenticated(page: Page) {
  // Mock the /api/auth/me endpoint to return a valid user
  await page.route('**/api/auth/me', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'test-user-id',
          oidcSub: 'test-oidc-sub',
          oidcIssuer: 'https://accounts.google.com',
          email: 'test@fam-mail.test',
          emailVerified: true,
          firstName: 'Test',
          lastName: 'User',
          avatarUrl: undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    })
  })

  // Mock the /api/auth/login endpoint (shouldn't be called but just in case)
  await page.route('**/api/auth/login', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        authUrl: '/auth/callback?code=test-code',
      }),
    })
  })

  // Set a fake JWT token in localStorage so ProtectedRoute lets us through
  await page.addInitScript(() => {
    localStorage.setItem('fam_mail_token', 'test-jwt-token-for-e2e')
  })
}

/**
 * Mock the postcard submission endpoint with a successful response
 */
export async function mockPostcardSubmit(page: Page) {
  await page.route('**/api/postcards', async (route: Route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          testMode: true,
          postcard: {
            id: 'postcard_test_mock123',
            object: 'postcard',
            live: false,
            to: {
              firstName: 'John',
              lastName: 'Doe',
              addressLine1: '123 Main Street',
              city: 'Toronto',
              provinceOrState: 'ON',
              postalOrZip: 'M5H 2N2',
              countryCode: 'CA',
            },
            from: {
              firstName: 'Sender',
              lastName: 'Name',
              addressLine1: '456 Oak Ave',
              city: 'Vancouver',
              provinceOrState: 'BC',
              postalOrZip: 'V6B 1A1',
              countryCode: 'CA',
            },
            size: '6x4',
            status: 'ready',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            carrier: 'USPS',
          },
        }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock the postcard submission endpoint with an error response
 */
export async function mockPostcardSubmitError(page: Page, error: string = 'Validation failed') {
  await page.route('**/api/postcards', async (route: Route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error,
          details: 'Address validation failed',
        }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Fill out the address form with valid data
 */
export async function fillValidAddress(page: Page, overrides: Record<string, string> = {}) {
  const defaults = {
    firstName: 'John',
    lastName: 'Doe',
    addressLine1: '123 Main Street',
    addressLine2: 'Apt 4B',
    city: 'Toronto',
    provinceOrState: 'ON',
    postalOrZip: 'M5H 2N2',
  }

  const values = { ...defaults, ...overrides }

  await page.locator('input[placeholder="John"]').fill(values.firstName)
  await page.locator('input[placeholder="Doe"]').fill(values.lastName)
  await page.locator('input[placeholder="123 Main Street"]').fill(values.addressLine1)
  await page.locator('input[placeholder="Apt 4B (optional)"]').fill(values.addressLine2)
  await page.locator('input[placeholder="City"]').fill(values.city)
  await page.locator('input[placeholder="Province/State"]').fill(values.provinceOrState)
  await page.locator('input[placeholder="Postal/Zip Code"]').fill(values.postalOrZip)

  // Click Save Address
  await page.getByRole('button', { name: 'Save Address' }).click()
}

/**
 * Upload an image via the file input
 */
export async function uploadTestImage(page: Page) {
  const fileInput = page.locator('#postcard-front-image')
  await fileInput.setInputFiles('tests/fixtures/test-image.png')
}

/**
 * Write a message in the markdown editor
 */
export async function writeMessage(page: Page, message: string) {
  // The MDEditor component renders a textarea
  const editorTextarea = page.locator('.w-md-editor textarea').first()
  await editorTextarea.click()
  await editorTextarea.fill(message)
}

/**
 * Navigate to the app and wait for it to be ready.
 * Assumes auth mocks and health mocks are already set up.
 */
export async function gotoApp(page: Page) {
  await page.goto('/')
  // Wait for the app to render (backend health check resolves)
  await page.waitForLoadState('networkidle')
  // Wait for the main content area to be visible
  await page.locator('h2:has-text("Create Your Postcard")').waitFor({ state: 'visible', timeout: 10000 })
}

/**
 * Set up all standard mocks for a typical test: auth + health
 */
export async function setupStandardMocks(page: Page) {
  await mockAuthenticated(page)
  await mockBackendHealth(page)
}
