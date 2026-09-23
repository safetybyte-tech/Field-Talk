import React from 'react';
import { ArrowLeft, Send, Calendar, Users, Trash2 } from 'lucide-react';
import { ToolboxTalk } from '../types';

interface OutboxProps {
  talks: ToolboxTalk[];
  onBack: () => void;
  onDeleteTalk: (id: string) => void;
  onEditTalk: (id: string) => void;
}

export const Outbox: React.FC<OutboxProps> = ({ talks, onBack, onDeleteTalk, onEditTalk }) => {
  const unsubmittedTalks = talks.filter(talk => !talk.submittedAt);
  const submittedTalks = talks.filter(talk => !!talk.submittedAt);

  const deleteTalk = (id: string) => {
    if (window.confirm('Are you sure you want to delete this toolbox talk? This action cannot be undone.')) {
      onDeleteTalk(id);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  };

  return (
    <main className="mx-auto max-w-[760px] px-5 pb-32 pt-8">
      <button onClick={onBack} aria-label="Back to dashboard" className="flex min-h-11 items-center gap-2 text-sm font-semibold text-ink hover:text-accent">
        <ArrowLeft size={18} /> Dashboard
      </button>
      <h1 className="mt-4 text-[30px] font-bold tracking-[-.02em] text-ink">Outbox</h1>
      <p className="mt-2 text-[15px] text-ink-muted">
        {unsubmittedTalks.length} draft{unsubmittedTalks.length !== 1 ? 's' : ''} pending
      </p>

      {unsubmittedTalks.length > 0 && (
        <div className="mt-8">
          <h2 className="snd-label text-ink-muted">Draft toolbox talks ({unsubmittedTalks.length})</h2>
          <div className="mt-3 border border-rule bg-sheet">
            {unsubmittedTalks.map((talk, index) => {
              const presentCount = talk.attendees.filter(a => a.present).length;

              return (
                <div key={talk.id} className={`flex min-h-16 items-start justify-between gap-3 px-4 py-3 ${index ? 'border-t border-rule-soft' : ''}`}>
                  <button onClick={() => onEditTalk(talk.id)} className="min-w-0 flex-1 text-left hover:bg-ground">
                    <span className="block break-words font-semibold text-ink">{talk.title || 'Untitled talk'}</span>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
                      <span className="flex items-center gap-1"><Calendar size={14} />{talk.date}</span>
                      <span className="flex items-center gap-1"><Users size={14} />{presentCount} attendees</span>
                    </div>
                    <p className="snd-mono mt-1 text-xs text-ink-faint">Created {formatDate(talk.createdAt)}</p>
                  </button>

                  <div className="flex shrink-0 items-center gap-1">
                    <span className="snd-label border border-[#F3E2C7] bg-caution-tint px-2 py-1 text-caution-text">Draft</span>
                    <button
                      onClick={() => deleteTalk(talk.id)}
                      aria-label="Delete this toolbox talk"
                      className="grid min-h-11 min-w-11 shrink-0 place-items-center text-ink-muted hover:text-stop-text"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {submittedTalks.length > 0 && (
        <div className="mt-8">
          <h2 className="snd-label text-ink-muted flex items-center gap-2"><Send size={14} /> Submitted ({submittedTalks.length})</h2>
          <div className="mt-3 border border-rule bg-sheet">
            {submittedTalks.map((talk, index) => {
              const presentCount = talk.attendees.filter(a => a.present).length;

              return (
                <button
                  key={talk.id}
                  onClick={() => onEditTalk(talk.id)}
                  className={`flex min-h-16 w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-ground ${index ? 'border-t border-rule-soft' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="block break-words font-semibold text-ink">{talk.title || 'Untitled talk'}</span>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
                      <span className="flex items-center gap-1"><Calendar size={14} />{talk.date}</span>
                      <span className="flex items-center gap-1"><Users size={14} />{presentCount} attendees</span>
                    </div>
                    {talk.submittedAt && <p className="snd-mono mt-1 text-xs text-ink-faint">Submitted {formatDate(talk.submittedAt)}</p>}
                  </div>

                  <span className="snd-label shrink-0 border border-[#BDE7C9] bg-ok-tint px-2 py-1 text-ok-text">Sent</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {unsubmittedTalks.length === 0 && submittedTalks.length === 0 && (
        <div className="mt-8 border border-rule bg-sheet px-4 py-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center border border-[#BDE7C9] bg-ok-tint">
            <Send size={24} className="text-ok-text" />
          </div>
          <p className="mt-4 text-[17px] font-semibold text-ink">All caught up!</p>
          <p className="mt-1 text-sm text-ink-muted">No toolbox talks yet</p>
        </div>
      )}
    </main>
  );
};
