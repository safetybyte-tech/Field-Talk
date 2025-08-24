import React from 'react';
import { Plus, FileText, Calendar, Users, Send } from 'lucide-react';
import { ToolboxTalk } from '../types';
import { storage } from '../utils/storage';
import { TalksTable } from './TalksTable';

interface DashboardProps {
  talks: ToolboxTalk[];
  onNewTalk: () => void;
  onEditTalk: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  talks,
  onNewTalk,
  onEditTalk
}) => {
  const [outboxCount, setOutboxCount] = React.useState(0);
  const [viewMode, setViewMode] = React.useState<'cards' | 'table'>('cards');
  const [weeklyStats, setWeeklyStats] = React.useState({ completed: false, streak: 0 });

  React.useEffect(() => {
    const updateOutbox = () => {
      const queue = storage.getQueue();
      const unsubmittedTalks = talks.filter(talk => !talk.submittedAt);
      setOutboxCount(queue.length + unsubmittedTalks.length);
    };
    
    updateOutbox();
    const interval = setInterval(updateOutbox, 1000);
    
    return () => clearInterval(interval);
  }, [talks]);

  React.useEffect(() => {
    const calculateWeeklyStats = () => {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday) in local time
      startOfWeek.setHours(0, 0, 0, 0);
      
      // Check if there's a submitted talk this week
      const thisWeekTalk = talks.find(talk => {
        const talkDate = new Date(talk.date + 'T00:00:00'); // Treat as local date
        return talkDate >= startOfWeek && talk.submittedAt;
      });
      
      // Calculate streak by checking consecutive weeks backwards
      let streak = 0;
      let checkWeek = new Date(startOfWeek);
      
      while (true) {
        const weekEnd = new Date(checkWeek);
        weekEnd.setDate(checkWeek.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        const weekHasTalk = talks.some(talk => {
          const talkDate = new Date(talk.date + 'T00:00:00'); // Treat as local date
          return talkDate >= checkWeek && talkDate <= weekEnd && talk.submittedAt;
        });
        
        if (weekHasTalk) {
          streak++;
          // Move to previous week
          checkWeek.setDate(checkWeek.getDate() - 7);
        } else {
          break;
        }
      }
      
      setWeeklyStats({
        completed: !!thisWeekTalk,
        streak: streak
      });
    };
    
    calculateWeeklyStats();
  }, [talks]);

  const todayTalks = talks.filter(talk => {
    const today = new Date();
    const localToday = new Date(today.getTime() - (today.getTimezoneOffset() * 60000))
      .toISOString()
      .split('T')[0];
    return talk.date === localToday;
  });

  const thisWeekTalks = talks.filter(talk => {
    const talkDate = new Date(talk.date + 'T00:00:00'); // Treat as local date
    const today = new Date();
    const weekAgo = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
    return talkDate >= weekAgo && talkDate <= today;
  });

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-primary-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-primary-600">{todayTalks.length}</div>
          <div className="text-sm text-secondary-600">Today</div>
        </div>
        
        <div className="bg-primary-100 p-4 rounded-lg">
          <div className="text-2xl font-bold text-primary-700">{thisWeekTalks.length}</div>
          <div className="text-sm text-secondary-600">This Week</div>
        </div>
        
        <div className="bg-secondary-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-secondary-700">{talks.length}</div>
          <div className="text-sm text-secondary-600">Total</div>
        </div>
        
        <div className={`p-4 rounded-lg ${
          weeklyStats.completed 
            ? 'bg-primary-50' 
            : 'bg-red-50'
        }`}>
          <div className={`text-2xl font-bold ${
            weeklyStats.completed 
              ? 'text-primary-600' 
              : 'text-red-600'
          }`}>
            {weeklyStats.completed ? '✅' : '0/1'}
          </div>
          <div className={`text-sm ${
            weeklyStats.completed 
              ? 'text-primary-600' 
              : 'text-red-600'
          }`}>
            This Week
          </div>
          {weeklyStats.streak > 0 && (
            <div className="text-xs text-secondary-500 mt-1">
              🔥 {weeklyStats.streak} week streak
            </div>
          )}
        </div>
      </div>

      {/* New Talk Button */}
      <button
        onClick={onNewTalk}
        className="w-full bg-primary-600 hover:bg-primary-700 text-white py-6 px-6 rounded-lg font-medium text-xl flex items-center justify-center gap-3 transition-colors shadow-lg"
      >
        <Plus size={28} />
        Start New Toolbox Talk
      </button>

      {/* Recent Talks */}
      {talks.length > 0 && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Recent Toolbox Talks</h2>
          <div className="flex bg-gray-100 rounded-lg p-1" role="tablist" aria-label="View mode">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'cards'
                  ? 'bg-white text-secondary-900 shadow-sm'
                  : 'text-secondary-600 hover:text-secondary-900'
              }`}
              role="tab"
              aria-selected={viewMode === 'cards'}
              aria-controls="talks-content"
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-secondary-900 shadow-sm'
                  : 'text-secondary-600 hover:text-secondary-900'
              }`}
              role="tab"
              aria-selected={viewMode === 'table'}
              aria-controls="talks-content"
            >
              Table
            </button>
          </div>
        </div>
      )}
      <div id="talks-content" role="tabpanel">
        {talks.length === 0 ? (
          <div className="text-center py-12 text-secondary-500">
            <FileText size={48} className="mx-auto mb-4 text-secondary-300" />
            <p className="text-lg">No toolbox talks yet</p>
            <p className="text-sm">Create your first toolbox talk above</p>
          </div>
        ) : viewMode === 'table' ? (
          <TalksTable talks={talks} onEditTalk={onEditTalk} />
        ) : (
          <div className="space-y-3">
            {talks.slice(0, 10).map((talk) => {
              const presentCount = talk.attendees.filter(a => a.present).length;
              const totalCount = talk.attendees.length;
              
              return (
                <div
                  key={talk.id}
                  onClick={() => onEditTalk(talk.id)}
                  className="bg-white border border-secondary-200 p-4 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">{talk.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-secondary-600 mt-1">
                        <div className="flex items-center gap-1">
                          <Calendar size={16} />
                          {talk.date}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users size={16} />
                          {presentCount}/{totalCount}
                        </div>
                      </div>
                      {talk.location && (
                        <p className="text-sm text-secondary-500 mt-1">{talk.location}</p>
                      )}
                    </div>
                    
                    <div className="ml-4">
                      {talk.submittedAt ? (
                        <span className="bg-primary-100 text-primary-800 px-2 py-1 rounded text-xs font-medium">
                          Submitted
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">
                          Draft
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};