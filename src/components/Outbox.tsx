import React from 'react';
import { ArrowLeft, Send, Clock, Calendar, Users, Trash2 } from 'lucide-react';
import { ToolboxTalk } from '../types';

interface OutboxProps {
  talks: ToolboxTalk[];
  onBack: () => void;
  onDeleteTalk: (id: string) => void;
  onEditTalk: (id: string) => void;
}

export const Outbox: React.FC<OutboxProps> = ({ talks, onBack, onDeleteTalk, onEditTalk }) => {
  const unsubmittedTalks = talks.filter(talk => !talk.submittedAt);
  const submittedTalks = talks.filter(talk => !!talk.submittedAt);

  const deleteTalk = (id: string) => {
    if (window.confirm('Are you sure you want to delete this toolbox talk? This action cannot be undone.')) {
      onDeleteTalk(id);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  };

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
            {unsubmittedTalks.length} draft{unsubmittedTalks.length !== 1 ? 's' : ''} pending
          </p>
        </div>
      </div>

      {/* Unsubmitted Drafts */}
      {unsubmittedTalks.length > 0 && (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 text-blue-800">
              <Clock size={20} className="text-blue-600" />
              Draft Toolbox Talks ({unsubmittedTalks.length})
            </h2>
            <p className="text-sm text-blue-700 mb-3">
              These are saved drafts that haven't been submitted yet. Click on any draft to continue editing and submit.
            </p>
          </div>

          <div className="space-y-3">
            {unsubmittedTalks.map((talk) => {
              const presentCount = talk.attendees.filter(a => a.present).length;

              return (
                <div
                  key={talk.id}
                  className="bg-white border-l-4 border-blue-400 border border-blue-200 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onEditTalk(talk.id)}
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
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                        Draft
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTalk(talk.id);
                        }}
                        className="ml-2 p-1 text-gray-500 hover:text-red-600 transition-colors"
                        title="Delete this toolbox talk"
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

      {/* Submitted History */}
      {submittedTalks.length > 0 && (
        <div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 text-green-800">
              <Send size={20} className="text-green-600" />
              Submitted ({submittedTalks.length})
            </h2>
          </div>

          <div className="space-y-3">
            {submittedTalks.slice(0, 10).map((talk) => {
              const presentCount = talk.attendees.filter(a => a.present).length;

              return (
                <div
                  key={talk.id}
                  className="bg-white border-l-4 border-green-400 border border-green-200 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onEditTalk(talk.id)}
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
                      {talk.submittedAt && (
                        <p className="text-sm text-gray-500 mt-1">
                          Submitted: {formatDate(talk.submittedAt)}
                        </p>
                      )}
                    </div>

                    <div className="ml-4">
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                        Submitted
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
      {unsubmittedTalks.length === 0 && submittedTalks.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
          <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send size={32} className="text-green-600" />
          </div>
          <p className="text-lg font-medium text-gray-700">All caught up!</p>
          <p className="text-sm text-gray-500">No toolbox talks yet</p>
        </div>
      )}
    </div>
  );
};
