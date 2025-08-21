import React from 'react';
import { Save, Send, Users, Cloud } from 'lucide-react';
import { ToolboxTalk, Attendee } from '../types';
import { TALK_TEMPLATES } from '../data/templates';
import { QuickAttendance } from './QuickAttendance';
import { RecipientsSelector } from './RecipientsSelector';
import { getCachedWeather } from '../utils/weather';

interface TalkEditorProps {
  talk: ToolboxTalk;
  onSave: (talk: ToolboxTalk) => void;
  onSubmit: (talk: ToolboxTalk) => void;
  recentNames: string[];
  currentUser?: { name: string } | null;
}

export const TalkEditor: React.FC<TalkEditorProps> = ({
  talk,
  onSave,
  onSubmit,
  recentNames,
  currentUser
}) => {
  const [editedTalk, setEditedTalk] = React.useState<ToolboxTalk>(talk);
  const [loadingWeather, setLoadingWeather] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState<string | null>(null);
  const [validationErrors, setValidationErrors] = React.useState<string[]>([]);
  const [showValidation, setShowValidation] = React.useState(false);

  // Auto-fill supervisor name from current user
  React.useEffect(() => {
    if (currentUser && !editedTalk.supervisor) {
      setEditedTalk(prev => ({ ...prev, supervisor: currentUser.name }));
    }
  }, [currentUser, editedTalk.supervisor]);

  // Auto-populate weather on component mount if weather is empty
  React.useEffect(() => {
    const autoPopulateWeather = async () => {
      if (!editedTalk.weather) {
        setLoadingWeather(true);
        try {
          const weather = await getCachedWeather();
          setEditedTalk(prev => ({ ...prev, weather }));
        } catch (error) {
          console.warn('Could not auto-populate weather:', error);
        } finally {
          setLoadingWeather(false);
        }
      recipients: [],
      }
    };

    autoPopulateWeather();
  }, [editedTalk.weather]);

  const refreshWeather = async () => {
    setLoadingWeather(true);
    try {
      const weather = await getCachedWeather();
      setEditedTalk(prev => ({ ...prev, weather }));
    } catch (error) {
      console.warn('Could not refresh weather:', error);
    } finally {
      setLoadingWeather(false);
    }
  };

  const handleSave = () => {
    setValidationErrors([]);
    setShowValidation(false);
    onSave(editedTalk);
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    if (!editedTalk.title.trim()) errors.push('title');
    if (!editedTalk.content.trim()) errors.push('content');
    if (!editedTalk.date) errors.push('date');
    if (!editedTalk.location.trim()) errors.push('location');
    if (!editedTalk.weather.trim()) errors.push('weather');
    if (!editedTalk.supervisor.trim()) errors.push('supervisor');
    if (editedTalk.attendees.length === 0) errors.push('attendees');
    if (editedTalk.recipients.filter(r => r.selected).length === 0) errors.push('recipients');
    
    return errors;
  };

  const handleSubmit = () => {
    const errors = validateForm();
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowValidation(true);
      
      // Scroll to first error field
      const firstErrorField = document.querySelector(`[data-field="${errors[0]}"]`);
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      return;
    }
    
    setValidationErrors([]);
    setShowValidation(false);
    const finalTalk = {
      ...editedTalk,
      submittedAt: Date.now()
    };
    onSubmit(finalTalk);
  };

  const loadTemplate = (templateId: string) => {
    const template = TALK_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setEditedTalk({
        ...editedTalk,
        title: template.title,
        content: template.content
      });
      
      // Clear selection after 2 seconds to show it was applied
      setTimeout(() => setSelectedTemplate(null), 2000);
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
  const hasValidationErrors = validationErrors.length > 0;
  const isFormValid = validateForm().length === 0;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Validation Error Banner */}
      {showValidation && hasValidationErrors && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold">Please complete all required fields:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {validationErrors.includes('title') && <li>Talk Title is required</li>}
            {validationErrors.includes('content') && <li>Talk Content is required</li>}
            {validationErrors.includes('date') && <li>Date is required</li>}
            {validationErrors.includes('location') && <li>Location is required</li>}
            {validationErrors.includes('weather') && <li>Weather is required</li>}
            {validationErrors.includes('supervisor') && <li>Supervisor name is required</li>}
            {validationErrors.includes('attendees') && <li>At least one attendee is required</li>}
            {validationErrors.includes('recipients') && <li>At least one email recipient must be selected</li>}
          </ul>
        </div>
      )}

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
              className={`text-left p-3 rounded-lg border-2 transition-all duration-300 ${
                selectedTemplate === template.id
                  ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-300 shadow-md transform scale-105'
                  : 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
              }`}
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
            Date *
          </label>
          <input
            data-field="date"
            type="date"
            value={editedTalk.date}
            onChange={(e) => setEditedTalk({...editedTalk, date: e.target.value})}
            className={`w-full p-3 border rounded-lg text-lg ${
              showValidation && validationErrors.includes('date')
                ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
                : 'border-gray-300'
            }`}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location *
          </label>
          <input
            data-field="location"
            type="text"
            value={editedTalk.location}
            onChange={(e) => setEditedTalk({...editedTalk, location: e.target.value})}
            placeholder="Job site/location"
            className={`w-full p-3 border rounded-lg text-lg ${
              showValidation && validationErrors.includes('location')
                ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
                : 'border-gray-300'
            }`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Weather *
          </label>
          <div className="flex gap-2">
            <input
              data-field="weather"
              type="text"
              value={editedTalk.weather}
              onChange={(e) => setEditedTalk({...editedTalk, weather: e.target.value})}
              placeholder="Sunny, rainy, etc."
              className={`flex-1 p-3 border rounded-lg text-lg ${
                showValidation && validationErrors.includes('weather')
                  ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
                  : 'border-gray-300'
              }`}
            />
            <button
              type="button"
              onClick={refreshWeather}
              disabled={loadingWeather}
              className="px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors disabled:opacity-50"
              title="Get current weather"
            >
              <Cloud size={20} className={loadingWeather ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supervisor *
          </label>
          <input
            data-field="supervisor"
            type="text"
            value={editedTalk.supervisor}
            onChange={(e) => setEditedTalk({...editedTalk, supervisor: e.target.value})}
            placeholder="Supervisor name"
            className={`w-full p-3 border rounded-lg text-lg ${
              showValidation && validationErrors.includes('supervisor')
                ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
                : 'border-gray-300'
            }`}
          />
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Talk Title *
        </label>
        <input
          data-field="title"
          type="text"
          value={editedTalk.title}
          onChange={(e) => setEditedTalk({...editedTalk, title: e.target.value})}
          placeholder="Today's safety topic"
          className={`w-full p-3 border rounded-lg text-lg font-medium ${
            showValidation && validationErrors.includes('title')
              ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
              : 'border-gray-300'
          }`}
        />
      </div>

      {/* Content */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Talk Content *
        </label>
        <textarea
          data-field="content"
          value={editedTalk.content}
          onChange={(e) => setEditedTalk({...editedTalk, content: e.target.value})}
          placeholder="Enter your toolbox talk content here..."
          className={`w-full p-4 border rounded-lg text-base leading-relaxed ${
            showValidation && validationErrors.includes('content')
              ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
              : 'border-gray-300'
          }`}
          rows={12}
        />
      </div>

      {/* Attendance Section */}
      <div className={`border-t-2 pt-6 ${
        showValidation && validationErrors.includes('attendees')
          ? 'border-red-500'
          : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-2 mb-4">
          <Users size={24} className="text-blue-600" />
          <h2 className={`text-xl font-bold ${
            showValidation && validationErrors.includes('attendees')
              ? 'text-red-600'
              : ''
          }`}>
            Attendance ({presentCount}/{totalCount}) *
          </h2>
        </div>
        
        <div data-field="attendees">
          <QuickAttendance
            attendees={editedTalk.attendees}
            onUpdateAttendees={updateAttendees}
            recentNames={recentNames}
          />
        </div>
      </div>

      {/* Recipients Section */}
      <div className={`border-t-2 pt-6 ${
        showValidation && validationErrors.includes('recipients')
          ? 'border-red-500'
          : 'border-gray-200'
      }`}>
        <div data-field="recipients">
          <RecipientsSelector
            recipients={editedTalk.recipients}
            onUpdateRecipients={(recipients) => setEditedTalk({...editedTalk, recipients})}
          />
        </div>
      </div>

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
          disabled={!isFormValid}
          className={`flex-1 py-4 px-6 rounded-lg font-medium text-lg flex items-center justify-center gap-2 transition-colors ${
            isFormValid
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-400 cursor-not-allowed text-white'
          }`}
        >
          <Send size={24} />
          Submit Talk
        </button>
      </div>
    </div>
  );
};