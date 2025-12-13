import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Go to the app (it's on port 5180 based on the output)
    await page.goto('http://localhost:5180/');

    // Wait for the app to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait for any CSS to apply

    // Take a full page screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    await page.screenshot({
      path: `../.claude_sessions/001/theme_screenshots/fixed_navy_theme_${timestamp}.png`,
      fullPage: true
    });

    console.log(`Screenshot saved: fixed_navy_theme_${timestamp}.png`);

  } catch (error) {
    console.error('Error taking screenshot:', error);
  } finally {
    await browser.close();
  }
})();