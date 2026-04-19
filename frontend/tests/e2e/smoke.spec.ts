import { test, expect } from '@playwright/test'
import { mockBackendHealth, gotoApp } from './helpers'

test.describe('Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await mockBackendHealth(page)
  })

  test('homepage loads with correct title', async ({ page }) => {
    await gotoApp(page)
    await expect(page).toHaveTitle(/fam/i)
  })

  test('header displays app name', async ({ page }) => {
    await gotoApp(page)
    await expect(page.locator('h1')).toContainText('Fam Mail')
  })

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await gotoApp(page)
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('manifest')
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('status card shows connected', async ({ page }) => {
    await gotoApp(page)
    await expect(page.locator('.alert-success')).toContainText('Connected')
  })

  test('test mode badge is shown', async ({ page }) => {
    await gotoApp(page)
    await expect(page.locator('.badge-warning')).toContainText('Test Mode')
  })

  test('postcard builder sections are all visible', async ({ page }) => {
    await gotoApp(page)
    await expect(page.locator('h2:has-text("Recipient Address")')).toBeVisible()
    await expect(page.locator('h2:has-text("Message Content")')).toBeVisible()
    await expect(page.locator('h2:has-text("Postcard Image")')).toBeVisible()
  })

  test('progress bar shows 0 of 3 steps initially', async ({ page }) => {
    await gotoApp(page)
    await expect(page.getByText('Complete: 0 of 3 steps')).toBeVisible()
  })

  test('footer is visible', async ({ page }) => {
    await gotoApp(page)
    await expect(page.locator('footer')).toContainText('Built with')
  })
})
