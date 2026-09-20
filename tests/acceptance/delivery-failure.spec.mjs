import { test, expect } from '@playwright/test';
import { deliveryHarness } from '../helpers/delivery-harness.mjs';

// Real App + Worker + PostgreSQL migration. Only auth and email provider are fake.
for (const recovery of ['retry', 'reload', 'lost provider response', 'lost browser response']) {
  test(`accepted email recovers via ${recovery} without sending twice`, async ({ page }, testInfo) => {
    test.setTimeout(45_000);
    const h = await deliveryHarness();
    try {
      await page.route('https://**/*', route => route.abort());
      await page.route('**/__qa/talks', async route => {
        try {
          const result = route.request().method() === 'POST' ? await h.saveDraft(route.request().postDataJSON()) : [await h.savedTalk()];
          await route.fulfill({ json: result });
        } catch { await route.fulfill({ status: 503, json: { error: 'Injected storage failure' } }); }
      });
      let loseBrowserResponse = recovery === 'lost browser response';
      h.faults.complete = ['retry', 'reload'].includes(recovery);
      h.faults.loseProviderResponse = recovery === 'lost provider response';
      await page.route('https://worker.invalid/v2/send-talk', async route => {
        const response = await h.send(route.request().postDataJSON().talk);
        if (loseBrowserResponse) { loseBrowserResponse = false; await route.abort('failed'); }
        else await route.fulfill({ status: response.status, body: await response.text(), contentType: 'application/json' });
      });
      await page.goto('/tests/fixtures/app.html?server');
      await page.getByRole('button', { name: /Unfinished/ }).click();
      await page.getByRole('button', { name: 'Next — the crew' }).click();
      await page.getByRole('button', { name: 'Next — send it' }).click();
      await expect(page.getByRole('heading', { name: "Sign it, then it's out of your hands." })).toBeVisible();
      await page.getByRole('checkbox', { name: /I checked each review item/ }).check();
      await page.getByRole('checkbox', { name: /I gave this talk/ }).click();
      await page.getByRole('button', { name: 'Send to 1', exact: true }).click();
      await expect(page.getByRole('alert').first()).toBeVisible();
      expect(h.provider.size).toBe(1);
      if (recovery !== 'lost browser response') expect((await h.savedTalk()).submittedAt).toBeUndefined();
      h.faults.complete = false;
      h.faults.loseProviderResponse = false;
      if (recovery === 'reload') {
        page.on('dialog', dialog => dialog.accept());
        await page.reload();
        await page.getByRole('button', { name: /Unfinished/ }).click();
        await expect(page.getByRole('heading', { name: 'Check this delivery' })).toBeVisible();
      }
      await page.getByRole('button', { name: 'Send to 1', exact: true }).click();
      await expect(page.getByRole('heading', { name: "That's today handled." })).toBeVisible();
      expect(h.provider.size, 'Only one email accepted across retries/reloads').toBe(1);
      expect((await h.savedTalk()).submittedAt).toBeTruthy();
      if (recovery !== 'lost provider response') expect(h.attempts.length).toBe(1);
      await testInfo.attach('delivery-evidence', { body: JSON.stringify({ recovery, acceptedEmails: h.provider.size, providerRequests: h.attempts.length, filed: true }), contentType: 'application/json' });
    } finally { await h.close(); }
  });
}
