import React from 'react';
import { Wifi, WifiOff, Clock } from 'lucide-react';
import { api } from '../utils/api';
import { storage } from '../utils/storage';

interface HeaderProps {
  title: string;
  showQueue?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, showQueue = true }) => {
  const [isOnline, setIsOnline] = React.useState(api.isOnline());
  const [queueCount, setQueueCount] = React.useState(0);

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
          {showQueue && queueCount > 0 && (
            <div className="flex items-center gap-1 bg-orange-600 px-2 py-1 rounded text-sm">
              <Clock size={16} />
              <span>{queueCount}</span>
            </div>
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