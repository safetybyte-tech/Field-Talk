import React from 'react';
import { Wifi, Clock, LogOut, User, Send } from 'lucide-react';
import { User as UserType, ToolboxTalk } from '../types';

interface HeaderProps {
  title: string;
  showQueue?: boolean;
  user?: UserType | null;
  onLogout?: () => void;
  onEditProfile?: () => void;
  onShowOutbox?: () => void;
  talks?: ToolboxTalk[];
  showTimer?: boolean;
  onTitleClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showQueue = true,
  user,
  onLogout,
  onEditProfile,
  onShowOutbox,
  talks = [],
  showTimer = false,
  onTitleClick
}) => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [elapsedTime, setElapsedTime] = React.useState(0);

  // Outbox count = unsubmitted drafts only (no more queue)
  const outboxCount = talks.filter(talk => !talk.submittedAt).length;

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Timer effect - only runs when showTimer is true
  React.useEffect(() => {
    if (!showTimer) {
      setElapsedTime(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [showTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = (seconds: number) => {
    const minutes = seconds / 60;
    if (minutes >= 15) return 'text-red-400 bg-red-900/20 border-red-500';
    if (minutes >= 10) return 'text-yellow-400 bg-yellow-900/20 border-yellow-500';
    return 'text-green-400 bg-green-900/20 border-green-500';
  };
  return (
    <header className="bg-secondary-900 text-white p-4 shadow-lg">
      <div className="flex items-center justify-between">
        {onTitleClick ? (
          <button
            onClick={onTitleClick}
            className="text-xl font-bold hover:text-primary-300 transition-colors cursor-pointer"
          >
            {title}
          </button>
        ) : (
          <h1 className="text-xl font-bold">{title}</h1>
        )}

        {/* Timer on the right */}
        {showTimer && (
          <div className="ml-auto mr-4">
            <div className={`px-4 py-2 rounded-lg border-2 font-mono text-lg font-bold transition-all duration-500 ${getTimerColor(elapsedTime)}`}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
                {formatTime(elapsedTime)}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 bg-secondary-800 hover:bg-secondary-700 px-3 py-2 rounded-lg transition-colors"
              >
                <User size={16} />
                <span className="text-sm font-medium">{user.name}</span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 bg-white text-secondary-900 rounded-lg shadow-lg border min-w-48 z-50">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      if (onEditProfile) {
                        onEditProfile();
                      }
                    }}
                    className="w-full text-left p-3 border-b hover:bg-secondary-50 transition-colors"
                  >
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-secondary-600">@{user.username}</p>
                    <p className="text-xs text-secondary-500">{user.email}</p>
                    <p className="text-xs text-primary-600 mt-1">Click to edit profile</p>
                  </button>
                  {onLogout && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-secondary-100 flex items-center gap-2 text-red-600"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {showQueue && (
            <button
              onClick={onShowOutbox}
              className={`flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors relative ${
                outboxCount > 0
                  ? 'bg-primary-600 hover:bg-primary-700 text-white'
                  : 'bg-secondary-700 hover:bg-secondary-600 text-secondary-300'
              }`}
              title={`${outboxCount} talks in outbox`}
            >
              <Send size={14} />
              <span>{outboxCount}</span>
              {!isOnline && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-0.5 bg-red-500 rotate-45 rounded-full"></div>
                </div>
              )}
            </button>
          )}

          <div className="flex items-center gap-1">
            <div className="relative">
              {isOnline ? (
                <Wifi size={20} className="text-green-400" />
              ) : (
                <>
                  <Wifi size={20} className="text-gray-400" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-0.5 bg-red-500 rotate-45 rounded-full"></div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
