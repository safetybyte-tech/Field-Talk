import { test, expect } from '@playwright/test';

// Device profiles emulate touch and viewport behavior, not physical microphones
// or OS keyboards. A reduced viewport approximates the keyboard's occupied area.
test('touch controls and sign-off remain reachable with a reduced viewport', async ({ page }, testInfo) => {
  await page.route('https://**/*', route => route.abort());
  await page.goto('/tests/fixtures/app.html');
  await page.getByRole('button', { name: /Unfinished/ }).tap();
  await page.getByRole('textbox', { name: 'Your words' }).fill('Synthetic crew discussion with edited task notes.');
  await page.getByRole('button', { name: 'Next — the crew' }).tap();
  await expect(page.getByRole('heading', { name: 'Who stood there and listened?' })).toBeVisible();
  const original = page.viewportSize();
  await page.setViewportSize({ width: original.width, height: 420 });
  await page.getByPlaceholder('Add someone by name').fill('Touch Test Crew Member');
  await page.getByRole('button', { name: 'Add', exact: true }).tap();
  await page.getByLabel('Location', { exact: true }).fill('Synthetic mobile site');
  await page.getByRole('button', { name: 'Next — send it' }).tap();
  await expect(page.getByRole('heading', { name: "Sign it, then it's out of your hands." })).toBeVisible();
  await page.getByRole('button', { name: 'Someone else' }).tap();
  await page.getByLabel('Recipient name').fill('Test Supervisor');
  await page.getByLabel('Recipient email').fill('long.address.for.touch.acceptance@example.com');
  await page.getByRole('button', { name: 'Add', exact: true }).tap();
  await page.setViewportSize(original);
  await page.getByRole('checkbox', { name: /I checked each review item/ }).check();
  await page.getByRole('checkbox', { name: /I gave this talk/ }).tap();
  await expect(page.getByRole('checkbox', { name: /I gave this talk/ })).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('touch-signoff.png'), fullPage: true });
});

test('unavailable dictation leaves typed input and draft saving usable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'SpeechRecognition', { value: undefined, configurable: true });
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined, configurable: true });
  });
  await page.route('https://**/*', route => route.abort());
  await page.goto('/tests/fixtures/app.html');
  await page.getByRole('button', { name: /Start today/ }).tap();
  await page.getByRole('button', { name: 'Tap and talk it through' }).tap();
  await expect(page.getByRole('alert')).toContainText('Voice dictation is not available');
  await page.getByRole('textbox', { name: 'Your words' }).fill('Typed fallback notes');
  await page.getByRole('button', { name: 'Save draft', exact: true }).tap();
  await expect.poll(() => page.evaluate(() => window.fixture.talks[0].notes)).toBe('Typed fallback notes');
});
