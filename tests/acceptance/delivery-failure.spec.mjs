import { test, expect } from '@playwright/test';

// Release gate, separate from the passing regression suite. Uses the real
// App/API with simulated provider acceptance and storage failure. No email sent.
test('accepted email followed by filing failure can be retried without sending twice', async ({ page }, testInfo) => {
  const deliveries = [];
  await page.route('https://**/*', route => route.abort());
  await page.route('https://worker.invalid/send-talk', async route => {
    deliveries.push(route.request().postDataJSON().talk);
    await page.evaluate(() => { window.fixture.failSave = true; });
    await route.fulfill({ json: { ok: true, id: `accepted-${deliveries.length}` } });
  });
  await page.goto('/tests/fixtures/app.html');
  await page.getByRole('button', { name: /Unfinished/ }).click();
  await page.getByRole('button', { name: 'Next — the crew' }).click();
  await page.getByRole('button', { name: 'Next — send it' }).click();
  await expect(page.getByRole('heading', { name: "Sign it, then it's out of your hands." })).toBeVisible();
  const acknowledgement = page.getByRole('checkbox', { name: /I checked each review item/ });
  await expect(acknowledgement).toBeVisible();
  await acknowledgement.check();
  await page.getByRole('checkbox', { name: /I gave this talk/ }).click();
  await page.getByRole('button', { name: 'Send to 1', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: /Connection lost/ })).toBeVisible();
  const firstState = await page.evaluate(() => ({ filed: window.fixture.talks.filter(t => t.submittedAt).length, calls: window.fixture.saves.length }));
  await page.evaluate(() => { window.fixture.failSave = false; });
  await page.unroute('https://worker.invalid/send-talk');
  await page.route('https://worker.invalid/send-talk', async route => {
    deliveries.push(route.request().postDataJSON().talk);
    await route.fulfill({ json: { ok: true, id: `accepted-${deliveries.length}` } });
  });
  await page.getByRole('button', { name: 'Send to 1', exact: true }).click();
  await expect(page.getByRole('heading', { name: "That's today handled." })).toBeVisible();
  await testInfo.attach('delivery-evidence', { body: JSON.stringify({ firstState, deliveries: deliveries.map(t => ({ id: t.id, title: t.title, submittedAt: t.submittedAt })), filedAfterRetry: await page.evaluate(() => window.fixture.talks.filter(t => t.submittedAt).length) }, null, 2), contentType: 'application/json' });
  expect(deliveries.length, 'Retry should file the accepted delivery, not send a second email').toBe(1);
});
