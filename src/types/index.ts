export interface ToolboxTalk {
  id: string;
  title: string;
  content: string;
  date: string;
  location: string;
  projectNumber: string;
  weather: string;
  supervisor: string;
  supervisorEmail: string;
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

export interface StructuredTalkContent {
  i: string; // Introduction (1-2 sentences)
  hazards: string[]; // Hazards (max 4 items, ≤12 words each)
  practices: string[]; // Personal Protective Equipment (max 4 items, ≤12 words each)
  ppe: string[]; // Pre-task planning (max 4 items, ≤12 words each)
  sif: string[]; // Serious injury/fatality prevention (max 4 items, ≤12 words each)
  manual: string[]; // Material handling (max 4 items, ≤12 words each)
  q: string[]; // Questions (max 4 items, ≤12 words each)
}

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  trade?: string;
  customTrade?: string;
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