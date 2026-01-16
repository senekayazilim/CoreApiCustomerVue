import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for ONAYLARIM Prime API Demo tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* Run tests in files in parallel */
  fullyParallel: false, // Sequential for signature tests
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests - signature tests need sequential execution */
  workers: 1,
  
  /* Reporter to use */
  reporter: [
    ['html', { 
      open: 'never',
      outputFolder: 'playwright-report' // Her çalıştırmada üzerine yazar
      // Eski raporları saklamak için: outputFolder: `playwright-report-${new Date().toISOString().replace(/:/g, '-')}`
    }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }] // JSON raporu ekle
  ],
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: 'http://localhost:4000',

    /* Collect trace when retrying the failed test */
    trace: 'retain-on-failure', // 'on' for always, 'retain-on-failure' for failed tests only
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video recording */
    video: 'retain-on-failure',
    
    /* Longer timeout for signature operations */
    actionTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Need to run headed for file dialogs and smart card access
        headless: false,
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  /* Global timeout for each test */
  timeout: 120000, // 2 minutes for signature operations
  
  /* Expect timeout */
  expect: {
    timeout: 10000,
  },
});
