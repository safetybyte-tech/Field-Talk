import React from 'react';
import { Check, Plus } from 'lucide-react';
import { Attendee } from '../types';

interface Props { attendees: Attendee[]; onUpdateAttendees: (attendees: Attendee[]) => void; recentNames: string[]; onRemoveRecentName: (name: string) => void; }
export const QuickAttendance: React.FC<Props> = ({ attendees, onUpdateAttendees, recentNames }) => {
  const [name, setName] = React.useState('');
  const displayed = React.useMemo(() => {
    const known = new Set(attendees.map((attendee) => attendee.name));
    return [...attendees, ...recentNames.filter((recent) => !known.has(recent)).map((recent) => ({ id: `recent-${recent}`, name: recent, present: false }))];
  }, [attendees, recentNames]);
  const toggle = (person: Attendee) => {
    const existing = attendees.find((attendee) => attendee.name === person.name);
    onUpdateAttendees(existing ? attendees.map((attendee) => attendee.id === existing.id ? { ...attendee, present: !attendee.present } : attendee) : [...attendees, { id: `attendee_${Date.now()}`, name: person.name, present: true }]);
  };
  const add = () => { if (!name.trim() || attendees.some((attendee) => attendee.name.toLowerCase() === name.trim().toLowerCase())) return; onUpdateAttendees([...attendees, { id: `attendee_${Date.now()}`, name: name.trim(), present: true, isTemporary: true }]); setName(''); };
  return <div className="border border-rule bg-sheet"><div className="flex items-center justify-between border-b border-rule-soft px-4 py-3"><span className="snd-label text-ink-muted">Crew</span><div className="flex gap-2"><button onClick={() => onUpdateAttendees(attendees.map((attendee) => ({ ...attendee, present: true })))} className="min-h-11 border border-rule px-3 text-sm font-semibold text-ink hover:border-accent">All here</button><button onClick={() => onUpdateAttendees(attendees.map((attendee) => ({ ...attendee, present: false })))} className="min-h-11 border border-rule px-3 text-sm font-semibold text-ink hover:border-accent">Clear</button></div></div>
    {displayed.length ? displayed.map((person, index) => <button key={person.id} onClick={() => toggle(person)} className={`flex min-h-16 w-full items-center gap-3 px-4 text-left ${index ? 'border-t border-rule-soft' : ''}`}><span className={`grid h-7 w-7 place-items-center rounded-[6px] border-2 ${person.present ? 'border-ok bg-ok text-white' : 'border-[#CFC8BE] bg-sheet'}`}>{person.present && <Check size={18} strokeWidth={3} />}</span><span className={person.present ? 'font-medium text-[17px] text-ink' : 'font-medium text-[17px] text-ink-muted'}>{person.name}</span><span className="snd-mono ml-auto text-xs text-ink-faint">{person.present ? 'Present' : 'Not here'}</span></button>) : <p className="px-4 py-8 text-sm text-ink-muted">Add the first person who was there.</p>}
    <div className="flex border-t border-rule-soft p-3"><input value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && add()} className="min-h-[52px] flex-1 border border-rule px-3 text-[16px] placeholder:text-ink-faint" placeholder="Add someone by name" /><button onClick={add} className="ml-2 min-h-[52px] border border-ink px-4 text-sm font-semibold text-ink hover:border-accent"><Plus className="mr-1 inline" size={17} />Add</button></div>
  </div>;
};
