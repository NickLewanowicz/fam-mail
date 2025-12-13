import { spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const exec = promisify(require('child_process').exec);

interface CaptureConfig {
  outputPath: string;
  projects: string[];
  reporter: string;
}

class ScreenshotCapture {
  private config: CaptureConfig;

  constructor(config: CaptureConfig) {
    this.config = config;
  }

  async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.access(this.config.outputPath);
    } catch {
      await fs.mkdir(this.config.outputPath, { recursive: true });
      console.log(`Created output directory: ${this.config.outputPath}`);
    }
  }

  async captureScreenshots(): Promise<void> {
    console.log('📸 Starting screenshot capture...');

    // Ensure output directory exists
    await this.ensureOutputDirectory();

    // Run Playwright tests to capture screenshots
    const command = `npx playwright test --config=playwright.config.ts --update-snapshots --reporter=${this.config.reporter}`;

    console.log(`Running: ${command}`);

    return new Promise((resolve, reject) => {
      const child = spawn('npx', [
        'playwright',
        'test',
        '--config=playwright.config.ts',
        '--update-snapshots',
        `--reporter=${this.config.reporter}`
      ], {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Screenshot capture completed successfully!');
          resolve();
        } else {
          console.error(`❌ Screenshot capture failed with code ${code}`);
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      child.on('error', (error) => {
        console.error('❌ Error running screenshot capture:', error);
        reject(error);
      });
    });
  }

  async organizeScreenshots(): Promise<void> {
    console.log('📁 Organizing screenshots...');

    const screenshotDir = path.join(this.config.outputPath, 'screenshots');

    // Create organized structure
    const directories = [
      'homepage',
      'form',
      'responsive',
      'components',
      'states',
      'storybook/components',
      'storybook/responsive',
      'storybook/interactions',
      'storybook/misc'
    ];

    for (const dir of directories) {
      const fullPath = path.join(screenshotDir, dir);
      await fs.mkdir(fullPath, { recursive: true });
    }

    console.log('✅ Screenshot directories organized');
  }

  async generateReport(): Promise<void> {
    const reportPath = path.join(this.config.outputPath, 'screenshot-report.md');

    const report = `# Screenshot Capture Report
Generated: ${new Date().toISOString()}

## Summary

This directory contains automated screenshots of the Fam-Mail application captured for visual regression testing.

## Directory Structure

### Application Screenshots

- **homepage/**: Main application screens in different states
  - \`empty-state-mobile.png\`: Initial empty state on mobile
  - \`empty-state-tablet.png\`: Initial empty state on tablet
  - \`empty-state-desktop.png\`: Initial empty state on desktop

- **form/**: Form validation and interaction states
  - \`validation-errors.png\`: Form with validation errors shown
  - \`filled-form.png\`: Form with all fields filled
  - Various input states (focus, hover, error)

- **responsive/**: Application layout at different viewport sizes
  - \`mobile-view.png\`: 375px width
  - \`tablet-view.png\`: 768px width
  - \`desktop-view.png\`: 1200px width
  - \`widescreen-view.png\`: 1920px width

- **components/**: Individual component screenshots
  - \`address-form-*.png\`: Address form in various states
  - \`submit-button-*.png\`: Button interaction states

- **states/**: Application state screenshots
  - \`backend-error.png\`: Error when backend is unavailable
  - \`submission-loading.png\`: Loading state during form submission
  - \`submission-success.png\`: Success message after submission

### Storybook Screenshots

- **storybook/components/**: Individual component stories
  - Organized by component name and variant
  - \`button-primary.png\`, \`button-secondary.png\`, etc.
  - \`addressform-default.png\`, \`addressform-with-errors.png\`, etc.

- **storybook/responsive/**: Components at different viewport sizes
  - Each component captured at mobile, tablet, and desktop sizes

- **storybook/interactions/**: Component interaction states
  - Hover, focus, active states for interactive components

- **storybook/misc/**: Additional component screenshots

## Usage

### Viewing Screenshots
Screenshots are organized for easy navigation. Use any image viewer to compare screenshots across different versions.

### Visual Regression Testing
To run visual regression tests:

\`\`\`bash
# Update screenshots (creates new baseline)
npm run test:visual:update

# Run tests against existing screenshots
npm run test:visual
\`\`\`

### Automated Comparison
When changes are made, run the visual tests to see differences:

\`\`\`bash
npx playwright test --config=playwright.config.ts
\`\`\`

Differences will be shown in the HTML report.

## Notes

- Screenshots are captured with consistent viewports and settings
- Animations are disabled to ensure consistent captures
- Full-page screenshots include the entire application viewport
- Component screenshots focus on the component itself, excluding Storybook chrome
`;

    await fs.writeFile(reportPath, report);
    console.log(`📄 Report generated: ${reportPath}`);
  }
}

// Run screenshot capture if this file is executed directly
if (require.main === module) {
  const config: CaptureConfig = {
    outputPath: 'tests/visual',
    projects: ['mobile', 'tablet', 'desktop'],
    reporter: 'list'
  };

  const capture = new ScreenshotCapture(config);

  capture.run()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Screenshot capture failed:', error);
      process.exit(1);
    });
}

// Add run method for programmatic usage
ScreenshotCapture.prototype.run = async function() {
  await this.organizeScreenshots();
  await this.captureScreenshots();
  await this.generateReport();
};

export { ScreenshotCapture };