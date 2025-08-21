import React from 'react';
import { ArrowLeft, Send, Clock, Calendar, Users, Trash2, RefreshCw } from 'lucide-react';
import { ToolboxTalk, QueuedSubmission } from '../types';
import { storage } from '../utils/storage';
import { api } from '../utils/api';

interface OutboxProps {
  talks: ToolboxTalk[];
  onBack: () => void;
}

export const Outbox: React.FC<OutboxProps> = ({ talks, onBack }) => {
  const [queuedSubmissions, setQueuedSubmissions] = React.useState<QueuedSubmission[]>([]);
  const [isProcessing, setIsProcessing] = React.useState(false);

  React.useEffect(() => {
    const updateQueue = () => {
      setQueuedSubmissions(storage.getQueue());
    };
    
    updateQueue();
    const interval = setInterval(updateQueue, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Get unsubmitted talks (drafts that haven't been submitted)
  const unsubmittedTalks = talks.filter(talk => !talk.submittedAt);

  const processQueue = async () => {
    setIsProcessing(true);
    try {
      await api.processQueue();
      setQueuedSubmissions(storage.getQueue());
    } catch (error) {
      console.error('Error processing queue:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFromQueue = (id: string) => {
    storage.removeFromQueue(id);
    setQueuedSubmissions(storage.getQueue());
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalPending = queuedSubmissions.length + unsubmittedTalks.length;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Outbox</h1>
          <p className="text-gray-600">
            {totalPending} toolbox talk{totalPending !== 1 ? 's' : ''} waiting to be sent
          </p>
        </div>
        
        {queuedSubmissions.length > 0 && (
          <button
            onClick={processQueue}
            disabled={isProcessing || !api.isOnline()}
            className="ml-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <RefreshCw size={16} className={isProcessing ? 'animate-spin' : ''} />
            {isProcessing ? 'Sending...' : 'Retry All'}
          </button>
        )}
      </div>

      {/* Status Banner */}
      {!api.isOnline() && (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock size={20} />
            <span className="font-medium">Offline Mode</span>
          </div>
          <p className="text-sm mt-1">
            Toolbox talks will be sent automatically when connection is restored.
          </p>
        </div>
      )}

      {/* Queued Submissions (Failed/Retrying) */}
      {queuedSubmissions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Send size={20} className="text-orange-600" />
            Queued for Retry ({queuedSubmissions.length})
          </h2>
          
          <div className="space-y-3">
            {queuedSubmissions.map((submission) => {
              const talk = submission.talk;
              const presentCount = talk.attendees.filter(a => a.present).length;
              
              return (
                <div
                  key={submission.id}
                  className="bg-white border border-orange-200 p-4 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">{talk.title || 'Untitled Talk'}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <div className="flex items-center gap-1">
                          <Calendar size={16} />
                          {talk.date}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users size={16} />
                          {presentCount} attendees
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Queued: {formatDate(submission.timestamp)} • 
                        Retry {submission.retryCount}/3
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">
                        Retrying
                      </span>
                      <button
                        onClick={() => removeFromQueue(submission.id)}
                        className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                        title="Remove from queue"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unsubmitted Drafts */}
      {unsubmittedTalks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Clock size={20} className="text-blue-600" />
            Draft Toolbox Talks ({unsubmittedTalks.length})
          </h2>
          
          <div className="space-y-3">
            {unsubmittedTalks.map((talk) => {
              const presentCount = talk.attendees.filter(a => a.present).length;
              
              return (
                <div
                  key={talk.id}
                  className="bg-white border border-blue-200 p-4 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">{talk.title || 'Untitled Talk'}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <div className="flex items-center gap-1">
                          <Calendar size={16} />
                          {talk.date}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users size={16} />
                          {presentCount} attendees
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Created: {formatDate(talk.createdAt)}
                      </p>
                    </div>
                    
                    <div className="ml-4">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                        Draft
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {totalPending === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Send size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg">Outbox is empty</p>
          <p className="text-sm">All toolbox talks have been submitted successfully</p>
        </div>
      )}
    </div>
  );
};