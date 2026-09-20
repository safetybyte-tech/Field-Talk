import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../../src/App';
import { auth } from '../../src/utils/auth';
import { storage } from '../../src/utils/storage';
import { logger } from '../../src/utils/logger';
import { user, record } from './record.mjs';
import type { ToolboxTalk } from '../../src/types';
import '../../src/index.css';

// Real App/components, deterministic service boundaries. Never sends email or writes to a real account.
const initial = { ...record(), id: '00000000-0000-4000-8000-000000000002', title: 'Saved trench briefing', draftStep: 1 as const };
const params = new URLSearchParams(location.search);
const fixture = {
  talks: [initial] as ToolboxTalk[], saves: [] as ToolboxTalk[], saveDelay: 0,
  failOpen: false, failDelete: false, failSession: params.has('failSession'), loadDelay: 0,
  emitAuth: (() => undefined) as (next: typeof user | null, event: string) => void,
  failSave: false, failLoad: params.has('failLoad'), failRecent: false,
  remembered: [] as string[],
  passwordResets: [] as string[], passwordChanges: 0, profileUpdates: 0,
};
if (params.has('history')) fixture.talks = Array.from({ length: 12 }, (_, i) => ({ ...initial, id: `filed-${i}`, title: `Filed record ${i + 1}`, submittedAt: Date.now() }));
Object.assign(window, { fixture });
const fixtureUser = { ...user, username: 'qa', createdAt: 0 };
auth.getCurrentUser = async () => { if (fixture.failSession) throw new Error('Session unavailable'); return params.has('signedOut') ? null : fixtureUser; };
auth.login = async () => fixtureUser;
auth.register = async () => params.has('confirmSignup') ? null : fixtureUser;
auth.requestPasswordReset = async email => { fixture.passwordResets.push(email); };
auth.changePassword = async () => { fixture.passwordChanges++; };
auth.updateProfile = async updates => { fixture.profileUpdates++; return { ...fixtureUser, ...updates }; };
auth.onAuthStateChange = callback => { fixture.emitAuth = (next, event) => callback(next ? { ...fixtureUser, ...next } : null, event as Parameters<typeof callback>[1]); return () => { fixture.emitAuth = () => undefined; }; };
auth.getAccessToken = async () => 'fixture-token';
auth.logout = async () => undefined;
storage.getTalks = async () => { if (fixture.failLoad) throw new Error('Records unavailable'); const result = structuredClone(fixture.talks); await new Promise(resolve => setTimeout(resolve, fixture.loadDelay)); return result; };
storage.getTalk = async id => { if (fixture.failOpen) throw new Error('Record unavailable'); return structuredClone(fixture.talks.find(t => t.id === id) || null); };
storage.getRecentAttendees = async () => ['Returning Crew Member', ...fixture.remembered];
storage.saveRecentAttendees = async attendees => { if (fixture.failRecent) throw new Error('Recent crew unavailable'); fixture.remembered = [...new Set([...fixture.remembered, ...attendees.filter(a => !a.isTemporary).map(a => a.name)])]; };
storage.saveTalk = async talk => {
  fixture.saves.push(structuredClone(talk));
  await new Promise(resolve => setTimeout(resolve, fixture.saveDelay));
  if (fixture.failSave) throw new Error('Connection lost. Please retry.');
  const saved = { ...structuredClone(talk), id: talk.id.startsWith('talk_') ? crypto.randomUUID() : talk.id };
  fixture.talks = [saved, ...fixture.talks.filter(t => t.id !== saved.id)];
  return saved;
};
storage.deleteTalk = async id => { if (fixture.failDelete) throw new Error('Delete unavailable'); fixture.talks = fixture.talks.filter(t => t.id !== id); };
if (params.has('server')) {
  const records = async () => (await fetch('/__qa/talks')).json() as Promise<ToolboxTalk[]>;
  storage.getTalks = records;
  storage.getTalk = async id => (await records()).find(talk => talk.id === id) || null;
  storage.saveTalk = async talk => {
    const response = await fetch('/__qa/talks', { method: 'POST', body: JSON.stringify(talk) });
    if (!response.ok) throw new Error('Connection lost. Please retry.');
    return response.json();
  };
}
logger.logEvent = () => undefined;
createRoot(document.getElementById('root')!).render(<App />);
