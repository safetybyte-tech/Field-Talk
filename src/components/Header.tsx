import React from 'react';
import { UserRound } from 'lucide-react';
import { ToolboxTalk, User } from '../types';

interface HeaderProps {
  title: string;
  showQueue?: boolean;
  showTimer?: boolean;
  user?: User | null;
  onLogout?: () => void | Promise<void>;
  onEditProfile?: () => void;
  onShowOutbox?: () => void;
  talks?: ToolboxTalk[];
  onTitleClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onEditProfile, onShowOutbox, talks = [], onTitleClick }) => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const drafts = talks.filter((talk) => !talk.submittedAt).length;

  React.useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, []);

  return <>
    <header className="border-b border-rule bg-ground"><div className="mx-auto flex h-[60px] max-w-[760px] items-center justify-between px-5">
      <button onClick={onTitleClick} className="text-left leading-none" aria-label="Go to Field Talk home"><span className="block text-[19px] font-bold tracking-[-.025em] text-ink">Field Talk</span><span className="snd-label mt-1 block text-[9px] text-accent">Safety Net Dispatch</span></button>
      <div className="flex items-center gap-2"><button onClick={onShowOutbox} className="snd-label flex h-11 items-center gap-2 border border-rule bg-sheet px-3 text-ink hover:border-accent" aria-label="Open records">Records {drafts > 0 && <span className="rounded-sm bg-caution-tint px-1.5 py-1 text-caution-text">{drafts}</span>}</button><button onClick={onEditProfile} className="grid h-11 w-11 place-items-center border border-rule bg-sheet text-ink hover:border-accent" aria-label={`Open ${user?.name || 'user'} profile`}><UserRound size={20} strokeWidth={1.75} /></button></div>
    </div></header>
    {!isOnline && <div className="border-b border-[#F3E2C7] bg-caution-tint px-5 py-3 text-sm text-caution-text"><div className="mx-auto max-w-[760px]">No signal. Everything you type is saved on this phone and sends itself when you're back.</div></div>}
  </>;
};
