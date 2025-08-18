import { ToolboxTalk, QueuedSubmission, Attendee } from '../types';

const STORAGE_KEYS = {
  TALKS: 'toolbox_talks',
  QUEUE: 'submission_queue',
  ATTENDEES: 'recent_attendees',
  SETTINGS: 'app_settings'
};

export const storage = {
  // Toolbox Talks
  saveTalk: (talk: ToolboxTalk): void => {
    const talks = storage.getTalks();
    const existingIndex = talks.findIndex(t => t.id === talk.id);
    
    if (existingIndex >= 0) {
      talks[existingIndex] = talk;
    } else {
      talks.unshift(talk);
    }
    
    // Keep only last 50 talks
    const limitedTalks = talks.slice(0, 50);
    localStorage.setItem(STORAGE_KEYS.TALKS, JSON.stringify(limitedTalks));
  },

  getTalks: (): ToolboxTalk[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TALKS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  getTalk: (id: string): ToolboxTalk | null => {
    const talks = storage.getTalks();
    return talks.find(t => t.id === id) || null;
  },

  // Submission Queue
  addToQueue: (submission: QueuedSubmission): void => {
    const queue = storage.getQueue();
    queue.push(submission);
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
  },

  getQueue: (): QueuedSubmission[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.QUEUE);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  removeFromQueue: (id: string): void => {
    const queue = storage.getQueue().filter(q => q.id !== id);
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
  },

  // Recent Attendees
  saveRecentAttendees: (attendees: Attendee[]): void => {
    const names = attendees.map(a => a.name);
    localStorage.setItem(STORAGE_KEYS.ATTENDEES, JSON.stringify(names));
  },

  getRecentAttendees: (): string[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ATTENDEES);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
};