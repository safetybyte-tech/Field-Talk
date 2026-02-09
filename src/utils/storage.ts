import { ToolboxTalk, Attendee } from '../types';
import { supabase } from './supabase';

// Convert DB row to ToolboxTalk
function rowToTalk(row: Record<string, unknown>): ToolboxTalk {
  return {
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    date: row.date as string,
    location: row.location as string,
    projectNumber: (row.project_number as string) || '',
    weather: row.weather as string,
    supervisor: row.supervisor as string,
    supervisorEmail: (row.supervisor_email as string) || '',
    attendees: (row.attendees as Attendee[]) || [],
    recipients: (row.recipients as ToolboxTalk['recipients']) || [],
    createdAt: new Date(row.created_at as string).getTime(),
    submittedAt: row.submitted_at ? new Date(row.submitted_at as string).getTime() : undefined,
  };
}

// Convert ToolboxTalk to DB row for upsert
function talkToRow(talk: ToolboxTalk, userId: string) {
  return {
    user_id: userId,
    title: talk.title,
    content: talk.content,
    date: talk.date,
    location: talk.location,
    project_number: talk.projectNumber,
    weather: talk.weather,
    supervisor: talk.supervisor,
    supervisor_email: talk.supervisorEmail,
    attendees: talk.attendees,
    recipients: talk.recipients,
    submitted_at: talk.submittedAt ? new Date(talk.submittedAt).toISOString() : null,
  };
}

export const storage = {
  /** Save or update a talk. Returns the persisted talk (with real UUID on first save). */
  saveTalk: async (talk: ToolboxTalk, userId: string): Promise<ToolboxTalk> => {
    const isNew = talk.id.startsWith('talk_');

    if (isNew) {
      // INSERT — let Postgres generate UUID
      const { data, error } = await supabase
        .from('talks')
        .insert(talkToRow(talk, userId))
        .select()
        .single();
      if (error) throw error;
      return rowToTalk(data);
    } else {
      // UPDATE by existing UUID
      const { data, error } = await supabase
        .from('talks')
        .update(talkToRow(talk, userId))
        .eq('id', talk.id)
        .select()
        .single();
      if (error) throw error;
      return rowToTalk(data);
    }
  },

  /** Fetch all talks for the current user, newest first. */
  getTalks: async (userId: string): Promise<ToolboxTalk[]> => {
    const { data, error } = await supabase
      .from('talks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(rowToTalk);
  },

  /** Fetch a single talk by ID. */
  getTalk: async (id: string): Promise<ToolboxTalk | null> => {
    const { data, error } = await supabase
      .from('talks')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null; // not found
      throw error;
    }
    return rowToTalk(data);
  },

  /** Delete a talk by ID. */
  deleteTalk: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('talks')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /** Save attendees to the recent_attendees table (upsert by user+name). */
  saveRecentAttendees: async (attendees: Attendee[], userId: string): Promise<void> => {
    const nonTempNames = attendees
      .filter(a => !a.isTemporary)
      .map(a => a.name);

    if (nonTempNames.length === 0) return;

    const rows = nonTempNames.map(name => ({
      user_id: userId,
      name,
      last_used_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('recent_attendees')
      .upsert(rows, { onConflict: 'user_id,name' });
    if (error) throw error;
  },

  /** Get recent attendee names for the current user. */
  getRecentAttendees: async (userId: string): Promise<string[]> => {
    const { data, error } = await supabase
      .from('recent_attendees')
      .select('name')
      .eq('user_id', userId)
      .order('last_used_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return (data || []).map(row => row.name as string);
  },

  /** Remove a single attendee name from recent list. */
  removeRecentAttendee: async (name: string, userId: string): Promise<void> => {
    const { error } = await supabase
      .from('recent_attendees')
      .delete()
      .eq('user_id', userId)
      .eq('name', name);
    if (error) throw error;
  },
};
