import { test, expect } from '@playwright/test';
import { record, user } from '../fixtures/record.mjs';
import { modules } from '../helpers/load-typescript.mjs';

const recovery = modules()('src/utils/draftRecovery.ts');
const review = modules()('src/utils/recordReview.ts');
const key = `field-talk-recovery-v1:${user.id}`;
test.beforeEach(async ({ page }) => { await page.route('https://**/*', route => route.abort()); });

test('offline edit survives closing, opens under the same account, and saves after reconnecting', async ({ page }) => {
  await page.goto('/tests/fixtures/app.html');
  await page.getByRole('button', { name: /Unfinished/ }).click();
  await page.evaluate(() => { window.fixture.failSave = true; });
  await page.getByRole('textbox', { name: 'Your words' }).fill('Latest work detail after losing service');
  await expect(page.locator('fieldset > .fixed')).toContainText('Saved on this device');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByRole('alert').filter({ hasText: /Connection lost/ })).toBeVisible();
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/tests/fixtures/app.html?failLoad');
  await expect(page.getByRole('alert').filter({ hasText: /records could not be loaded/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Saved on this device' })).toBeVisible();
  await page.getByRole('button', { name: 'Recover unsigned draft' }).click();
  await expect(page.getByRole('textbox', { name: 'Your words' })).toHaveValue('Latest work detail after losing service');
  await page.evaluate(() => { window.fixture.failLoad = false; window.dispatchEvent(new Event('online')); });
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect.poll(() => page.evaluate(() => window.fixture.talks[0].notes)).toBe('Latest work detail after losing service');
  await expect(page.locator('fieldset > .fixed')).toContainText('Saved to your account');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBeNull();
});

test('local recovery stays with the account that created it', async ({ page }) => {
  await page.goto('/tests/fixtures/app.html');
  await page.getByRole('button', { name: /Unfinished/ }).click();
  await page.getByRole('textbox', { name: 'Your words' }).fill('First account only');
  await page.evaluate(() => window.fixture.emitAuth({ id: '00000000-0000-4000-8000-000000000099', name: 'Second account' }, 'SIGNED_IN'));
  await expect(page.getByRole('heading', { name: 'Saved on this device' })).not.toBeVisible();
  await page.evaluate(user => window.fixture.emitAuth(user, 'SIGNED_IN'), user);
  await expect(page.getByRole('button', { name: 'Recover unsigned draft' })).toBeVisible();
});

test('newer account record requires an explicit new draft copy', async ({ page }) => {
  await page.goto('/tests/fixtures/app.html');
  await page.getByRole('button', { name: /Unfinished/ }).click();
  await page.evaluate(() => { window.fixture.failSave = true; });
  await page.getByRole('textbox', { name: 'Your words' }).fill('Local version from disconnected crew');
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/tests/fixtures/app.html');
  await page.evaluate(() => {
    window.fixture.talks[0].notes = 'Different newer server version';
    window.dispatchEvent(new Event('online'));
  });
  await expect(page.getByText(/account record changed or was removed/)).toBeVisible();
  await page.getByRole('button', { name: 'Open as new draft' }).click();
  await expect(page.getByRole('textbox', { name: 'Your words' })).toHaveValue('Local version from disconnected crew');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect.poll(() => page.evaluate(() => window.fixture.talks.length)).toBe(2);
  expect(await page.evaluate(() => window.fixture.talks.find(t => t.notes === 'Different newer server version')?.id)).toBe(record().id);
});

test('a newer server edit blocks an open editor save and keeps the local copy', async ({ page }) => {
  await page.goto('/tests/fixtures/app.html');
  await page.getByRole('button', { name: /Unfinished/ }).click();
  await page.getByRole('textbox', { name: 'Your words' }).fill('Keep this local change');
  await page.evaluate(() => { window.fixture.talks[0].title = 'New server review'; });
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByRole('alert').filter({ hasText: /server record changed/ })).toBeVisible();
  expect(await page.evaluate(() => window.fixture.talks[0].notes)).not.toBe('Keep this local change');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key))[0].talk.notes, key)).toBe('Keep this local change');
  await page.getByRole('button', { name: 'Review local recovery' }).click();
  await expect(page.getByRole('button', { name: 'Open as new draft' })).toBeVisible();
});

