import React from 'react';
import { Save, Send, Users, Cloud, Wrench, Sparkles, Loader2 } from 'lucide-react';
import { AlertTriangle, Info, AlertCircle, Zap } from 'lucide-react';
import { ToolboxTalk, Attendee } from '../types';
import { TALK_TEMPLATES } from '../data/templates';
import { QuickAttendance } from './QuickAttendance';
import { RecipientsSelector } from './RecipientsSelector';
import { getCachedWeather } from '../utils/weather';

interface WeatherAlert {
  title: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  urgency: 'immediate' | 'expected' | 'future';
}

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
  const [weatherAlerts, setWeatherAlerts] = React.useState<WeatherAlert[]>([]);
  const [weatherError, setWeatherError] = React.useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = React.useState<string | null>(null);
  const [validationErrors, setValidationErrors] = React.useState<string[]>([]);
  const [showValidation, setShowValidation] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<string>('');
  const [workDescription, setWorkDescription] = React.useState<string>('');
  const [generatingContent, setGeneratingContent] = React.useState(false);
  const [gptError, setGptError] = React.useState<string>('');

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
        setWeatherError('');
        try {
          const weatherData = await getCachedWeather();
          setEditedTalk(prev => ({ ...prev, weather: weatherData.description }));
          setWeatherAlerts(weatherData.alerts || []);
        } catch (error) {
          console.warn('Could not auto-populate weather:', error);
          setWeatherError('Unable to load weather automatically. Click the cloud icon to try again.');
        } finally {
          setLoadingWeather(false);
        }
      }
    };

    autoPopulateWeather();
  }, [editedTalk.weather]);

  const refreshWeather = async () => {
    setLoadingWeather(true);
    setWeatherError('');
    try {
      const weatherData = await getCachedWeather(true); // Force fresh fetch
      setEditedTalk(prev => ({ ...prev, weather: weatherData.description }));
      setWeatherAlerts(weatherData.alerts || []);
    } catch (error) {
      console.warn('Could not refresh weather:', error);
      setWeatherError('Unable to get current weather. Please enter manually or try again.');
    } finally {
      setLoadingWeather(false);
    }
  };

  const getAlertIcon = (severity: WeatherAlert['severity']) => {
    switch (severity) {
      case 'extreme': return <Zap className="text-red-600" size={20} />;
      case 'severe': return <AlertTriangle className="text-red-500" size={20} />;
      case 'moderate': return <AlertCircle className="text-orange-500" size={20} />;
      default: return <Info className="text-blue-500" size={20} />;
    }
  };

  const getAlertBgColor = (severity: WeatherAlert['severity']) => {
    switch (severity) {
      case 'extreme': return 'bg-red-100 border-red-500 text-red-900';
      case 'severe': return 'bg-red-50 border-red-400 text-red-800';
      case 'moderate': return 'bg-orange-50 border-orange-400 text-orange-800';
      default: return 'bg-blue-50 border-blue-400 text-blue-800';
    }
  };

  const handleSave = () => {
    setValidationErrors([]);
    setShowValidation(false);
    setSaveStatus('Saving...');
    onSave(editedTalk);
    setSaveStatus('✅ Draft saved successfully!');
    setTimeout(() => setSaveStatus(''), 3000);
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

  const generateTalkingPoints = async () => {
    if (!workDescription.trim()) {
      setGptError('Please describe the work being performed today');
      return;
    }

    setGeneratingContent(true);
    setGptError('');

    try {
      // Get the OpenAI API key from environment variables
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your environment variables.');
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `You are a construction safety expert who creates toolbox talks. Generate comprehensive safety content for construction workers based on the specific work being performed. Focus on:
              
              1. Specific hazards related to the work described
              2. Required PPE for this type of work
              3. Safe work procedures and best practices
              4. Environmental considerations
              5. Emergency procedures relevant to the work
              6. Key discussion questions to engage workers
              
              Format the response as a complete toolbox talk with clear sections and bullet points. Make it practical and actionable for field supervisors.`
            },
            {
              role: 'user',
              content: `Create a comprehensive toolbox talk for the following work activity: ${workDescription.trim()}
              
              Include specific safety hazards, required PPE, safe procedures, and 3-5 discussion questions to ask the crew to ensure they understand the safety requirements.`
            }
          ],
          max_tokens: 1500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
      }

      const data = await response.json();
      const generatedContent = data.choices?.[0]?.message?.content;
      
      if (!generatedContent) {
        throw new Error('No content generated from API');
      }

      // Create a title based on the work description
      const generatedTitle = `Safety Talk: ${workDescription.trim()}`;
      
      // Update the talk with generated content
      setEditedTalk({
        ...editedTalk,
        title: generatedTitle,
        content: generatedContent
      });
      
      // Clear the work description after successful generation
      setWorkDescription('');
      
    } catch (error) {
      console.error('Error generating talking points:', error);
      setGptError(error instanceof Error ? error.message : 'Failed to generate content. Please try again.');
    } finally {
      setGeneratingContent(false);
    }
  };

  const handleSubmitAttempt = () => {
    // Always try to submit, which will trigger validation if needed
    handleSubmit();
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
  const isSubmitted = !!editedTalk.submittedAt;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Submitted Talk Banner */}
      {isSubmitted && (
        <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold">✅ This toolbox talk has been submitted</span>
          </div>
          <p className="text-sm">
            Submitted on {new Date(editedTalk.submittedAt).toLocaleString()}. 
            All fields are now read-only to maintain record integrity.
          </p>
        </div>
      )}

      {/* Validation Error Banner */}
      {!isSubmitted && showValidation && hasValidationErrors && (
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
      {!isSubmitted && (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Start Options:
        </label>
        <p className="text-sm text-gray-600 mb-4">
          Choose a pre-made template or describe your work to generate custom safety content
        </p>
        
        {/* AI-Generated Content Section */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="text-purple-600" size={20} />
            <h3 className="font-semibold text-purple-800">AI-Generated Toolbox Talk</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Wrench size={16} className="inline mr-1" />
                What work is being performed today?
              </label>
              <textarea
                value={workDescription}
                onChange={(e) => {
                  setWorkDescription(e.target.value);
                  setGptError(''); // Clear error when user types
                }}
                placeholder="e.g., Installing electrical conduit on 3rd floor, Concrete pour for foundation, Roofing installation, Excavation for utilities..."
                className="w-full p-3 border border-gray-300 rounded-lg text-base resize-none"
                rows={3}
              />
            </div>
            
            {gptError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                {gptError}
              </div>
            )}
            
            <button
              onClick={generateTalkingPoints}
              disabled={generatingContent || !workDescription.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              {generatingContent ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Generating Safety Content...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Generate Custom Safety Talk
                </>
              )}
            </button>
            
            {(editedTalk.title || editedTalk.content) && (
              <button
                onClick={() => {
                  // Scroll to the title and content fields for editing
                  const titleField = document.querySelector('[data-field="title"]');
                  if (titleField) {
                    titleField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Focus the title field after scrolling
                    setTimeout(() => {
                      const titleInput = titleField as HTMLInputElement;
                      titleInput.focus();
                      titleInput.select();
                    }, 500);
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Wrench size={20} />
                Edit Generated Content
              </button>
            )}
          </div>
        </div>
        
        {/* Pre-made Templates */}
        <div>
          <h4 className="font-medium text-gray-700 mb-3">Or choose a pre-made template:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {TALK_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => loadTemplate(template.id)}
              className={`text-left p-3 rounded-lg border-2 transition-all duration-300 ${
                selectedTemplate === template.id
                  ? 'bg-green-100 border-green-500 ring-2 ring-green-300 shadow-md transform scale-105'
                  : 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
              }`}
            >
              <div className="font-medium">{template.title}</div>
              <div className="text-sm text-gray-600">{template.category}</div>
            </button>
          ))}
        </div>
        </div>
      </div>
      )}

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date *
          </label>
          <input
            data-field="date"
            type="date"
            disabled={isSubmitted}
            value={editedTalk.date}
            onChange={(e) => setEditedTalk({...editedTalk, date: e.target.value})}
            className={`w-full p-3 border rounded-lg text-lg ${
              isSubmitted 
                ? 'bg-gray-100 text-gray-700 cursor-not-allowed'
                : showValidation && validationErrors.includes('date')
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
            disabled={isSubmitted}
            value={editedTalk.location}
            onChange={(e) => setEditedTalk({...editedTalk, location: e.target.value})}
            placeholder="Job site/location"
            className={`w-full p-3 border rounded-lg text-lg ${
              isSubmitted 
                ? 'bg-gray-100 text-gray-700 cursor-not-allowed'
                : showValidation && validationErrors.includes('location')
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
              disabled={isSubmitted}
              value={editedTalk.weather}
              onChange={(e) => setEditedTalk({...editedTalk, weather: e.target.value})}
              placeholder="Sunny, rainy, etc."
              className={`flex-1 p-3 border rounded-lg text-lg ${
                isSubmitted 
                  ? 'bg-gray-100 text-gray-700 cursor-not-allowed'
                  : showValidation && validationErrors.includes('weather')
                  ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
                  : 'border-gray-300'
              }`}
            />
            {!isSubmitted && (
            <button
              type="button"
              onClick={refreshWeather}
              disabled={loadingWeather}
              className={`px-4 py-3 rounded-lg transition-colors disabled:opacity-50 ${
                weatherError 
                  ? 'bg-orange-100 hover:bg-orange-200 text-orange-700 animate-pulse' 
                  : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
              }`}
              title={weatherError || "Get current weather"}
            >
              <Cloud size={20} className={loadingWeather ? 'animate-spin' : ''} />
            </button>
            )}
          </div>
          {!isSubmitted && weatherError && (
            <p className="text-sm text-orange-600 mt-1 flex items-center gap-1">
              <AlertTriangle size={14} />
              {weatherError}
            </p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supervisor *
          </label>
          <input
            data-field="supervisor"
            type="text"
            disabled={isSubmitted}
            value={editedTalk.supervisor}
            onChange={(e) => setEditedTalk({...editedTalk, supervisor: e.target.value})}
            placeholder="Supervisor name"
            className={`w-full p-3 border rounded-lg text-lg ${
              isSubmitted 
                ? 'bg-gray-100 text-gray-700 cursor-not-allowed'
                : showValidation && validationErrors.includes('supervisor')
                ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
                : 'border-gray-300'
            }`}
          />
        </div>
      </div>

      {/* Weather Alerts Section */}
      {!isSubmitted && weatherAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-red-600 flex items-center gap-2">
            <AlertTriangle size={20} />
            Weather Alerts for Your Location
          </h3>
          {weatherAlerts.map((alert, index) => (
            <div
              key={index}
              className={`border-l-4 p-4 rounded-lg ${getAlertBgColor(alert.severity)}`}
            >
              <div className="flex items-start gap-3">
                {getAlertIcon(alert.severity)}
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-2">{alert.title}</h4>
                  <div className="text-sm space-y-2">
                    <p><strong>Safety Impact:</strong> {alert.description}</p>
                    <div className="flex gap-4 text-xs">
                      <span className="bg-white bg-opacity-50 px-2 py-1 rounded">
                        Severity: {alert.severity.toUpperCase()}
                      </span>
                      <span className="bg-white bg-opacity-50 px-2 py-1 rounded">
                        Urgency: {alert.urgency.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 p-3 bg-white bg-opacity-30 rounded text-sm">
                <strong>⚠️ Include in Safety Discussion:</strong> Make sure to address this weather condition in today's toolbox talk and adjust work activities accordingly.
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Talk Title *
        </label>
        <input
          data-field="title"
          type="text"
          disabled={isSubmitted}
          value={editedTalk.title}
          onChange={(e) => setEditedTalk({...editedTalk, title: e.target.value})}
          placeholder="Today's safety topic"
          className={`w-full p-3 border rounded-lg text-lg font-medium ${
            isSubmitted 
              ? 'bg-gray-100 text-gray-700 cursor-not-allowed'
              : showValidation && validationErrors.includes('title')
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
          disabled={isSubmitted}
          onChange={(e) => setEditedTalk({...editedTalk, content: e.target.value})}
          placeholder="Enter your toolbox talk content here..."
          className={`w-full p-4 border rounded-lg text-base leading-relaxed ${
            isSubmitted 
              ? 'bg-gray-100 text-gray-700 cursor-not-allowed'
              : showValidation && validationErrors.includes('content')
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
          <h2 className="text-xl font-bold text-gray-800">Attendance ({presentCount}/{totalCount})</h2>
        </div>

        {isSubmitted ? (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Final Attendance Record</h3>
            <div className="space-y-3">
              {editedTalk.attendees.length > 0 ? (
                editedTalk.attendees.map((attendee) => (
                  <div
                    key={attendee.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      attendee.present ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-lg">{attendee.name}</span>
                      {attendee.isTemporary && (
                        <span className="bg-orange-200 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                          TEMP
                        </span>
                      )}
                    </div>
                    <span className="font-medium">
                      {attendee.present ? '✅ Present' : '❌ Absent'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No attendees recorded</p>
              )}
            </div>
          </div>
        ) : (
          <div data-field="attendees">
            <QuickAttendance
              attendees={editedTalk.attendees}
              onUpdateAttendees={updateAttendees}
              recentNames={recentNames}
            />
          </div>
        )}
      </div>

      {/* Recipients Section */}
      <div className={`border-t-2 pt-6 ${
        showValidation && validationErrors.includes('recipients')
          ? 'border-red-500'
          : 'border-gray-200'
      }`}>
        {isSubmitted ? (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Mail className="text-blue-600" size={20} />
              Email Recipients
            </h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="space-y-2">
                {editedTalk.recipients.filter(r => r.selected).length > 0 ? (
                  editedTalk.recipients
                    .filter(r => r.selected)
                    .map((recipient) => (
                      <div
                        key={recipient.id}
                        className="flex items-center justify-between p-3 bg-blue-100 text-blue-800 rounded-lg"
                      >
                        <div>
                          <span className="font-medium">{recipient.name}</span>
                          <div className="text-sm flex items-center gap-1">
                            <Mail size={14} />
                            {recipient.email}
                          </div>
                        </div>
                        <span className="text-sm font-medium">✅ Sent</span>
                      </div>
                    ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No recipients selected</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div data-field="recipients">
            <RecipientsSelector
              recipients={editedTalk.recipients}
              onUpdateRecipients={(recipients) => setEditedTalk({...editedTalk, recipients})}
            />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {!isSubmitted && (
        <div className="flex gap-3">
        {saveStatus && (
          <div className="w-full text-center py-2 mb-2 text-green-700 font-medium">
            {saveStatus}
          </div>
        )}
        <button
          onClick={handleSave}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-4 px-6 rounded-lg font-medium text-lg flex items-center justify-center gap-2 transition-colors"
          disabled={saveStatus === 'Saving...'}
        >
          <Save size={24} />
          {saveStatus === 'Saving...' ? 'Saving...' : 'Save Draft'}
        </button>
        
        <button
          onClick={handleSubmit}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-lg font-medium text-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Send size={24} />
          Submit Talk
        </button>
      </div>
      )}
    </div>
  );
};