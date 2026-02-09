import { supabase } from './supabase';

export const logger = {
  /** Log an event to the Supabase logs table. Fire-and-forget. */
  logEvent: (userId: string, talkId: string, eventName: string, payload?: Record<string, unknown>): void => {
    supabase
      .from('logs')
      .insert({
        user_id: userId,
        talk_id: talkId || null,
        event_name: eventName,
        payload: payload ?? null,
      })
      .then(({ error }) => {
        if (error) console.warn('Failed to log event:', error.message);
      });
  },

  /** Get logs for a specific talk (used before submission). */
  getLogsForTalk: async (talkId: string) => {
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .eq('talk_id', talkId)
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('Failed to fetch logs:', error.message);
      return [];
    }
    return data || [];
  },

  /** Clear logs for a talk after submission. */
  clearLogsForTalk: async (talkId: string): Promise<void> => {
    const { error } = await supabase
      .from('logs')
      .delete()
      .eq('talk_id', talkId);
    if (error) console.warn('Failed to clear logs:', error.message);
  },

  /** Timer helpers stay in sessionStorage (ephemeral, per-tab). */
  startTimer: (key: string): void => {
    try {
      sessionStorage.setItem(`timer_${key}`, Date.now().toString());
    } catch {
      // ignore
    }
  },

  getElapsedTime: (key: string): number => {
    try {
      const startTime = sessionStorage.getItem(`timer_${key}`);
      if (startTime) {
        const elapsed = Date.now() - parseInt(startTime, 10);
        sessionStorage.removeItem(`timer_${key}`);
        return elapsed;
      }
    } catch {
      // ignore
    }
    return 0;
  },
};