for (const width of [375, 390, 768, 1280]) test(`recovery actions remain reachable at ${width}px`, async ({ page }) => {
  const initial = { ...record(), title: 'Saved trench briefing', draftStep: 1 };
  const entry = { version: 1, accountId: user.id, state: 'draft', talk: { ...initial, notes: 'Recover on mobile' }, baseVersion: recovery.talkVersion(initial), savedAt: Date.now() };
  await page.addInitScript(({ key, entry }) => localStorage.setItem(key, JSON.stringify([entry])), { key, entry });
  await page.setViewportSize({ width, height: 844 });
  await page.goto('/tests/fixtures/app.html');
  const button = page.getByRole('button', { name: 'Recover unsigned draft' });
  await expect(button).toBeVisible();
  await button.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await button.click();
  await expect(page.getByRole('textbox', { name: 'Your words' })).toHaveValue('Recover on mobile');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('device storage failure is visible and never claims local safety', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('quota exceeded'); }; });
  await page.goto('/tests/fixtures/app.html');
  await page.getByRole('button', { name: /Unfinished/ }).click();
  await page.getByRole('textbox', { name: 'Your words' }).fill('Cannot persist this edit');
  await expect(page.getByRole('alert').filter({ hasText: /could not be saved on this device/ })).toBeVisible();
  await expect(page.locator('fieldset > .fixed')).toContainText('Could not save on this device');
});

test('signed and pending local records never reopen as editable drafts or send on recovery', async ({ page }) => {
  const initial = { ...record(), title: 'Saved trench briefing', draftStep: 1 };
  const signed = review.signRecord(initial, user);
  const pending = { ...signed, deliveryPending: true };
  const baseVersion = recovery.talkVersion(initial);
  const entries = [
    { version: 1, accountId: user.id, state: 'signed', talk: { ...signed, id: 'signed-only' }, baseVersion, savedAt: 2 },
    { version: 1, accountId: user.id, state: 'pending-delivery', talk: pending, baseVersion, savedAt: 1 },
  ];
  await page.addInitScript(({ key, entries }) => localStorage.setItem(key, JSON.stringify(entries)), { key, entries });
  let sends = 0;
  await page.route('https://worker.invalid/v2/send-talk', route => { sends++; return route.abort(); });
  await page.goto('/tests/fixtures/app.html');
  await expect(page.getByText('This copy was signed. It cannot be restored as an editable draft.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Recover unsigned draft' })).not.toBeVisible();
  await page.getByRole('button', { name: 'Check delivery' }).click();
  await expect(page.getByRole('heading', { name: 'Check this delivery' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Your words' })).not.toBeVisible();
  expect(sends).toBe(0);
});

test('a signed account record stays read only and requires an explicit send', async ({ page }) => {
  const initial = { ...record(), title: 'Saved trench briefing', draftStep: 3 };
  const signed = review.signRecord(initial, user);
  let sends = 0;
  await page.route('https://worker.invalid/v2/send-talk', route => {
    sends++;
    const talk = { ...route.request().postDataJSON().talk, deliveryPending: false, submittedAt: Date.now() };
    return route.fulfill({ json: { talk } });
  });
  await page.goto('/tests/fixtures/app.html');
  await page.evaluate(signed => { window.fixture.talks = [signed]; window.dispatchEvent(new Event('online')); }, signed);
  await page.getByRole('button', { name: /Unfinished/ }).click();
  await expect(page.getByRole('heading', { name: 'Signed record' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Your words' })).not.toBeVisible();
  expect(sends).toBe(0);
  await page.getByRole('button', { name: 'Send signed record' }).click();
  await expect(page.getByRole('heading', { name: "That's today handled." })).toBeVisible();
  expect(sends).toBe(1);
});
