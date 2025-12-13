import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Go to the app
    await page.goto('http://localhost:5180/');

    // Wait for the app to load
    await page.waitForLoadState('networkidle');

    // Wait a bit more for any dynamic content
    await page.waitForTimeout(2000);

    // Take a full page screenshot
    await page.screenshot({
      path: 'theme_screenshot_full.png',
      fullPage: true
    });

    console.log('Screenshot saved as theme_screenshot_full.png');

    // Take a screenshot of just the form section
    const formElement = await page.locator('[data-testid="app"]').first();
    if (await formElement.isVisible()) {
      await formElement.screenshot({
        path: 'theme_screenshot_app.png'
      });
      console.log('App screenshot saved as theme_screenshot_app.png');
    }

  } catch (error) {
    console.error('Error taking screenshot:', error);
  } finally {
    await browser.close();
  }
})();