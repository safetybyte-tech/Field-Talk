import { ToolboxTalk } from '../types';
import { auth } from './auth';
import { storage } from './storage';

const workerEndpoint = (path: string): string => {
  const workerUrl = import.meta.env.VITE_WORKER_URL;
  if (!workerUrl) {
    throw new Error('Worker URL not configured. Please add VITE_WORKER_URL to your environment variables.');
  }

  return `${workerUrl.replace(/\/$/, '')}${path}`;
};

const sendTalkEmail = async (talk: ToolboxTalk): Promise<void> => {
  const accessToken = await auth.getAccessToken();
  if (!accessToken) {
    throw new Error('Not authenticated. Please sign in again.');
  }

  const response = await fetch(workerEndpoint('/send-talk'), {
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
};

export const api = {
  /** Email the talk, then mark it as submitted and persist. */
  submitTalk: async (talk: ToolboxTalk, userId: string): Promise<ToolboxTalk> => {
    const submittedTalk: ToolboxTalk = {
      ...talk,
      submittedAt: Date.now(),
    };

    await sendTalkEmail(submittedTalk);
    return storage.saveTalk(submittedTalk, userId);
  },

  isOnline: (): boolean => {
    return navigator.onLine;
  },
};
