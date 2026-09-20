import { devices } from '@playwright/test';
import base from './playwright.config.mjs';
export default { ...base, testDir: './tests/mobile', outputDir: './mobile-results', projects: [
  { name: 'android-chrome-emulation', use: { ...devices['Pixel 5'], browserName: 'chromium', launchOptions: { timeout: 30000 } } },
  { name: 'iphone-safari-emulation', use: { ...devices['iPhone 13'], browserName: 'webkit', launchOptions: { timeout: 30000 } } },
] };
