import { LogEvent } from '../types';

const STORAGE_KEY = 'bolt_app_logs';

export const logger = {
  // Log an event for a specific talk
  logEvent: (talkId: string, eventName: string, payload?: Record<string, any>): void => {
    const logEvent: LogEvent = {
      id: `log_${Date.now()}_${Math.random()}`,
      talkId,
      eventName,
      timestamp: Date.now(),
      payload
    };

    try {
      const existingLogs = logger.getAllLogs();
      const updatedLogs = [...existingLogs, logEvent];
      
      // Keep only the last 1000 log events to prevent localStorage bloat
      const limitedLogs = updatedLogs.slice(-1000);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedLogs));
    } catch (error) {
      console.warn('Failed to save log event:', error);
    }
  },

  // Get all log events for a specific talk
  getLogsForTalk: (talkId: string): LogEvent[] => {
    try {
      const allLogs = logger.getAllLogs();
      return allLogs.filter(log => log.talkId === talkId);
    } catch {
      return [];
    }
  },

  // Get all log events
  getAllLogs: (): LogEvent[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  // Clear logs for a specific talk (after successful submission)
  clearLogsForTalk: (talkId: string): void => {
    try {
      const allLogs = logger.getAllLogs();
      const filteredLogs = allLogs.filter(log => log.talkId !== talkId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredLogs));
    } catch (error) {
      console.warn('Failed to clear logs for talk:', error);
    }
  },

  // Clear all logs (for development/debugging)
  clearAllLogs: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear all logs:', error);
    }
  },

  // Helper to start timing an operation
  startTimer: (key: string): void => {
    try {
      sessionStorage.setItem(`timer_${key}`, Date.now().toString());
    } catch (error) {
      console.warn('Failed to start timer:', error);
    }
  },

  // Helper to get elapsed time since timer started
  getElapsedTime: (key: string): number => {
    try {
      const startTime = sessionStorage.getItem(`timer_${key}`);
      if (startTime) {
        const elapsed = Date.now() - parseInt(startTime, 10);
        sessionStorage.removeItem(`timer_${key}`); // Clean up
        return elapsed;
      }
    } catch (error) {
      console.warn('Failed to get elapsed time:', error);
    }
    return 0;
  }
};