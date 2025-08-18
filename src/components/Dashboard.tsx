import React from 'react';
import { Plus, FileText, Calendar, Users, Send } from 'lucide-react';
import { ToolboxTalk } from '../types';
import { storage } from '../utils/storage';

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

  const todayTalks = talks.filter(talk => {
    const today = new Date().toISOString().split('T')[0];
    return talk.date === today;
  });

  const thisWeekTalks = talks.filter(talk => {
    const talkDate = new Date(talk.date);
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    return talkDate >= weekAgo && talkDate <= today;
  });

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{todayTalks.length}</div>
          <div className="text-sm text-gray-600">Today</div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{thisWeekTalks.length}</div>
          <div className="text-sm text-gray-600">This Week</div>
        </div>
        
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{outboxCount}</div>
          <div className="text-sm text-gray-600 flex items-center gap-1">
            <Send size={14} />
            Outbox
          </div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{talks.length}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
      </div>

      {/* New Talk Button */}
      <button
        onClick={onNewTalk}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 px-6 rounded-lg font-medium text-xl flex items-center justify-center gap-3 transition-colors shadow-lg"
      >
        <Plus size={28} />
        Start New Toolbox Talk
      </button>

      {/* Recent Talks */}
      <div>
        <h2 className="text-xl font-bold mb-4">Recent Talks</h2>
        
        {talks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg">No talks yet</p>
            <p className="text-sm">Create your first toolbox talk above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {talks.slice(0, 10).map((talk) => {
              const presentCount = talk.attendees.filter(a => a.present).length;
              const totalCount = talk.attendees.length;
              
              return (
                <div
                  key={talk.id}
                  onClick={() => onEditTalk(talk.id)}
                  className="bg-white border border-gray-200 p-4 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">{talk.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
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
                        <p className="text-sm text-gray-500 mt-1">{talk.location}</p>
                      )}
                    </div>
                    
                    <div className="ml-4">
                      {talk.submittedAt ? (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                          Submitted
                        </span>
                      ) : (
                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">
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