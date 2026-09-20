import { test, expect } from '@playwright/test';
const openDraft = async page => {
  await page.goto('/tests/fixtures/app.html');
  await page.getByRole('button', { name: /Unfinished/ }).click();
};
const setup = async (page, changes) => page.evaluate(changes => Object.assign(window.fixture, changes), changes);
const noOverflow = async page => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

const browserErrors = new WeakMap();
test.beforeEach(async ({ page }) => {
  const errors = [];
  browserErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://**/*', route => route.abort());
});

test.afterEach(async ({ page }) => expect(browserErrors.get(page)).toEqual([]));

test('home saves the latest editor content before leaving', async ({ page }) => {
  await openDraft(page);
  await page.getByRole('textbox', { name: 'Your words' }).fill('Latest unsaved notes');
  await page.getByRole('button', { name: 'Go to Field Talk home' }).click();
  await expect(page.getByRole('button', { name: /Start today/ })).toBeVisible();
  expect(await page.evaluate(() => window.fixture.talks[0].notes)).toBe('Latest unsaved notes');
});

test('failed save keeps the current step and edits for retry', async ({ page }) => {
  await openDraft(page);
  await setup(page, { failSave: true });
  await page.getByRole('textbox', { name: 'Your words' }).fill('Keep these notes');
  await page.getByRole('button', { name: 'Next — the crew' }).click();
  await expect(page.getByRole('alert').filter({ hasText: /Connection lost/ })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Your words' })).toHaveValue('Keep these notes');
  await setup(page, { failSave: false });
  await page.getByRole('button', { name: 'Next — the crew' }).click();
  await expect(page.getByRole('heading', { name: 'Who stood there and listened?' })).toBeVisible();
});

test('new draft cannot issue overlapping inserts or lose its persisted ID', async ({ page }) => {
  await page.goto('/tests/fixtures/app.html');
  await page.getByRole('button', { name: /Start today/ }).click();
  await page.getByRole('textbox', { name: 'Your words' }).fill('New draft notes');
  await setup(page, { saveDelay: 700 });
  await page.getByRole('button', { name: 'Save draft', exact: true }).dblclick();
  await expect.poll(() => page.evaluate(() => window.fixture.talks.length)).toBe(2);
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeEnabled();
  await page.getByRole('textbox', { name: 'Your words' }).fill('Second save');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.fixture.talks[0].notes)).toBe('Second save');
  expect(await page.evaluate(() => window.fixture.talks.length)).toBe(2);
});

