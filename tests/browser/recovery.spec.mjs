import { test, expect } from '@playwright/test';
import { user } from '../fixtures/record.mjs';

test.beforeEach(async ({ page }) => { await page.route('https://**/*', route => route.abort()); });

test('session lookup failure leaves a usable sign-in screen', async ({ page }) => {
  await page.goto('/tests/fixtures/app.html?failSession');
  await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
  await expect(page.getByText('Loading...', { exact: true })).not.toBeVisible();
});

test('auth account changes clear an open editor and ignore the old account load', async ({ page }) => {
  await page.goto('/tests/fixtures/app.html');
  await page.getByRole('button', { name: /Unfinished/ }).click();
  await page.getByRole('textbox', { name: 'Topic' }).fill('Private first account draft');
  await page.evaluate(user => {
    window.fixture.loadDelay = 600;
    window.fixture.emitAuth({ ...user, name: 'Same account updated' }, 'USER_UPDATED');
  }, user);
  await page.waitForTimeout(100); // let the first account's intentionally delayed request start
  await page.evaluate(user => {
    window.fixture.talks = [];
    window.fixture.loadDelay = 0;
    window.fixture.emitAuth(null, 'SIGNED_OUT');
    window.fixture.emitAuth({ ...user, id: '00000000-0000-4000-8000-000000000099', name: 'Second account' }, 'SIGNED_IN');
  }, user);
  await expect(page.getByRole('heading', { name: 'Nothing logged yet today.' })).toBeVisible();
  await page.waitForTimeout(750); // old request resolves after new user's data
  await expect(page.getByRole('button', { name: /Unfinished/ })).not.toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Topic' })).not.toBeVisible();
});

test('record open and delete errors stay recoverable', async ({ page }) => {
  await page.goto('/tests/fixtures/app.html');
  await page.evaluate(() => { window.fixture.failOpen = true; });
  await page.getByRole('button', { name: /Unfinished/ }).click();
  await expect(page.getByRole('alert')).toContainText('could not be opened');
  await page.evaluate(() => { window.fixture.failOpen = false; window.fixture.failDelete = true; });
  await page.getByRole('button', { name: 'Open records' }).click();
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete this toolbox talk' }).click();
  await expect(page.getByRole('alert')).toContainText('could not be deleted');
  await expect(page.getByRole('heading', { name: 'Saved trench briefing' })).toBeVisible();
  await page.evaluate(() => { window.fixture.failDelete = false; });
  await page.getByRole('button', { name: 'Delete this toolbox talk' }).click();
  await expect(page.getByText('No toolbox talks yet')).toBeVisible();
});

test('new crew members are remembered for the next talk', async ({ page }) => {
  await page.goto('/tests/fixtures/app.html');
  await page.getByRole('button', { name: /Unfinished/ }).click();
  await page.getByRole('button', { name: 'Next — the crew' }).click();
  await page.getByPlaceholder('Add someone by name').fill('New returning member');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Next — send it' }).click();
  await expect.poll(() => page.evaluate(() => window.fixture.remembered)).toContain('New returning member');
});

test('quarter count uses calendar date and See all opens the full records list', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-20T16:00:00Z') });
  await page.goto('/tests/fixtures/app.html?history');
  await page.evaluate(user => {
    window.fixture.talks = ['2025-09-30','2026-06-30','2026-07-01','2026-09-30','2026-10-01'].map((date,i) => ({ ...window.fixture.talks[0], id: `count-${i}`, date }));
    window.fixture.emitAuth(user,'USER_UPDATED');
  },user);
  await expect(page.getByText(/records? this quarter/)).toContainText('2 records this quarter');
  await page.getByRole('button', { name: 'See all', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Submitted (5)' })).toBeVisible();
});

test('signup requiring email confirmation gives a next step and clears the password', async ({ page }) => {
  await page.goto('/tests/fixtures/app.html?signedOut&confirmSignup');
  await page.getByRole('button', { name: "Don't have an account? Sign up" }).click();
  await page.getByPlaceholder('your@email.com').fill('new@example.com');
  await page.getByPlaceholder('username', { exact: true }).fill('fixture');
  await page.getByPlaceholder('John Smith').fill('Fixture User');
  await page.getByPlaceholder('••••••••').fill('fixture-password');
  await page.getByRole('button', { name: 'Create Account', exact: true }).click();
  await expect(page.getByText('Check your inbox to confirm your email, then sign in.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
  await expect(page.getByPlaceholder('••••••••')).toHaveValue('');
});

test('expired recovery link explains how to request a replacement', async ({ page }) => {
  await page.goto('/tests/fixtures/app.html?signedOut#error=access_denied&error_code=otp_expired');
  await expect(page.getByText(/This sign-in or reset link has expired/)).toBeVisible();
  await page.getByRole('button', { name: 'Forgot your password?' }).click();
  await expect(page.getByRole('button', { name: 'Send Reset Email' })).toBeVisible();
});


test('leaving a saved profile cancels its delayed return navigation', async ({ page }) => {
  await page.goto('/tests/fixtures/app.html');
  await page.getByRole('button', { name: 'Open QA Reviewer profile' }).click();
  await page.getByPlaceholder('Your full name').fill('Updated Reviewer');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByText('Profile updated successfully!')).toBeVisible();
  await page.getByRole('button', { name: 'Go to Field Talk home' }).click();
  await page.getByRole('button', { name: /Start today/ }).click();
  await page.getByRole('textbox', { name: 'Your words' }).fill('Keep this new draft open');
  await page.waitForTimeout(1750); // cross the old profile's delayed navigation deadline
  await expect(page.getByRole('textbox', { name: 'Your words' })).toHaveValue('Keep this new draft open');
});

for (const destination of ['Go to Field Talk home', 'Open records', 'Open QA Reviewer profile']) {
  test(`unchanged saved draft can navigate to ${destination} when saving is unavailable`, async ({ page }) => {
    await page.goto('/tests/fixtures/app.html');
    await page.getByRole('button', { name: /Unfinished/ }).click();
    await page.evaluate(() => { window.fixture.failSave = true; });
    await page.getByRole('button', { name: destination, exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Topic' })).not.toBeVisible();
    expect(await page.evaluate(() => window.fixture.saves.length)).toBe(0);
  });
}
