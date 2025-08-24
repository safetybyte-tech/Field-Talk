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
    // Keep only last 50 toolbox talks
    const limitedToolboxTalks = talks.slice(0, 50);
    localStorage.setItem(STORAGE_KEYS.TALKS, JSON.stringify(limitedToolboxTalks));
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

  deleteTalk: (id: string): void => {
    const talks = storage.getTalks().filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TALKS, JSON.stringify(talks));
  },

  // Recent Attendees
  saveRecentAttendees: (attendees: Attendee[]): void => {
    const currentNames = storage.getRecentAttendees();
    // Only save non-temporary attendees to the recent list
    const newNames = attendees
      .filter(a => !a.isTemporary)
      .map(a => a.name);
    
    // Combine new names with existing, removing duplicates and keeping most recent
    const allNames = [...newNames, ...currentNames];
    const uniqueNames = Array.from(new Set(allNames));
    
    // Keep only the most recent 20
    const recentNames = uniqueNames.slice(0, 20);
    
    localStorage.setItem(STORAGE_KEYS.ATTENDEES, JSON.stringify(recentNames));
  },

  getRecentAttendees: (): string[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ATTENDEES);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  removeRecentAttendee: (nameToRemove: string): void => {
    const currentNames = storage.getRecentAttendees();
    const updatedNames = currentNames.filter(name => name !== nameToRemove);
    localStorage.setItem(STORAGE_KEYS.ATTENDEES, JSON.stringify(updatedNames));
  }
};