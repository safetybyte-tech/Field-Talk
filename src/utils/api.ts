import { ToolboxTalk } from '../types';
import { auth } from './auth';
import { hasCurrentApproval } from './recordReview';

const workerEndpoint = (path: string): string => {
  const workerUrl = import.meta.env.VITE_WORKER_URL;
  if (!workerUrl) {
    throw new Error('Worker URL not configured. Please add VITE_WORKER_URL to your environment variables.');
  }

  return `${workerUrl.replace(/\/$/, '')}${path}`;
};

const sendTalkEmail = async (talk: ToolboxTalk): Promise<ToolboxTalk> => {
  if (!talk.deliveryPending && !hasCurrentApproval(talk)) throw new Error('Review this version and sign again before sending.');
  const accessToken = await auth.getAccessToken();
  if (!accessToken) {
    throw new Error('Not authenticated. Please sign in again.');
  }

  const response = await fetch(workerEndpoint('/v2/send-talk'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ talk }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(errorData.error || `Email send failed: ${response.status}`);
  }
  const result = await response.json() as { talk?: ToolboxTalk };
  if (!result.talk?.submittedAt || result.talk.id !== talk.id) {
    throw new Error('Delivery confirmation is incomplete. Retry to check the same delivery.');
  }
  return result.talk;
};

export const api = {
  /** The worker durably records delivery and files the talk before confirming. */
  submitTalk: sendTalkEmail,

  isOnline: (): boolean => {
    return navigator.onLine;
  },
};
