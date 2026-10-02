import React from 'react';
import type { ToolboxTalk } from '../types';
import { assertCurrentDelivery, recoveryState, type RecoveryEntry } from '../utils/draftRecovery';
import { openTalkPdf } from '../utils/talkDocument';

interface Props {
  entries: RecoveryEntry[];
  talks: ToolboxTalk[];
  serverLoaded: boolean;
  error: string;
  onRecover: (entry: RecoveryEntry) => void;
  onCopy: (entry: RecoveryEntry) => void;
  onDiscard: (entry: RecoveryEntry) => void;
  onCheckDelivery: (entry: RecoveryEntry) => void;
}

const canCheckDelivery = (entry: RecoveryEntry, server: ToolboxTalk | null | undefined) => {
  try { assertCurrentDelivery(entry.talk, entry.baseVersion, server || null); return true; }
  catch { return false; }
};

export const DraftRecoveryPanel: React.FC<Props> = ({ entries, talks, serverLoaded, error, onRecover, onCopy, onDiscard, onCheckDelivery }) => {
  const visible = entries.map(entry => ({ entry, server: serverLoaded ? talks.find(talk => talk.id === entry.talk.id) || null : undefined }))
    .map(({ entry, server }) => ({ entry, server, state: recoveryState(entry, server) }))
    .filter(item => item.state !== 'synced');
  if (!visible.length && !error) return null;
  return <section aria-label="Local recovery" className="mx-auto max-w-[760px] px-5 pt-6">
    {error && <p role="alert" className="border border-stop bg-stop-tint p-4 text-sm text-stop-text">{error}</p>}
    {visible.length > 0 && <><h2 className="text-xl font-bold text-ink">Saved on this device</h2><p className="mt-2 text-sm text-ink-body">These copies belong to this signed-in account. Opening one never sends email.</p></>}
    {visible.map(({ entry, server, state }) => <article key={entry.talk.id} className="mt-4 border border-rule bg-sheet p-4">
      <h3 className="font-semibold text-ink">{entry.talk.title || 'Untitled toolbox talk'}</h3>
      <p className="mt-1 text-xs text-ink-muted">Local copy saved {new Date(entry.savedAt).toLocaleString()}</p>
      <p className="mt-3 text-sm text-ink-body">{
        state === 'ready' ? 'Unsigned changes are ready to recover. Save to your account when connected.' :
        state === 'offline' ? 'The account record could not be checked. You can review this unsigned copy; saving will check the account record first.' :
        state === 'conflict' ? 'The account record changed or was removed. Open these unsigned changes as a new draft to keep both versions.' :
        state === 'pending-delivery' ? 'Delivery status is uncertain. Check the account record before retrying this exact signed copy; it cannot be edited.' :
        state === 'signed' ? 'This copy was signed. It cannot be restored as an editable draft.' :
        'The account record is signed or filed. This local copy cannot replace it.'
      }</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {(state === 'ready' || state === 'offline') && <button className="min-h-11 bg-accent px-4 font-semibold text-white" onClick={() => onRecover(entry)}>Recover unsigned draft</button>}
        {state === 'conflict' && <button className="min-h-11 bg-accent px-4 font-semibold text-white" onClick={() => onCopy(entry)}>Open as new draft</button>}
        {state === 'pending-delivery' && canCheckDelivery(entry, server) && <button className="min-h-11 bg-accent px-4 font-semibold text-white" onClick={() => onCheckDelivery(entry)}>Check delivery</button>}
        {(state === 'signed' || state === 'protected' || state === 'pending-delivery') && <button className="min-h-11 border border-ink px-4 text-sm font-semibold text-ink" onClick={() => openTalkPdf(entry.talk)}>Read local copy</button>}
        {state !== 'pending-delivery' && <button className="min-h-11 border border-ink px-4 text-sm font-semibold text-ink" onClick={() => {
          if (window.confirm('Remove this local recovery copy from this device?')) onDiscard(entry);
        }}>Discard local copy</button>}
      </div>
    </article>)}
  </section>;
};
