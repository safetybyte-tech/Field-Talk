import React from 'react';
import { Wifi, WifiOff, Clock, LogOut, User, Send } from 'lucide-react';
import { api } from '../utils/api';
import { storage } from '../utils/storage';
import { User as UserType } from '../types';

interface HeaderProps {
  title: string;
  showQueue?: boolean;
  user?: UserType | null;
  onLogout?: () => void;
  onShowOutbox?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  title, 
  showQueue = true, 
  user, 
  onLogout,
  onShowOutbox
}) => {
  const [isOnline, setIsOnline] = React.useState(api.isOnline());
  const [queueCount, setQueueCount] = React.useState(0);
  const [showUserMenu, setShowUserMenu] = React.useState(false);

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

  React.useEffect(() => {
    const updateQueue = () => {
      setQueueCount(storage.getQueue().length);
    };
    
    updateQueue();
    const interval = setInterval(updateQueue, 1000);
    
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (isOnline && queueCount > 0) {
      api.processQueue();
    }
  }, [isOnline, queueCount]);

  return (
    <header className="bg-gray-900 text-white p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{title}</h1>
        
        <div className="flex items-center gap-3">
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
              >
                <User size={16} />
                <span className="text-sm font-medium">{user.name}</span>
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 bg-white text-gray-900 rounded-lg shadow-lg border min-w-48 z-50">
                  <div className="p-3 border-b">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-600">@{user.username}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  {onLogout && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-red-600"
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
                !isOnline && queueCount > 0
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : !isOnline
                  ? 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                  : queueCount > 0 
                  ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              title={`${queueCount} talks in outbox`}
              title={`${queueCount} toolbox talks in outbox`}
            >
              <Send size={14} />
              <span>{queueCount}</span>
              {!isOnline && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-0.5 bg-red-500 rotate-45 rounded-full"></div>
                </div>
              )}
            </button>
          )}
          
          <div className="flex items-center gap-1">
            {isOnline ? (
              <Wifi size={20} className="text-green-400" />
            ) : (
              <WifiOff size={20} className="text-red-400" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};