import React from 'react';
import { ArrowLeft, ArrowRight, Check, Mic, Square } from 'lucide-react';
import { Attendee, StructuredTalkContent, ToolboxTalk, User } from '../types';
import { TALK_TEMPLATES } from '../data/templates';
import { QuickAttendance } from './QuickAttendance';
import { RecipientsSelector } from './RecipientsSelector';
import { StructuredTalkDisplay } from './StructuredTalkDisplay';
import { auth } from '../utils/auth';
import { getCachedWeather } from '../utils/weather';
import { logger } from '../utils/logger';
import { openTalkPdf, parseStructuredTalkContent } from '../utils/talkDocument';
import { useDictation, isDictationSupported } from '../hooks/useDictation';

interface TalkEditorProps {
  talk: ToolboxTalk; onSave: (talk: ToolboxTalk) => void; onSubmit: (talk: ToolboxTalk) => Promise<void>; recentNames: string[];
  currentUser?: User | null; onRemoveRecentName: (name: string) => void; availableDrafts: ToolboxTalk[];
}

const makeStructured = (raw: string): StructuredTalkContent => ({ i: raw, hazards: [], practices: [], ppe: [], sif: [], manual: [], q: [] });
const fieldClass = 'mt-2 min-h-[52px] w-full border border-rule bg-sheet px-3 text-[17px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none';

