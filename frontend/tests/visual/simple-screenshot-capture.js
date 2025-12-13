const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1200, height: 800 },
  widescreen: { width: 1920, height: 1080 },
};

async function captureScreenshots() {
  console.log('📸 Starting screenshot capture...');

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Create output directories
  const outputDir = path.join(__dirname, 'screenshots');
  ['homepage', 'form', 'responsive', 'components', 'states'].forEach(dir => {
    fs.mkdirSync(path.join(outputDir, dir), { recursive: true });
  });

  // Base URL
  const baseUrl = 'http://localhost:5178';

  try {
    // 1. Homepage empty state
    console.log('Capturing homepage...');
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(viewport);
      await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle2' });

      // Wait for app to load
      await page.waitForSelector('[data-testid="app"]', { timeout: 5000 });

      await page.screenshot({
        path: path.join(outputDir, 'homepage', `empty-state-${name}.png`),
        fullPage: true,
      });
      console.log(`✓ Homepage - ${name}`);
    }

    // 2. Form validation
    console.log('Capturing form validation...');
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle2' });

    // Click submit without filling form
    await page.click('[data-testid="submit-button"]');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(outputDir, 'form', 'validation-errors.png'),
      fullPage: true,
    });
    console.log('✓ Form validation errors');

    // 3. Filled form
    console.log('Capturing filled form...');
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle2' });

    // Fill in form
    await page.type('[data-testid="recipient-name"]', 'John Doe', { delay: 50 });
    await page.type('[data-testid="address-line1"]', '123 Main St', { delay: 50 });
    await page.type('[data-testid="address-city"]', 'San Francisco', { delay: 50 });
    await page.selectOption('[data-testid="address-state"]', 'CA');
    await page.type('[data-testid="address-zip"]', '94105', { delay: 50 });

    // Type message
    const messageEditor = await page.$('[data-testid="message-input"] textarea');
    if (messageEditor) {
      await messageEditor.type('Hello from Fam-Mail! This is a test message.', { delay: 50 });
    }

    await page.screenshot({
      path: path.join(outputDir, 'form', 'filled-form.png'),
      fullPage: true,
    });
    console.log('✓ Filled form');

    // 4. Component focus states
    console.log('Capturing component states...');
    await page.focus('[data-testid="recipient-name"]');
    await page.screenshot({
      path: path.join(outputDir, 'components', 'address-form-focus.png'),
      fullPage: true,
    });
    console.log('✓ Address form focus state');

    // 5. Generate report
    const report = `# Screenshot Capture Report
Generated: ${new Date().toISOString()}

## Screenshots Captured

### Homepage
- empty-state-mobile.png
- empty-state-tablet.png
- empty-state-desktop.png
- empty-state-widescreen.png

### Form
- validation-errors.png
- filled-form.png

### Components
- address-form-focus.png

## Total: 6 screenshots captured successfully
`;

    fs.writeFileSync(path.join(outputDir, 'screenshot-report.md'), report);
    console.log('✓ Report generated');

  } catch (error) {
    console.error('❌ Error capturing screenshots:', error);
  } finally {
    await browser.close();
    console.log('🎉 Screenshot capture complete!');
  }
}

// Run the capture
captureScreenshots().catch(console.error);