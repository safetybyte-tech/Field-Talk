// Rasterize the existing microphone mark for mobile home-screen installation.
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const svg = await readFile(new URL('../public/voice-test-icon.svg', import.meta.url), 'utf8');
  await page.setContent(`<style>body{margin:0}svg{width:100vw;height:100vh;display:block}</style>${svg}`);
  for (const size of [192, 512]) {
    await page.setViewportSize({ width: size, height: size });
    await page.screenshot({ path: new URL(`../public/icon-${size}.png`, import.meta.url).pathname });
  }
} finally { await browser.close(); }
