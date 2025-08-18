export interface ToolboxTalk {
  id: string;
  title: string;
  content: string;
  date: string;
  location: string;
  weather: string;
  supervisor: string;
  attendees: Attendee[];
  createdAt: number;
  submittedAt?: number;
}

export interface Attendee {
  id: string;
  name: string;
  present: boolean;
  signature?: string;
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