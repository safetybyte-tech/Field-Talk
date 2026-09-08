import type { ToolboxTalk, User } from '../types';
import { harnessMessages } from './harness';
import { parseStructuredTalkContent } from './talkContent';
import { getRiskSignals, validateHarnessV2Talk } from './safetyReview';

export const REVIEW_DISCLAIMER = 'Automated checks are not a safety approval. Verify the content and applicable requirements before signing.';
export const UNSIGNED_STATEMENT = 'Draft - not approved. No human sign-off is recorded for this version.';
export const SIGNED_STATEMENT = 'The person named above attested that they gave this talk, reviewed this version, and found it accurate.';

export function reviewMessages(talk: ToolboxTalk): string[] {
  const content = parseStructuredTalkContent(talk.content);
  const task = `${talk.notes || ''}\n${talk.title}\n${talk.location}\n${talk.weather}`;
  // Risk screening uses both the original task and current text, including legacy records.
  const risks = getRiskSignals(`${task}\n${content ? [content.i, ...content.hazards].join(' ') : talk.content}`);
  const current = content ? validateHarnessV2Talk(content, risks, talk.harness?.retrieval.status || 'no_match', task).filter(c => c.status !== 'pass').map(c => c.message) : [];
  const origin = talk.harness ? harnessMessages({ ...talk.harness, validation: talk.harness.validation.filter(c => c.id === 'citation_support') }) : ['No retrieved OSHA evidence accompanies this record. Verify requirements before use.'];
  return [...new Set([...origin, ...current])];
}

// Stable, exact record representation. Deliberately excludes navigation, server
// submission time, and unused recipient preferences; includes all signed content.
export function approvalSnapshot(talk: ToolboxTalk): string {
  return JSON.stringify({
    version: 1, id: talk.id, title: talk.title, content: talk.content, date: talk.date,
    location: talk.location, projectNumber: talk.projectNumber, weather: talk.weather,
    supervisor: talk.supervisor, supervisorEmail: talk.supervisorEmail, notes: talk.notes || '',
    attendees: talk.attendees.map(a => ({ id: a.id, name: a.name, present: a.present, signature: a.signature || '' })),
    recipients: talk.recipients.filter(r => r.selected).map(r => ({ id: r.id, name: r.name, email: r.email })),
    review: reviewMessages(talk),
  });
}

export function hasCurrentApproval(talk: ToolboxTalk): boolean {
  return talk.approved === true && !!talk.approvedBy?.trim() && !!talk.approvedByUserId &&
    typeof talk.approvedAt === 'number' && Number.isFinite(talk.approvedAt) && talk.approvedAt > 0 &&
    talk.approvedRecord === approvalSnapshot(talk);
}

export function clearApproval(talk: ToolboxTalk): ToolboxTalk {
  return { ...talk, approved: false, approvedBy: undefined, approvedByUserId: undefined, approvedAt: undefined, approvedRecord: undefined };
}

export function signRecord(talk: ToolboxTalk, user: Pick<User, 'id' | 'name'>): ToolboxTalk {
  return { ...talk, approved: true, approvedBy: user.name.trim(), approvedByUserId: user.id, approvedAt: Date.now(), approvedRecord: approvalSnapshot(talk) };
}

export function changeRecord(talk: ToolboxTalk, changes: Partial<ToolboxTalk>): ToolboxTalk {
  const next = { ...talk, ...changes };
  if (['content', 'notes', 'title', 'location', 'weather'].some(key => next[key as keyof ToolboxTalk] !== talk[key as keyof ToolboxTalk])) {
    next.harness = next.harness ? { ...next.harness, editedSinceGeneration: true } : undefined;
  }
  return approvalSnapshot(next) === approvalSnapshot(talk) ? next : clearApproval(next);
}

export function signOffError(talk: ToolboxTalk): string | undefined {
  if (!talk.title.trim() || !talk.location.trim() || !talk.weather.trim() || !talk.attendees.some(a => a.present && a.name.trim()) || !talk.recipients.some(r => r.selected)) return 'Add the topic, location, weather, a present crew member, and at least one recipient before signing.';
  const content = parseStructuredTalkContent(talk.content);
  if (!talk.content.trim() || (content && (!content.i.trim() || !content.sif.some(s => s.trim())))) return 'Add the talk content and specific SIF prevention actions before signing.';
  return undefined;
}

export function approvalText(talk: ToolboxTalk): string[] {
  return hasCurrentApproval(talk)
    ? ['Human sign-off', `${talk.approvedBy} - Signed ${new Date(talk.approvedAt!).toISOString()}`, SIGNED_STATEMENT]
    : ['Human sign-off', UNSIGNED_STATEMENT];
}
