import React from 'react';
import { createRoot } from 'react-dom/client';
import { TalkEditor } from '../../src/components/TalkEditor';
import { logger } from '../../src/utils/logger';
import { record, user } from './record.mjs';
import type { ToolboxTalk } from '../../src/types';
import '../../src/index.css';

// Local component acceptance only. No authentication, mail, or database writes.
logger.logEvent = () => undefined;
export function Fixture() {
  const [talk, setTalk] = React.useState<ToolboxTalk>(record());
  const [saved, setSaved] = React.useState<ToolboxTalk>(talk);
  const [revision, setRevision] = React.useState(0);
  const [result, setResult] = React.useState('Local fixture; nothing is sent.');
  return <><header className="mx-auto max-w-[760px] px-5 pt-4"><p role="status">{result}</p><button className="min-h-11 border px-3" onClick={() => { setTalk(saved); setRevision(n => n + 1); }}>Reopen saved draft</button></header><TalkEditor key={revision} talk={talk} currentUser={{ ...user, username: 'qa', createdAt: 0 }} recentNames={[]} availableDrafts={[]} onRemoveRecentName={() => undefined} onSave={next => { setSaved(next); setResult(`Saved locally; approval ${next.approved ? 'checked' : 'clear'}.`); }} onSubmit={async () => { setResult('Mock submission only; no email sent.'); }} /></>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
