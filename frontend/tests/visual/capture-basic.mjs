import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

const SITES = {
  app: 'http://localhost:5173',
  storybook: 'http://localhost:6006'
};

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1200, height: 800 },
  { name: 'widescreen', width: 1920, height: 1080 }
];

const SCREENSHOT_DIR = 'tests/visual/screenshots';

async function ensureDir(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

async function captureScreenshots() {
  console.log('📸 Starting screenshot capture...');

  const browser = await puppeteer.launch({ headless: 'new' });

  try {
    // Capture main app
    console.log('Capturing main app screenshots...');
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport(viewport);

      const dir = path.join(SCREENSHOT_DIR, 'app', viewport.name);
      await ensureDir(dir);

      console.log(`  - Capturing ${viewport.name} view...`);
      await page.goto(SITES.app, { waitUntil: 'domcontentloaded' });

      // Wait for page to be fully loaded
      await new Promise(resolve => setTimeout(resolve, 2000));

      await page.screenshot({
        path: path.join(dir, 'homepage.png'),
        fullPage: true
      });

      await page.close();
    }

    // Capture Storybook homepage
    console.log('Capturing Storybook screenshots...');
    const storybookPage = await browser.newPage();
    await storybookPage.setViewport(VIEWPORTS[2]); // desktop

    await ensureDir(path.join(SCREENSHOT_DIR, 'storybook'));
    await storybookPage.goto(SITES.storybook, { waitUntil: 'domcontentloaded' });
    await storybookPage.waitForTimeout(2000);

    await storybookPage.screenshot({
      path: path.join(SCREENSHOT_DIR, 'storybook', 'homepage.png'),
      fullPage: true
    });

    await storybookPage.close();

    console.log('✅ Screenshot capture completed!');
    console.log(`📁 Screenshots saved to: ${SCREENSHOT_DIR}`);

  } finally {
    await browser.close();
  }
}

async function main() {
  await ensureDir(SCREENSHOT_DIR);
  await captureScreenshots();
}

main().catch(console.error);