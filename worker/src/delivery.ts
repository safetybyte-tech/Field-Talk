import type { ToolboxTalk } from '../../src/types';
import { encodeTalkContent } from '../../src/utils/talkMetadata';

interface DeliveryEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY?: string;
}
export interface Receipt {
  talk: ToolboxTalk;
  id: string;
  created_at: string;
  payload: string;
  provider_id: string | null;
}

async function rpc<T>(env: DeliveryEnv, name: string, body: object): Promise<T> {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    // Do not expose database details or any stored email payload to the browser.
    throw new Error('Delivery could not be confirmed. Reopen this saved record and retry to check the same delivery. If this continues, contact support.');
  }
  const bodyText = await response.text();
  return bodyText ? JSON.parse(bodyText) as T : undefined as T;
}

/** Persist the exact provider bytes once, reuse them on every retry and reload. */
export async function deliverTalk(env: DeliveryEnv, userId: string, talk: ToolboxTalk, payload: string, signerName: string): Promise<ToolboxTalk> {
  const receipt = await rpc<Receipt>(env, 'reserve_talk_delivery', {
    p_user_id: userId, p_signer_name: signerName, p_talk: talk, p_content: encodeTalkContent(talk), p_payload: payload,
  });
  return resumeDelivery(env, userId, receipt);
}

export async function findDelivery(env: DeliveryEnv, userId: string, talkId: string): Promise<Receipt | null> {
  return rpc<Receipt | null>(env, 'find_talk_delivery', { p_user_id: userId, p_talk_id: talkId });
}

/** A persisted, already-validated snapshot remains recoverable after code/profile changes. */
export async function resumeDelivery(env: DeliveryEnv, userId: string, receipt: Receipt): Promise<ToolboxTalk> {
  if (!receipt.provider_id) {
    // Resend retains keys for 24h. Leave a 1h margin for clock skew/network delay.
    // Never blindly send an uncertain delivery once that protection may expire.
    const age = Date.now() - Date.parse(receipt.created_at);
    if (!Number.isFinite(age) || age < -60_000 || age >= 23 * 60 * 60 * 1000) {
      throw new Error('This delivery needs reconciliation. Contact support to check the email receipt; do not create another copy to resend.');
    }
    let response: Response;
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Idempotency-Key': `fieldtalk-${receipt.id}` },
        body: receipt.payload,
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new Error('The email service response was lost. Retry to check the same delivery.');
    }
    if (!response.ok) throw new Error('The email service could not confirm delivery. Retry to check the same delivery.');
    const result = await response.json().catch(() => ({})) as { id?: string };
    if (!result.id) throw new Error('The email receipt was incomplete. Retry to check the same delivery.');
    await rpc(env, 'acknowledge_talk_delivery', { p_user_id: userId, p_delivery_id: receipt.id, p_provider_id: result.id });
  }
  // If filing fails after acceptance, a retry skips the provider entirely.
  return rpc<ToolboxTalk>(env, 'complete_talk_delivery', { p_user_id: userId, p_delivery_id: receipt.id });
}
