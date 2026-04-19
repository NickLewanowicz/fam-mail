import { test, expect } from '@playwright/test'
import { mockBackendHealth, gotoApp } from './helpers'

test.describe('Address Validation Errors', () => {
  test.beforeEach(async ({ page }) => {
    await mockBackendHealth(page)
  })

  test('shows error when first name is empty on submit', async ({ page }) => {
    await gotoApp(page)

    // Click Save Address without filling any fields
    await page.getByRole('button', { name: 'Save Address' }).click()

    // Should show validation error for first name
    await expect(page.getByText('First name is required')).toBeVisible()
    // Input should have error styling
    const firstNameInput = page.locator('input[placeholder="John"]')
    await expect(firstNameInput).toHaveClass(/input-error/)
  })

  test('shows error when last name is empty on submit', async ({ page }) => {
    await gotoApp(page)

    // Fill only first name
    await page.locator('input[placeholder="John"]').fill('John')
    await page.getByRole('button', { name: 'Save Address' }).click()

    await expect(page.getByText('Last name is required')).toBeVisible()
  })

  test('shows error when address line 1 is empty on submit', async ({ page }) => {
    await gotoApp(page)

    await page.locator('input[placeholder="John"]').fill('John')
    await page.locator('input[placeholder="Doe"]').fill('Doe')
    await page.getByRole('button', { name: 'Save Address' }).click()

    await expect(page.getByText('Address is required')).toBeVisible()
  })

  test('shows error when city is empty on submit', async ({ page }) => {
    await gotoApp(page)

    await page.locator('input[placeholder="John"]').fill('John')
    await page.locator('input[placeholder="Doe"]').fill('Doe')
    await page.locator('input[placeholder="123 Main Street"]').fill('123 Main St')
    await page.getByRole('button', { name: 'Save Address' }).click()

    await expect(page.getByText('City is required')).toBeVisible()
  })

  test('shows error when province/state is empty on submit', async ({ page }) => {
    await gotoApp(page)

    await page.locator('input[placeholder="John"]').fill('John')
    await page.locator('input[placeholder="Doe"]').fill('Doe')
    await page.locator('input[placeholder="123 Main Street"]').fill('123 Main St')
    await page.locator('input[placeholder="City"]').fill('Toronto')
    await page.getByRole('button', { name: 'Save Address' }).click()

    await expect(page.getByText('Province/State is required')).toBeVisible()
  })

  test('shows error when postal/zip code is empty on submit', async ({ page }) => {
    await gotoApp(page)

    await page.locator('input[placeholder="John"]').fill('John')
    await page.locator('input[placeholder="Doe"]').fill('Doe')
    await page.locator('input[placeholder="123 Main Street"]').fill('123 Main St')
    await page.locator('input[placeholder="City"]').fill('Toronto')
    await page.locator('input[placeholder="Province/State"]').fill('ON')
    await page.getByRole('button', { name: 'Save Address' }).click()

    await expect(page.getByText('Postal/Zip code is required')).toBeVisible()
  })

  test('shows all required field errors simultaneously', async ({ page }) => {
    await gotoApp(page)

    await page.getByRole('button', { name: 'Save Address' }).click()

    // All required field errors should appear
    await expect(page.getByText('First name is required')).toBeVisible()
    await expect(page.getByText('Last name is required')).toBeVisible()
    await expect(page.getByText('Address is required')).toBeVisible()
    await expect(page.getByText('City is required')).toBeVisible()
    await expect(page.getByText('Province/State is required')).toBeVisible()
    await expect(page.getByText('Postal/Zip code is required')).toBeVisible()
  })

  test('clears errors as fields are filled', async ({ page }) => {
    await gotoApp(page)

    await page.getByRole('button', { name: 'Save Address' }).click()
    await expect(page.getByText('First name is required')).toBeVisible()

    // Fill the first name - error should clear
    await page.locator('input[placeholder="John"]').fill('John')
    await expect(page.getByText('First name is required')).not.toBeVisible()
  })

  test('address line 2 is optional and shows no error', async ({ page }) => {
    await gotoApp(page)

    // Fill all required fields except addressLine2
    await page.locator('input[placeholder="John"]').fill('John')
    await page.locator('input[placeholder="Doe"]').fill('Doe')
    await page.locator('input[placeholder="123 Main Street"]').fill('123 Main St')
    // Leave addressLine2 empty
    await page.locator('input[placeholder="City"]').fill('Toronto')
    await page.locator('input[placeholder="Province/State"]').fill('ON')
    await page.locator('input[placeholder="Postal/Zip Code"]').fill('M5H 2N2')

    await page.getByRole('button', { name: 'Save Address' }).click()

    // No error should appear for addressLine2
    // Progress should update to 1 of 3
    await expect(page.getByText('Complete: 1 of 3 steps')).toBeVisible()
  })

  test('country selector defaults to Canada', async ({ page }) => {
    await gotoApp(page)

    const countrySelect = page.locator('select').last()
    await expect(countrySelect).toHaveValue('CA')
  })

  test('can change country to US', async ({ page }) => {
    await gotoApp(page)

    const countrySelect = page.locator('select').last()
    await countrySelect.selectOption('US')
    await expect(countrySelect).toHaveValue('US')
  })

  test('saved address populates form on re-render', async ({ page }) => {
    await gotoApp(page)

    // Fill and save address
    await page.locator('input[placeholder="John"]').fill('Jane')
    await page.locator('input[placeholder="Doe"]').fill('Smith')
    await page.locator('input[placeholder="123 Main Street"]').fill('456 Oak Ave')
    await page.locator('input[placeholder="City"]').fill('Vancouver')
    await page.locator('input[placeholder="Province/State"]').fill('BC')
    await page.locator('input[placeholder="Postal/Zip Code"]').fill('V6B 1A1')
    await page.getByRole('button', { name: 'Save Address' }).click()

    // Verify the progress updated
    await expect(page.getByText('Complete: 1 of 3 steps')).toBeVisible()

    // The form should still show the saved values (initialAddress prop)
    await expect(page.locator('input[placeholder="John"]')).toHaveValue('Jane')
    await expect(page.locator('input[placeholder="Doe"]')).toHaveValue('Smith')
  })
})
