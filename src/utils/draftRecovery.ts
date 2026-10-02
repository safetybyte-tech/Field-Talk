import type { ToolboxTalk } from '../types';
import { hasCurrentApproval } from './recordReview';

export interface RecoveryEntry {
  version: 1;
  accountId: string;
  state: 'draft' | 'signed' | 'pending-delivery';
  talk: ToolboxTalk;
  baseVersion: string | null;
  savedAt: number;
}

type LocalStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const keyFor = (accountId: string) => `field-talk-recovery-v1:${accountId}`;

export const isUnsignedDraft = (talk: ToolboxTalk) =>
  !talk.approved && !talk.approvedAt && !talk.approvedBy && !talk.approvedByUserId &&
  !talk.approvedRecord && !talk.deliveryPending && !talk.submittedAt;

// All persisted record fields participate in stale-server detection. Navigation
// state and local recovery timestamps do not.
export function talkVersion(talk: ToolboxTalk): string {
  return JSON.stringify({
    id: talk.id, title: talk.title, content: talk.content, date: talk.date,
    location: talk.location, projectNumber: talk.projectNumber, weather: talk.weather,
    supervisor: talk.supervisor, supervisorEmail: talk.supervisorEmail,
    attendees: talk.attendees, recipients: talk.recipients, createdAt: talk.createdAt,
    notes: talk.notes || '', draftStep: talk.draftStep || 1, drafted: !!talk.drafted,
    approved: !!talk.approved, approvedBy: talk.approvedBy || '',
    approvedByUserId: talk.approvedByUserId || '', approvedAt: talk.approvedAt || 0,
    approvedRecord: talk.approvedRecord || '', harness: talk.harness || null,
    deliveryPending: !!talk.deliveryPending, submittedAt: talk.submittedAt || 0,
  });
}

export type RecoveryState = 'ready' | 'offline' | 'conflict' | 'protected' | 'synced' | 'signed' | 'pending-delivery';

export function recoveryState(entry: RecoveryEntry, server: ToolboxTalk | null | undefined): RecoveryState {
  if (entry.state === 'pending-delivery') return 'pending-delivery';
  if (entry.state === 'signed') return 'signed';
  if (!isUnsignedDraft(entry.talk)) return 'protected';
  if (server === undefined) return 'offline';
  if (server && !isUnsignedDraft(server)) return 'protected';
  if (entry.baseVersion === null) return server ? 'conflict' : 'ready';
  if (!server || talkVersion(server) !== entry.baseVersion) return 'conflict';
  return talkVersion(entry.talk) === talkVersion(server) ? 'synced' : 'ready';
}

export function assertCurrentServer(talk: ToolboxTalk, baseVersion: string | null, server: ToolboxTalk | null): void {
  if (talk.id.startsWith('talk_')) return;
  if (!server || !isUnsignedDraft(server) || baseVersion === null || talkVersion(server) !== baseVersion) {
    throw new Error('The server record changed or was signed. Your local edits are kept. Review the recovery copy before saving.');
  }
}

export function assertCurrentDelivery(talk: ToolboxTalk, baseVersion: string | null, server: ToolboxTalk | null): void {
  const changed = 'Delivery was not started. The account record changed or could not be found. Your signed local copy is kept for review.';
  if (!talk.deliveryPending || !hasCurrentApproval(talk) || !server) throw new Error(changed);
  if (server.submittedAt || server.deliveryPending || hasCurrentApproval(server)) {
    if (server.approvedRecord !== talk.approvedRecord || server.approvedByUserId !== talk.approvedByUserId) throw new Error(changed);
    return;
  }
  if (!isUnsignedDraft(server) || baseVersion === null || talkVersion(server) !== baseVersion) throw new Error(changed);
}

export function createDraftJournal(store: LocalStore, now = Date.now) {
  const list = (accountId: string): RecoveryEntry[] => {
    const raw = store.getItem(keyFor(accountId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Local draft data could not be read.');
    return parsed.filter((value): value is RecoveryEntry => {
      if (!value || typeof value !== 'object') return false;
      const entry = value as Partial<RecoveryEntry>;
      return entry.version === 1 && entry.accountId === accountId &&
        (entry.state === 'draft' || entry.state === 'signed' || entry.state === 'pending-delivery') &&
        typeof entry.talk?.id === 'string' &&
        (entry.baseVersion === null || typeof entry.baseVersion === 'string') &&
        typeof entry.savedAt === 'number';
    }).sort((a, b) => b.savedAt - a.savedAt);
  };
  const put = (entry: RecoveryEntry) => {
    const others = list(entry.accountId).filter(item => item.talk.id !== entry.talk.id);
    store.setItem(keyFor(entry.accountId), JSON.stringify([entry, ...others]));
    return entry;
  };
  const remove = (accountId: string, talkId: string) => {
    const remaining = list(accountId).filter(entry => entry.talk.id !== talkId);
    if (remaining.length) store.setItem(keyFor(accountId), JSON.stringify(remaining));
    else store.removeItem(keyFor(accountId));
  };
  return {
    list, remove,
    save(accountId: string, talk: ToolboxTalk, baseVersion: string | null) {
      if (talk.submittedAt) { remove(accountId, talk.id); return null; }
      const state = talk.deliveryPending ? 'pending-delivery' : isUnsignedDraft(talk) ? 'draft' : 'signed';
      if (list(accountId).some(entry => entry.talk.id === talk.id && entry.state === 'pending-delivery' && state !== 'pending-delivery')) {
        throw new Error('Delivery status must be checked before this record can be edited.');
      }
      return put({ version: 1, accountId, state, talk, baseVersion, savedAt: now() });
    },
  };
}

// Browsers may deny even property access to localStorage. Resolve it per call.
export const draftJournal = createDraftJournal({
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: key => window.localStorage.removeItem(key),
});