for (const width of [375, 390, 768, 1280]) test(`main screens fit at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 844 });
  await openDraft(page);
  await noOverflow(page);
  await page.getByRole('button', { name: 'Next — the crew' }).click();
  await noOverflow(page);
  await page.getByPlaceholder('Add someone by name').fill('A Crew Member');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Next — send it' }).click();
  await page.getByRole('button', { name: 'Someone else' }).click();
  await noOverflow(page);
  await page.getByPlaceholder('Name', { exact: true }).fill('Site Supervisor');
  await page.getByPlaceholder('email@company.com').fill('long.supervisor.address.for.the.project@example.com');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await noOverflow(page);
  const signOff = page.getByRole('checkbox', { name: /I gave this talk/ });
  await signOff.scrollIntoViewIfNeeded();
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  const box = await signOff.boundingBox();
  const footer = await page.locator('fieldset > .fixed').boundingBox();
  expect(box.y + box.height).toBeLessThanOrEqual(footer.y);
  await page.screenshot({ path: testInfo.outputPath(`send-${width}.png`), fullPage: true });
  await page.getByRole('button', { name: 'Open records' }).click();
  await noOverflow(page);
  await page.getByRole('button', { name: /Open QA Reviewer profile/ }).click();
  await noOverflow(page);
  await page.screenshot({ path: testInfo.outputPath(`profile-${width}.png`), fullPage: true });
});

test('header navigation waits for saves and stays in the editor on failure', async ({ page }) => {
  await openDraft(page);
  await setup(page, { failSave: true, saveDelay: 500 });
  await page.getByRole('textbox', { name: 'Your words' }).fill('Notes before navigating');
  await page.getByRole('button', { name: 'Open records' }).click();
  await expect(page.getByRole('textbox', { name: 'Your words' })).toBeDisabled();
  await expect(page.getByRole('alert').filter({ hasText: /Connection lost/ })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Your words' })).toHaveValue('Notes before navigating');
  await setup(page, { failSave: false });
  await page.getByRole('button', { name: 'Open records' }).click();
  await expect(page.getByRole('heading', { name: 'Outbox', exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.fixture.talks[0].notes)).toBe('Notes before navigating');
});

test('returning crew can all be checked and malformed recipients stay out of the record', async ({ page }) => {
  await openDraft(page);
  await page.getByRole('button', { name: 'Next — the crew' }).click();
  await page.getByRole('button', { name: 'All here' }).click();
  await expect(page.getByRole('button', { name: 'Returning Crew Member Present' })).toBeVisible();
  await page.getByRole('button', { name: 'Next — send it' }).click();
  await page.getByRole('button', { name: 'Someone else' }).click();
  await page.getByPlaceholder('Name', { exact: true }).fill('Invalid Recipient');
  await page.getByPlaceholder('email@company.com').fill('not-an-email');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: /valid email/ })).toBeVisible();
  await page.getByPlaceholder('email@company.com').fill('recipient@example.com');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: /already on the list/ })).toBeVisible();
});

test('all submitted records remain reachable beyond the tenth record', async ({ page }) => {
  await page.goto('/tests/fixtures/app.html?history');
  await page.getByRole('button', { name: 'Open records' }).click();
  await expect(page.getByRole('heading', { name: 'Filed record 12', exact: true })).toBeVisible();
  await page.getByRole('heading', { name: 'Filed record 12', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Topic' })).toHaveValue('Filed record 12');
});

test('generation, review, PDF, send failure/retry and filing preserve the approved record', async ({ page }) => {
  let sendCount = 0;
  const { record } = await import('../fixtures/record.mjs');
  const fixture = record();
  await page.route('https://worker.invalid/v2/generate-talk', route => route.fulfill({ json: { content: fixture.content, harness: fixture.harness } }));
  await page.route('https://worker.invalid/send-talk', route => {
    sendCount++;
    return route.fulfill(sendCount === 1 ? { status: 503, json: { error: 'Mail service unavailable; retry.' } } : { json: { ok: true } });
  });
  await page.goto('/tests/fixtures/app.html');
  await page.getByRole('button', { name: /Start today/ }).click();
  await page.getByRole('textbox', { name: 'Your words' }).fill(fixture.notes);
  await page.getByRole('button', { name: 'Write it up', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Topic' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Topic' }).fill('New generated trench talk');
  await page.getByRole('button', { name: 'Next — the crew' }).click();
  await page.getByRole('button', { name: 'All here' }).click();
  await page.getByLabel('Location', { exact: true }).fill('Synthetic site');
  await page.getByLabel('Weather', { exact: true }).fill('Rain');
  await page.getByRole('button', { name: 'Next — send it' }).click();
  await page.getByRole('button', { name: 'Someone else' }).click();
  await page.getByPlaceholder('Name', { exact: true }).fill('QA inbox');
  await page.getByPlaceholder('email@company.com').fill('qa@example.com');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const acknowledgement = page.getByRole('checkbox', { name: /I checked each review item/ });
  if (await acknowledgement.isVisible()) await acknowledgement.check();
  await page.getByRole('checkbox', { name: /I gave this talk/ }).click();
  await expect(page.getByRole('checkbox', { name: /I gave this talk/ })).toBeChecked();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Read it in full' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  await page.getByRole('button', { name: 'Send to 1', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: /Mail service unavailable/ })).toBeVisible();
  expect(await page.evaluate(() => window.fixture.talks.filter(t => t.submittedAt).length)).toBe(0);
  await setup(page, { failRecent: true });
  await page.getByRole('button', { name: 'Send to 1', exact: true }).click();
  await expect(page.getByRole('heading', { name: "That's today handled." })).toBeVisible();
  await page.getByRole('button', { name: 'Open records' }).click();
  await expect(page.getByRole('heading', { name: 'Submitted (1)', exact: true })).toBeVisible();
  const saved = await page.evaluate(() => window.fixture.talks.find(t => t.submittedAt));
  expect(saved.title).toBe('New generated trench talk');
  expect(saved.approved).toBe(true);
  expect(saved.notes).toBe(fixture.notes);
  expect(sendCount).toBe(2);
});

test('record loading errors offer a retry instead of claiming an empty account', async ({ page }) => {
  await page.goto('/tests/fixtures/app.html?failLoad');
  await expect(page.getByRole('alert')).toContainText('Your records could not be loaded');
  await expect(page.getByText('Nothing logged yet today.')).not.toBeVisible();
  await setup(page, { failLoad: false });
  await page.getByRole('button', { name: 'Retry loading records' }).click();
  await expect(page.getByRole('button', { name: /Unfinished/ })).toBeVisible();
});

test('offline feedback does not promise storage or automatic delivery', async ({ page }) => {
  await openDraft(page);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.getByText(/No signal/)).toContainText('nothing sends automatically');
  await setup(page, { failSave: true });
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: /Connection lost/ })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByText(/No signal/)).not.toBeVisible();
});

test('login, profile update, password change and logout work at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto('/tests/fixtures/app.html?signedOut');
  await noOverflow(page);
  await page.getByPlaceholder('your@email.com').fill('reviewer@example.com');
  await page.getByPlaceholder('••••••••').fill('fixture-password');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.getByRole('button', { name: /Open QA Reviewer profile/ }).click();
  await page.getByPlaceholder('Your full name').fill('Updated Reviewer');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect.poll(() => page.evaluate(() => window.fixture.profileUpdates)).toBe(1);
  await expect(page.getByRole('button', { name: /Start today/ })).toBeVisible();
  await page.getByRole('button', { name: /Open Updated Reviewer profile/ }).click();
  await page.getByRole('button', { name: 'Change Password', exact: true }).click();
  await page.getByPlaceholder('New password (min 6 characters)').fill('changed-fixture-password');
  await page.getByPlaceholder('Confirm new password').fill('changed-fixture-password');
  await page.getByRole('button', { name: 'Update Password' }).click();
  await expect.poll(() => page.evaluate(() => window.fixture.passwordChanges)).toBe(1);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
});

test('signup and password recovery forms remain usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tests/fixtures/app.html?signedOut');
  await page.getByRole('button', { name: "Don't have an account? Sign up" }).click();
  await page.getByPlaceholder('your@email.com').fill('new@example.com');
  await page.getByPlaceholder('username', { exact: true }).fill('fixture');
  await page.getByPlaceholder('John Smith').fill('Fixture User');
  await page.getByPlaceholder('••••••••').fill('fixture-password');
  await noOverflow(page);
  await page.getByRole('button', { name: 'Create Account', exact: true }).click();
  await expect(page.getByRole('button', { name: /Start today/ })).toBeVisible();
  await page.goto('/tests/fixtures/app.html?signedOut');
  await page.getByRole('button', { name: 'Forgot your password?' }).click();
  await page.getByPlaceholder('your@email.com').fill('reviewer@example.com');
  await page.getByRole('button', { name: 'Send Reset Email' }).click();
  await expect(page.getByText('Password reset email sent. Check your inbox for the reset link.')).toBeVisible();
  expect(await page.evaluate(() => window.fixture.passwordResets)).toEqual(['reviewer@example.com']);
  await page.goto('/tests/fixtures/app.html#type=recovery&token_hash=fixture');
  await expect(page.getByRole('heading', { name: 'Set New Password' })).toBeVisible();
  await page.getByPlaceholder('••••••••').nth(0).fill('new-fixture-password');
  await page.getByPlaceholder('••••••••').nth(1).fill('new-fixture-password');
  await page.getByRole('button', { name: 'Update Password' }).click();
  await expect.poll(() => page.evaluate(() => window.fixture.passwordChanges)).toBe(1);
  await expect(page).not.toHaveURL(/token_hash/);
});

test('a template remains editable after generation is unavailable', async ({ page }) => {
  await page.route('https://worker.invalid/v2/generate-talk', route => route.fulfill({ status: 503, json: { error: 'Writing assistance unavailable' } }));
  await page.goto('/tests/fixtures/app.html');
  await page.getByRole('button', { name: /Start today/ }).click();
  await page.getByRole('textbox', { name: 'Your words' }).fill('Roof repairs');
  await page.getByRole('button', { name: 'Write it up', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Writing assistance unavailable');
  const template = page.locator('main button').filter({ hasText: 'Fall Protection' }).first();
  await template.click();
  await expect(page.getByRole('textbox', { name: 'Topic' })).toBeVisible();
  await page.getByRole('button', { name: 'Next — the crew' }).click();
  await expect(page.getByRole('heading', { name: 'Who stood there and listened?' })).toBeVisible();
});
