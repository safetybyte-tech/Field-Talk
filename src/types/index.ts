export interface ToolboxTalk {
  id: string;
  title: string;
  content: string;
  date: string;
  location: string;
  weather: string;
  supervisor: string;
  attendees: Attendee[];
  recipients: Recipient[];
  createdAt: number;
  submittedAt?: number;
}

export interface Attendee {
  id: string;
  name: string;
  present: boolean;
  isTemporary?: boolean;
  signature?: string;
}

export interface Recipient {
  id: string;
  name: string;
  email: string;
  selected: boolean;
  isDefault?: boolean;
}

export interface QueuedSubmission {
  id: string;
  talk: ToolboxTalk;
  timestamp: number;
  retryCount: number;
}

export interface TalkTemplate {
  id: string;
  title: string;
  content: string;
  category: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  trade?: string;
  createdAt: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface LogEvent {
  id: string;
  talkId: string;
  eventName: string;
  timestamp: number;
  payload?: Record<string, any>;
}