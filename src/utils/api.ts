import { ToolboxTalk, QueuedSubmission } from '../types';
import { storage } from './storage';

const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK;

export const api = {
  submitTalk: async (talk: ToolboxTalk): Promise<boolean> => {
    if (!WEBHOOK_URL) {
      console.warn('No webhook URL configured');
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          talk,
          timestamp: Date.now(),
          type: 'toolbox_talk'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error('Submission failed:', error);
      
      // Add to offline queue
      const queuedSubmission: QueuedSubmission = {
        id: `queue_${Date.now()}`,
        talk,
        timestamp: Date.now(),
        retryCount: 0
      };
      
      storage.addToQueue(queuedSubmission);
      return false;
    }
  },

  processQueue: async (): Promise<void> => {
    const queue = storage.getQueue();
    
    for (const submission of queue) {
      try {
        const success = await api.submitTalk(submission.talk);
        
        if (success) {
          storage.removeFromQueue(submission.id);
        } else {
          // Increment retry count
          submission.retryCount++;
          if (submission.retryCount >= 3) {
            storage.removeFromQueue(submission.id);
          }
        }
      } catch (error) {
        console.error('Queue processing error:', error);
      }
    }
  },

  isOnline: (): boolean => {
    return navigator.onLine;
  }
};