export const TalkEditor: React.FC<TalkEditorProps> = ({ talk, onSave, onSubmit, recentNames, currentUser, onRemoveRecentName }) => {
  const [editedTalk, setEditedTalk] = React.useState<ToolboxTalk>(talk);
  const [step, setStep] = React.useState<1 | 2 | 3>(talk.draftStep || 1);
  const [notes, setNotes] = React.useState(talk.notes || '');
  const [structured, setStructured] = React.useState<StructuredTalkContent | null>(() => parseStructuredTalkContent(talk.content));
  const [drafting, setDrafting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const dictationSupported = isDictationSupported();
  const onDictationResult = React.useCallback((text: string, isFinal: boolean) => {
    if (!isFinal) return;
    setNotes((current) => `${current}${current && !/\s$/.test(current) ? ' ' : ''}${text}`);
    setError('');
  }, []);
  const onDictationError = React.useCallback((code: string) => {
    const messages: Record<string, string> = {
      'not-supported': "Voice dictation is not available in this browser. Type it in below instead.",
      'not-allowed': 'Microphone access is blocked. Enable it in Settings or type it in below.',
      'service-not-allowed': "Dictation isn't available here — type it in below instead.",
      'no-speech': "Didn't catch that. Try again or type it in below.",
      'audio-capture': 'No microphone was found on this device.',
    };
    if (messages[code]) setError(messages[code]);
  }, []);
  const { isListening: dictating, start: startDictation, stop: stopDictation } = useDictation({ onResult: onDictationResult, onError: onDictationError });

  React.useEffect(() => { setEditedTalk(talk); setStep(talk.draftStep || 1); setNotes(talk.notes || ''); setStructured(parseStructuredTalkContent(talk.content)); }, [talk]);
  React.useEffect(() => () => stopDictation(), [stopDictation]);
  React.useEffect(() => {
    if (editedTalk.weather) return;
    getCachedWeather().then((weather) => setEditedTalk((current) => current.weather ? current : { ...current, weather: weather.description })).catch(() => undefined);
  }, [editedTalk.weather]);
  React.useEffect(() => {
    if (currentUser && (!editedTalk.supervisor || !editedTalk.supervisorEmail)) setEditedTalk((current) => ({ ...current, supervisor: current.supervisor || currentUser.name, supervisorEmail: current.supervisorEmail || currentUser.email }));
  }, [currentUser, editedTalk.supervisor, editedTalk.supervisorEmail]);

  const persist = (next: ToolboxTalk, nextStep = step) => {
    const saved = { ...next, notes, draftStep: nextStep };
    setEditedTalk(saved); onSave(saved);
  };
  const changeStep = (next: 1 | 2 | 3) => { persist(editedTalk, next); setStep(next); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const updateStructured = (content: StructuredTalkContent) => { setStructured(content); setEditedTalk((current) => ({ ...current, content: JSON.stringify(content) })); };

  const toggleDictation = () => {
    if (!dictationSupported) { setError('Voice dictation is not available in this browser. Type it in below instead.'); return; }
    setError('');
    if (dictating) stopDictation(); else startDictation();
  };

  const writeItUp = async () => {
    if (!notes.trim()) { setError('Tell us what the work is and what worries you, then write it up.'); return; }
    setError(''); setDrafting(true); logger.startTimer(`ai_generation_${editedTalk.id}`);
    try {
      const workerUrl = import.meta.env.VITE_WORKER_URL; const accessToken = await auth.getAccessToken();
      if (!workerUrl || !accessToken) throw new Error(!workerUrl ? 'Writing assistance is not configured. Choose a starting point below or write the record yourself.' : 'Please sign in again before writing this up.');
      const useHarnessV2 = import.meta.env.VITE_USE_HARNESS_V2 === 'true';
      const response = await fetch(useHarnessV2 ? `${workerUrl.replace(/\/$/, '')}/v2/generate-talk` : workerUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(useHarnessV2 ? { workDescription: notes.trim(), context: { trade: currentUser?.customTrade || currentUser?.trade || '', location: editedTalk.location, weather: editedTalk.weather } } : { workDescription: notes.trim() }) });
      if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || 'Writing assistance could not finish. You can still write the record yourself.'); }
      const result = await response.json() as { content?: string }; if (!result.content) throw new Error('Writing assistance returned no record. Try again or type the record yourself.');
      const content = parseStructuredTalkContent(result.content) || makeStructured(result.content); const next = { ...editedTalk, title: editedTalk.title || `Safety Talk: ${notes.trim()}`, content: JSON.stringify(content), notes, drafted: true, approved: false };
      setStructured(content); setEditedTalk(next); onSave({ ...next, draftStep: 1 }); logger.logEvent(currentUser?.id || '', editedTalk.id, 'talk_generated', { latency_ms: logger.getElapsedTime(`ai_generation_${editedTalk.id}`), generator: useHarnessV2 ? 'harness_v2' : 'v1' });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Writing assistance could not finish.'); } finally { setDrafting(false); }
  };
  const chooseTemplate = (id: string) => {
    const template = TALK_TEMPLATES.find((item) => item.id === id); if (!template) return;
    const content = parseStructuredTalkContent(template.content) || makeStructured(template.content); const next = { ...editedTalk, title: template.title, content: JSON.stringify(content), notes: notes || template.title, drafted: true, approved: false };
    setNotes(next.notes || ''); setStructured(content); setEditedTalk(next); onSave({ ...next, draftStep: 1 }); logger.logEvent(currentUser?.id || '', editedTalk.id, 'task_selected', { source: 'template_selection', template_id: id });
  };
  const proceed = async () => {
    if (sending) return;
    setError('');
    if (step === 1) { if (!editedTalk.content.trim()) { setError('Write up your words or choose a starting point before moving on.'); return; } persist(editedTalk, 2); changeStep(2); }
    else if (step === 2) { persist(editedTalk, 3); changeStep(3); }
    else {
      if (!editedTalk.approved) { setError('Check the sign-off before sending. Nothing sends until you sign.'); return; }
      if (!editedTalk.title.trim() || !editedTalk.location.trim() || !editedTalk.weather.trim() || !editedTalk.attendees.length || !editedTalk.recipients.some((recipient) => recipient.selected)) { setError('Add the topic, location, weather, crew, and at least one recipient before sending.'); return; }
      const finalTalk: ToolboxTalk = { ...editedTalk, notes, submittedAt: Date.now(), draftStep: 3 };
      logger.logEvent(currentUser?.id || '', editedTalk.id, 'human_signature', { approved_by: finalTalk.approvedBy });
      setSending(true);
      try {
        await onSubmit(finalTalk);
        setSent(true);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Sending failed. Please try again.');
      } finally {
        setSending(false);
      }
    }
  };
  const updateAttendees = (attendees: Attendee[]) => setEditedTalk((current) => ({ ...current, attendees }));
  const present = editedTalk.attendees.filter((attendee) => attendee.present).length;

  if (sent) return <main className="mx-auto max-w-[760px] px-5 pb-24 pt-10"><p className="snd-label text-ok-text">Done · {new Date().toISOString().slice(0, 10)}</p><h1 className="mt-4 text-[34px] font-bold tracking-[-.025em] text-ink">That's today handled.</h1><p className="mt-4 max-w-[56ch] text-[17px] leading-[1.6] text-ink-body">The PDF is with {editedTalk.recipients.filter((recipient) => recipient.selected).length} people and filed under your records. {present} of {editedTalk.attendees.length} signed in.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><button onClick={() => openTalkPdf(editedTalk)} className="min-h-14 bg-accent px-5 font-bold text-white hover:bg-accent-hover">See the record</button><button onClick={() => window.location.reload()} className="min-h-14 border border-ink px-5 font-semibold text-ink hover:bg-sheet">Back to Field Talk</button></div></main>;

  return <main className="mx-auto max-w-[760px] px-5 pb-32 pt-7">
    <div className="grid grid-cols-3 border border-rule bg-sheet">{(['The talk', 'Who was there', 'Send it'] as const).map((name, index) => { const number = (index + 1) as 1 | 2 | 3; const completed = number < step; return <button key={name} disabled={number > step} onClick={() => number <= step && changeStep(number)} className={`min-h-[68px] border-t-[3px] px-3 py-3 text-left ${number === step ? 'border-t-accent' : 'border-t-transparent'} ${index ? 'border-l border-rule' : ''} ${completed ? 'bg-ground' : 'bg-sheet'} disabled:cursor-default`}><span className={`snd-label ${completed ? 'text-ok-text' : number === step ? 'text-accent' : 'text-ink-faint'}`}>{String(number).padStart(2, '0')} {completed ? 'done' : number === step ? 'now' : 'next'}</span><span className="mt-2 block text-[15px] font-semibold text-ink">{name}</span></button>; })}</div>
    {error && <div className="mt-5 border border-stop bg-stop-tint px-4 py-3 text-sm text-stop-text">{error}</div>}
    {step === 1 && <section className="pt-9"><h1 className="max-w-[24ch] text-[30px] font-bold leading-[1.14] tracking-[-.022em] text-ink">Tell it like you'd tell the crew.</h1><p className="mt-3 max-w-[56ch] text-[17px] leading-[1.6] text-ink-body">Tap the button and say what the work is and what worries you about it. Two sentences is plenty — we'll write it up and you fix whatever we got wrong.</p>
      <div className="mt-8 border border-rule bg-sheet"><div className="flex justify-between border-b border-rule-soft px-4 py-3"><span className="snd-label text-ink-muted">Your words</span><span className="snd-mono text-xs text-ink-muted">{dictating ? 'Recording' : 'Nothing is recorded until you tap'}</span></div><div className="p-4"><button onClick={toggleDictation} className={`flex min-h-[72px] w-full items-center justify-center gap-3 border-[1.5px] px-4 text-[19px] font-bold ${dictating ? 'border-stop bg-stop-tint text-stop-text' : 'border-ink bg-sheet text-ink hover:border-accent'}`}>{dictating ? <Square size={19} fill="currentColor" /> : <Mic size={22} />} {dictating ? 'Listening… tap to stop' : notes ? 'Say a bit more' : 'Tap and talk it through'}</button><div className="mt-4 flex items-center justify-between"><label className="snd-label text-ink-muted">{notes ? 'What you said' : 'Or type it'}</label><span className="snd-mono text-xs text-ink-faint">{dictating ? 'transcribing…' : 'whichever is faster'}</span></div><textarea value={notes} onChange={(event) => setNotes(event.target.value)} className={`${fieldClass} min-h-[132px] py-3 leading-[1.6]`} placeholder="Say what the work is and what worries you." /></div></div>
      {!structured && <><button onClick={writeItUp} disabled={drafting} className="mt-4 min-h-14 w-full border-[1.5px] border-ink bg-sheet font-bold text-ink hover:border-accent disabled:border-rule disabled:text-ink-faint">{drafting ? 'Writing it up…' : 'Write it up'}</button><p className="snd-mono mt-3 text-center text-xs text-ink-muted">or pick a starting point below</p><div className="mt-3 flex flex-wrap gap-2">{TALK_TEMPLATES.slice(0, 6).map((template) => <button key={template.id} onClick={() => chooseTemplate(template.id)} className="min-h-11 border border-rule bg-ground px-3 text-sm font-medium text-ink hover:border-accent">{template.title}</button>)}</div></>}
      {structured && <div className="mt-7 border border-rule"><div className="border-b border-[#F5D5B8] bg-accent-tint px-4 py-3"><span className="snd-label border border-[#F5D5B8] bg-sheet px-2 py-1 text-accent-text">Drafted from your words</span><span className="ml-3 text-sm font-medium text-accent-text">Yours to fix before it counts. Nothing sends until you sign it.</span></div><div className="p-4"><label className="snd-label text-ink-muted">Topic</label><input value={editedTalk.title} onChange={(event) => setEditedTalk((current) => ({ ...current, title: event.target.value }))} className={`${fieldClass} text-lg font-semibold`} placeholder="Today's safety topic" /><div className="mt-6"><StructuredTalkDisplay content={structured} isEditable onContentChange={updateStructured} /></div></div></div>}
    </section>}
    {step === 2 && <section className="pt-9"><h1 className="max-w-[24ch] text-[30px] font-bold leading-[1.14] tracking-[-.022em] text-ink">Who stood there and listened?</h1><p className="mt-3 max-w-[56ch] text-[17px] leading-[1.6] text-ink-body">Yesterday's crew is already checked. Uncheck anyone who isn't here, add anyone new. This is the part an investigator reads first.</p><div className="mt-7 border border-rule bg-sheet p-4"><div className="grid grid-cols-[auto_1fr] items-center gap-3"><span className="snd-mono text-[32px] font-semibold text-ink">{present}</span><span className="snd-mono text-sm text-ink-faint">of {editedTalk.attendees.length}</span></div></div><div className="mt-4"><QuickAttendance attendees={editedTalk.attendees} onUpdateAttendees={updateAttendees} recentNames={recentNames} onRemoveRecentName={onRemoveRecentName} /></div><div className="mt-7 border border-rule bg-sheet p-4"><p className="snd-label text-ink-muted">Where and when</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-ink">Location<input value={editedTalk.location} onChange={(event) => setEditedTalk((current) => ({ ...current, location: event.target.value }))} className={fieldClass} placeholder="Where did this happen?" /></label><label className="text-sm font-semibold text-ink">Project<input value={editedTalk.projectNumber} onChange={(event) => setEditedTalk((current) => ({ ...current, projectNumber: event.target.value }))} className={`${fieldClass} snd-mono text-sm`} placeholder="Project number" /></label><label className="text-sm font-semibold text-ink sm:col-span-2">Weather<input value={editedTalk.weather} onChange={(event) => setEditedTalk((current) => ({ ...current, weather: event.target.value }))} className={`${fieldClass} snd-mono text-sm`} placeholder="Pulled from the site's coordinates · edit if it's wrong" /></label></div></div></section>}
    {step === 3 && <section className="pt-9"><h1 className="max-w-[24ch] text-[30px] font-bold leading-[1.14] tracking-[-.022em] text-ink">Sign it, then it's out of your hands.</h1><p className="mt-3 max-w-[56ch] text-[17px] leading-[1.6] text-ink-body">One read-through, your name on it, and the PDF goes to the people who need it. You keep a copy either way.</p><div className="mt-7 border border-rule bg-sheet p-4"><div className="flex items-center justify-between"><p className="snd-label text-ink-muted">The record</p><button onClick={() => openTalkPdf(editedTalk)} className="snd-label text-accent">Read it in full</button></div><dl className="mt-4 divide-y divide-rule-soft"><div className="flex justify-between gap-5 py-3"><dt className="snd-label text-ink-muted">Topic</dt><dd className="text-right font-medium text-ink">{editedTalk.title || 'Not set'}</dd></div><div className="flex justify-between gap-5 py-3"><dt className="snd-label text-ink-muted">Crew</dt><dd className="snd-mono text-sm text-ink">{present} of {editedTalk.attendees.length} present</dd></div><div className="flex justify-between gap-5 py-3"><dt className="snd-label text-ink-muted">Where</dt><dd className="snd-mono text-right text-sm text-ink">{editedTalk.location || 'Not set'} · {editedTalk.projectNumber || '—'}</dd></div></dl></div><div className="mt-7"><RecipientsSelector recipients={editedTalk.recipients} onUpdateRecipients={(recipients) => setEditedTalk((current) => ({ ...current, recipients }))} /></div><div className="mt-7 border border-rule"><div className="bg-accent-tint px-4 py-3"><span className="snd-label border border-[#F5D5B8] bg-sheet px-2 py-1 text-accent-text">Human sign-off</span><span className="ml-3 text-sm font-medium text-accent-text">Your name is what makes this a record.</span></div><button onClick={() => setEditedTalk((current) => ({ ...current, approved: !current.approved, approvedBy: !current.approved ? currentUser?.name || current.supervisor : undefined, approvedAt: !current.approved ? Date.now() : undefined }))} className={`m-4 flex w-[calc(100%-2rem)] items-start gap-3 border-[1.5px] p-4 text-left ${editedTalk.approved ? 'border-ok bg-ok-tint text-ok-text' : 'border-ink bg-sheet text-ink'}`}><span className={`mt-0.5 grid h-[30px] w-[30px] shrink-0 place-items-center border-2 ${editedTalk.approved ? 'border-ok bg-ok text-white' : 'border-[#CFC8BE] bg-sheet'}`}>{editedTalk.approved && <Check size={20} strokeWidth={3} />}</span><span><span className="block font-semibold">I gave this talk, I've read what's in it, and it's accurate.</span><span className="snd-mono mt-2 block text-xs">{currentUser?.name || editedTalk.supervisor || 'Your name'} · {currentUser?.customTrade || currentUser?.trade || 'Site Safety'} · {editedTalk.date}</span></span></button></div></section>}
    <div className="fixed inset-x-0 bottom-0 border-t border-rule bg-[rgba(250,247,242,.97)] px-5 py-3 backdrop-blur"><div className="mx-auto flex max-w-[760px] items-center justify-between gap-3"><button onClick={() => step === 1 ? persist(editedTalk, 1) : changeStep((step - 1) as 1 | 2)} className="min-h-12 border border-ink px-4 text-sm font-semibold text-ink">{step === 1 ? 'Save draft' : <><ArrowLeft className="mr-1 inline" size={16} /> Back</>}</button><span className="snd-mono hidden text-right text-xs text-ink-faint sm:block">{step === 3 && !editedTalk.approved ? 'Nothing sends until you sign' : 'Saved on device'}</span><button onClick={proceed} className={`min-h-14 px-5 font-bold ${step === 3 && !editedTalk.approved ? 'bg-[#F0EBE3] text-ink-faint' : 'bg-accent text-white hover:bg-accent-hover'}`}>{step === 1 ? 'Next — the crew' : step === 2 ? 'Next — send it' : editedTalk.approved ? `Send to ${editedTalk.recipients.filter((recipient) => recipient.selected).length}` : 'Sign to send'} {step < 3 && <ArrowRight className="ml-2 inline" size={18} />}</button></div></div>
  </main>;
};
