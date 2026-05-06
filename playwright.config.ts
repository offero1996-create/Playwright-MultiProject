import { defineConfig, devices } from '@playwright/test';
import { testConfig } from './config/testConfig';
import { loadEnv } from './config/env-loader';

// Load environment variables (root .env + project-specific .env.<TEST_ENV>)
loadEnv();

// Get configuration from .env
const headless = process.env.HEADLESS === 'true';
const baseURL = process.env.BASE_URL || 'https://app-corestage.platform.bloomifai.com/login';
const slowMotion = parseInt(process.env.SLOW_MOTION || '0', 10);
const timeout = parseInt(process.env.TIMEOUT || '30000', 10);

// Generate timestamp in IST (UTC+5:30) for unique reports
const istOptions: Intl.DateTimeFormatOptions = {
  timeZone: 'Asia/Kolkata',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false,
};
const istParts = new Intl.DateTimeFormat('en-GB', istOptions).formatToParts(new Date());
const p = (type: string) => istParts.find(p => p.type === type)!.value;
const timestamp = `${p('year')}-${p('month')}-${p('day')}_${p('hour')}-${p('minute')}-${p('second')}_IST`;

// Determine report folder based on --project CLI arg
const projectArg = process.argv.find(arg => arg.startsWith('--project'))
  ? process.argv[process.argv.indexOf('--project') + 1] || ''
  : '';
const reportProject = projectArg.startsWith('bloomlink')
  ? 'BloomLink'
  : projectArg.startsWith('bloomifai')
    ? 'Bloomifai'
    : '';
const htmlReportFolder = reportProject
  ? `./projects/${reportProject}/reports/${timestamp}`
  : `./reports/${timestamp}`;

export default defineConfig({
  // Default test directory - can be overridden by individual projects
  testDir: './projects',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? testConfig.retry.ciRetries : 0,
  workers: process.env.CI ? 1 : undefined,

  timeout: testConfig.timeouts.pageLoad + testConfig.timeouts.action,

  // HTML and list reporters enabled; custom validation reporter disabled to fix Test Explorer hanging
  reporter: [
    ['html', { outputFolder: htmlReportFolder, open: 'never' }],
    ['list'],
    // ['./reporters/validation-table-reporter.ts'],  // DISABLED - causes Test Explorer to hang on failed tests
  ],

  use: {
    baseURL: baseURL,
    headless: headless,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: timeout,
  },

  // Output directory for test artifacts
  outputDir: `./test-results/${timestamp}`,

  projects: [
    // ─────────────────────────────────────────────────────────────
    // BloomLink Project - Desktop Tests
    // ─────────────────────────────────────────────────────────────
    {
      name: 'bloomlink-chromium',
      testDir: './projects/BloomLink/tests',
      // outputDir removed - uses global outputDir setting
      use: {
        viewport: process.env.CI ? { width: 1920, height: 1080 } : null,
        launchOptions: {
          args: process.env.CI ? [] : ['--start-maximized'],
          slowMo: slowMotion,
        },
      },
    },
    {
      name: 'bloomlink-firefox',
      testDir: './projects/BloomLink/tests',
      // outputDir removed - uses global outputDir setting
      use: {
        viewport: process.env.CI ? { width: 1920, height: 1080 } : null,
        launchOptions: {
          args: process.env.CI ? [] : ['-width=1920', '-height=1080'],
          slowMo: slowMotion,
        },
      },
    },
    {
      name: 'bloomlink-webkit',
      testDir: './projects/BloomLink/tests',
      // outputDir removed - uses global outputDir setting
      use: {
        viewport: process.env.CI ? { width: 1920, height: 1080 } : null,
        launchOptions: {
          slowMo: slowMotion,
        },
      },
    },

    // ─────────────────────────────────────────────────────────────
    // Bloomifai Project - Desktop Tests
    // ─────────────────────────────────────────────────────────────
    {
      name: 'bloomifai-chromium',
      testDir: './projects/Bloomifai/tests',
      // outputDir removed - uses global outputDir setting
      use: {
        viewport: process.env.CI ? { width: 1920, height: 1080 } : null,
        launchOptions: {
          args: process.env.CI ? [] : ['--start-maximized'],
          slowMo: slowMotion,
        },
      },
    },
    {
      name: 'bloomifai-firefox',
      testDir: './projects/Bloomifai/tests',
      // outputDir removed - uses global outputDir setting
      use: {
        viewport: process.env.CI ? { width: 1920, height: 1080 } : null,
        launchOptions: {
          args: process.env.CI ? [] : ['-width=1920', '-height=1080'],
          slowMo: slowMotion,
        },
      },
    },
    {
      name: 'bloomifai-webkit',
      testDir: './projects/Bloomifai/tests',
      // outputDir removed - uses global outputDir setting
      use: {
        viewport: process.env.CI ? { width: 1920, height: 1080 } : null,
        launchOptions: {
          slowMo: slowMotion,
        },
      },
    },

    // ─────────────────────────────────────────────────────────────
    // Mobile Devices (shared for both projects)
    // ─────────────────────────────────────────────────────────────
    {
      name: 'mobile-chrome',
      testDir: './projects',
      use: {
        ...devices['Pixel 5'],
        launchOptions: {
          slowMo: slowMotion,
        },
      },
    },
    {
      name: 'mobile-safari',
      testDir: './projects',
      use: {
        ...devices['iPhone 12'],
        launchOptions: {
          slowMo: slowMotion,
        },
      },
    },
  ],
});
