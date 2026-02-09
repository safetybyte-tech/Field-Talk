import { ToolboxTalk } from '../types';
import { storage } from './storage';

export const api = {
  /** Mark a talk as submitted (sets submitted_at) and persist. */
  submitTalk: async (talk: ToolboxTalk, userId: string): Promise<ToolboxTalk> => {
    const submittedTalk: ToolboxTalk = {
      ...talk,
      submittedAt: Date.now(),
    };
    return storage.saveTalk(submittedTalk, userId);
  },

  isOnline: (): boolean => {
    return navigator.onLine;
  },
};
