import React from 'react';
import { Save, Send, Users } from 'lucide-react';
import { ToolboxTalk, Attendee } from '../types';
import { TALK_TEMPLATES } from '../data/templates';
import { QuickAttendance } from './QuickAttendance';

interface TalkEditorProps {
  talk: ToolboxTalk;
  onSave: (talk: ToolboxTalk) => void;
  onSubmit: (talk: ToolboxTalk) => void;
  recentNames: string[];
}

export const TalkEditor: React.FC<TalkEditorProps> = ({
  talk,
  onSave,
  onSubmit,
  recentNames
}) => {
  const [editedTalk, setEditedTalk] = React.useState<ToolboxTalk>(talk);
  const [activeTab, setActiveTab] = React.useState<'content' | 'attendance'>('content');

  const handleSave = () => {
    onSave(editedTalk);
  };

  const handleSubmit = () => {
    const finalTalk = {
      ...editedTalk,
      submittedAt: Date.now()
    };
    onSubmit(finalTalk);
  };

  const loadTemplate = (templateId: string) => {
    const template = TALK_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setEditedTalk({
        ...editedTalk,
        title: template.title,
        content: template.content
      });
    }
  };

  const updateAttendees = (attendees: Attendee[]) => {
    setEditedTalk({
      ...editedTalk,
      attendees
    });
  };

  const presentCount = editedTalk.attendees.filter(a => a.present).length;
  const totalCount = editedTalk.attendees.length;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('content')}
          className={`flex-1 py-3 px-4 rounded-md text-center font-medium transition-colors ${
            activeTab === 'content'
              ? 'bg-white text-blue-600 shadow'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Content
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex-1 py-3 px-4 rounded-md text-center font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'attendance'
              ? 'bg-white text-blue-600 shadow'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Users size={18} />
          Attendance ({presentCount}/{totalCount})
        </button>
      </div>

      {activeTab === 'content' && (
        <div className="space-y-6">
          {/* Quick Template Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Templates:
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {TALK_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => loadTemplate(template.id)}
                  className="text-left p-3 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  <div className="font-medium">{template.title}</div>
                  <div className="text-sm text-gray-600">{template.category}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={editedTalk.date}
                onChange={(e) => setEditedTalk({...editedTalk, date: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg text-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={editedTalk.location}
                onChange={(e) => setEditedTalk({...editedTalk, location: e.target.value})}
                placeholder="Job site/location"
                className="w-full p-3 border border-gray-300 rounded-lg text-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weather
              </label>
              <input
                type="text"
                value={editedTalk.weather}
                onChange={(e) => setEditedTalk({...editedTalk, weather: e.target.value})}
                placeholder="Sunny, rainy, etc."
                className="w-full p-3 border border-gray-300 rounded-lg text-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supervisor
              </label>
              <input
                type="text"
                value={editedTalk.supervisor}
                onChange={(e) => setEditedTalk({...editedTalk, supervisor: e.target.value})}
                placeholder="Supervisor name"
                className="w-full p-3 border border-gray-300 rounded-lg text-lg"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Talk Title
            </label>
            <input
              type="text"
              value={editedTalk.title}
              onChange={(e) => setEditedTalk({...editedTalk, title: e.target.value})}
              placeholder="Today's safety topic"
              className="w-full p-3 border border-gray-300 rounded-lg text-lg font-medium"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Talk Content
            </label>
            <textarea
              value={editedTalk.content}
              onChange={(e) => setEditedTalk({...editedTalk, content: e.target.value})}
              placeholder="Enter your toolbox talk content here..."
              className="w-full p-4 border border-gray-300 rounded-lg text-base leading-relaxed"
              rows={12}
            />
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <QuickAttendance
          attendees={editedTalk.attendees}
          onUpdateAttendees={updateAttendees}
          recentNames={recentNames}
        />
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-lg font-medium text-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Save size={24} />
          Save Draft
        </button>
        
        <button
          onClick={handleSubmit}
          disabled={!editedTalk.title || !editedTalk.content || totalCount === 0}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-4 px-6 rounded-lg font-medium text-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Send size={24} />
          Submit Talk
        </button>
      </div>
    </div>
  );
};