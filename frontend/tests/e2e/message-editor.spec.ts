import { test, expect } from '@playwright/test'
import { setupStandardMocks, gotoApp } from './helpers'

test.describe('Message Editor', () => {
  test.beforeEach(async ({ page }) => {
    await setupStandardMocks(page)
  })

  test('message editor section is visible', async ({ page }) => {
    await gotoApp(page)
    await expect(page.locator('h2:has-text("Message Content")')).toBeVisible()
    await expect(page.getByText('Your Message')).toBeVisible()
  })

  test('markdown editor is present and interactable', async ({ page }) => {
    await gotoApp(page)

    // The MDEditor component should render a textarea
    const editorTextarea = page.locator('.w-md-editor textarea').first()
    await expect(editorTextarea).toBeVisible()

    // Type a message
    await editorTextarea.click()
    await editorTextarea.fill('Hello, this is a test message!')
    await expect(editorTextarea).toHaveValue('Hello, this is a test message!')
  })

  test('writing a message updates progress indicator', async ({ page }) => {
    await gotoApp(page)

    // Initially 0/3
    await expect(page.getByText('Complete: 0 of 3 steps')).toBeVisible()

    // Write a message
    const editorTextarea = page.locator('.w-md-editor textarea').first()
    await editorTextarea.click()
    await editorTextarea.fill('Test message')

    // Progress should advance to 1/3
    await expect(page.getByText('Complete: 1 of 3 steps')).toBeVisible()
  })

  test('can write multi-line messages', async ({ page }) => {
    await gotoApp(page)

    const editorTextarea = page.locator('.w-md-editor textarea').first()
    const multiLineMessage = 'Dear Friend,\n\nI hope you are doing well.\n\nBest regards'
    await editorTextarea.click()
    await editorTextarea.fill(multiLineMessage)

    await expect(editorTextarea).toHaveValue(multiLineMessage)
  })

  test('markdown formatting renders in preview', async ({ page }) => {
    await gotoApp(page)

    const editorTextarea = page.locator('.w-md-editor textarea').first()
    await editorTextarea.click()
    await editorTextarea.fill('**Bold text** and *italic text*')

    // The MDEditor live preview should render - give it time to process
    const preview = page.locator('.w-md-editor-preview').first()
    await expect(preview).toBeVisible()
  })

  test('can write a long message within limits', async ({ page }) => {
    await gotoApp(page)

    const editorTextarea = page.locator('.w-md-editor textarea').first()
    const longMessage = 'A'.repeat(400) // Well within 500 char limit
    await editorTextarea.click()
    await editorTextarea.fill(longMessage)

    await expect(editorTextarea).toHaveValue(longMessage)
  })

  test('message persists when navigating between sections', async ({ page }) => {
    await gotoApp(page)

    // Write a message
    const editorTextarea = page.locator('.w-md-editor textarea').first()
    await editorTextarea.click()
    await editorTextarea.fill('Persistent message')

    // Scroll to address form and interact
    await page.locator('h2:has-text("Recipient Address")').scrollIntoViewIfNeeded()

    // Scroll back and verify message is still there
    await page.locator('h2:has-text("Message Content")').scrollIntoViewIfNeeded()
    await expect(editorTextarea).toHaveValue('Persistent message')
  })

  test('markdown label shows hint about live preview', async ({ page }) => {
    await gotoApp(page)
    await expect(page.getByText('Markdown with live preview')).toBeVisible()
  })

  test('empty message does not count toward progress', async ({ page }) => {
    await gotoApp(page)

    // The editor starts empty - should be 0/3
    await expect(page.getByText('Complete: 0 of 3 steps')).toBeVisible()

    // Type whitespace only
    const editorTextarea = page.locator('.w-md-editor textarea').first()
    await editorTextarea.click()
    await editorTextarea.fill('   ')

    // Should still be 0/3 (message.trim() is empty)
    await expect(page.getByText('Complete: 0 of 3 steps')).toBeVisible()
  })
})
