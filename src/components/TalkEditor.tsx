import React from 'react';
import { Save, Send, Users, Cloud, Wrench, Sparkles, Loader2, Mail, Plus, Search } from 'lucide-react';
import { AlertTriangle, Info, AlertCircle, Zap } from 'lucide-react';
import { ToolboxTalk, Attendee } from '../types';
import { TALK_TEMPLATES } from '../data/templates';
import { QuickAttendance } from './QuickAttendance';
import { RecipientsSelector } from './RecipientsSelector';
import { getCachedWeather } from '../utils/weather';
import { logger } from '../utils/logger';

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
  onRemoveRecentName: (name: string) => void;
}

export const TalkEditor: React.FC<TalkEditorProps> = ({
  talk,
  onSave,
  onSubmit,
  recentNames,
  currentUser,
  onRemoveRecentName
}) => {
  const [editedTalk, setEditedTalk] = React.useState<ToolboxTalk>(talk);
  const [locationSearch, setLocationSearch] = React.useState('');
  const [showLocationDropdown, setShowLocationDropdown] = React.useState(false);
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
  const [rollcallStartTime, setRollcallStartTime] = React.useState<number | null>(null);
  const [hasUsedAI, setHasUsedAI] = React.useState(false);
  const [isContentEditable, setIsContentEditable] = React.useState(false);
  const [showEditButton, setShowEditButton] = React.useState(false);

  // Common construction site locations for suggestions
  const commonLocations = [
    'Main Office Building',
    'Construction Site A',
    'Construction Site B', 
    'Warehouse',
    'Equipment Yard',
    'Parking Structure',
    'Building 1 - Ground Floor',
    'Building 1 - 2nd Floor',
    'Building 1 - 3rd Floor',
    'Building 2 - Ground Floor',
    'Building 2 - 2nd Floor',
    'Mechanical Room',
    'Electrical Room',
    'Loading Dock',
    'Site Trailer',
    'Safety Office'
  ];

  // Filter locations based on search term
  const filteredLocations = commonLocations.filter(location =>
    location.toLowerCase().includes(locationSearch.toLowerCase())
  );

  // Initialize location search with current location value
  React.useEffect(() => {
    setLocationSearch(editedTalk.location);
  }, [editedTalk.location]);

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

  const handleLocationSelect = (location: string) => {
    setEditedTalk({...editedTalk, location});
    setLocationSearch(location);
    setShowLocationDropdown(false);
  };

  const handleLocationInputChange = (value: string) => {
    setLocationSearch(value);
    setEditedTalk({...editedTalk, location: value});
    setShowLocationDropdown(value.length > 0);
  };

  const handleLocationKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && locationSearch.trim()) {
      setEditedTalk({...editedTalk, location: locationSearch.trim()});
      setShowLocationDropdown(false);
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

    // Check for vague prompts before making API call
    const trimmedDescription = workDescription.trim();
    const vaguenessChecks = {
      tooShort: trimmedDescription.length < 20,
      tooGeneric: /^(work|job|task|construction|building|project)$/i.test(trimmedDescription),
      onlyCommonWords: /^(doing|some|general|basic|normal|regular|standard)\s*(work|job|task|construction|building|project)?$/i.test(trimmedDescription)
    };

    // Determine if prompt is vague and why
    let vaguenessReason = null;
    if (vaguenessChecks.tooShort) {
      vaguenessReason = 'too_short';
    } else if (vaguenessChecks.tooGeneric) {
      vaguenessReason = 'too_generic';
    } else if (vaguenessChecks.onlyCommonWords) {
      vaguenessReason = 'only_common_words';
    }

    if (vaguenessReason) {
      // Log the vague prompt detection
      logger.logEvent(editedTalk.id, 'vague_prompt_detected', {
        prompt: trimmedDescription,
        reason: vaguenessReason,
        prompt_length: trimmedDescription.length
      });

      // Set error message to guide user
      setGptError(
        'Please provide more specific details about the work. For example: "Installing electrical conduit on 3rd floor", "Concrete pour for foundation", or "Roofing installation with safety harnesses". Include specific tasks, locations, equipment, or materials involved.'
      );
      return;
    }

    setGeneratingContent(true);
    setGptError('');
    
    // Start timing the AI generation
    logger.startTimer(`ai_generation_${editedTalk.id}`);

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
              content: `You are a construction safety expert tasked with generating a Markdown-formatted toolbox talk script for a construction foreman. The script must be practical, engaging, and strictly aligned with U.S. construction safety standards.

Your output should follow this structure:

1. **Title**: A short, clear topic title derived from the task (e.g., 'Tile Cutting Safety').
2. **Introduction**: 1–2 sentences explaining the task and why safety matters. Always connect to relevance and real-world consequences.
3. **Bullet Points**: Provide 4–6 concise bullet points covering:
   • Hazard identification (always mention at least one worst-case scenario or life-altering risk, adapting the tone to severity).
   • Task-specific safe work practices and controls.
   • SIF-specific controls (fall protection, trench safety, lockout/tagout, etc.) if applicable.
   • Use plain, direct phrasing suitable for a foreman to speak aloud.
4. **Discussion Questions**: Include at least one, ideally two open-ended questions that invite worker participation (e.g., 'What hazards do you see in this task that we haven't covered?' or 'Has anyone experienced a near miss while doing this type of work?').
5. **Visual Aid**: Include placeholder text suggesting what kind of image/diagram could support this talk (e.g., 'Insert diagram of proper ladder setup').

Adjust your tone based on the risk level of the task:
• **High risk**: Use an urgent, serious tone emphasizing life-saving controls and immediate hazards.
• **Moderate risk**: Maintain a balanced tone highlighting safety essentials and long-term risks.
• **Low risk**: Use a calm, routine tone but still stress the potential for serious or long-term injury (e.g., cuts, strains, silica exposure).

If the provided task description is too vague or non-specific (e.g., 'miscellaneous work', 'carpentry'), you must respond with a clarification prompt asking for more detail about the specific task or hazard so you can generate a focused toolbox talk.`
            },
            {
              role: 'user',
              content: `Create a comprehensive toolbox talk for a ${currentUser?.trade || 'construction worker'} performing the following work activity: ${workDescription.trim()}
              
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

      // Log successful AI generation
      const latencyMs = logger.getElapsedTime(`ai_generation_${editedTalk.id}`);
      logger.logEvent(editedTalk.id, 'talk_generated', { latency_ms: latencyMs });

      // Create a title based on the work description
      const generatedTitle = `Safety Talk: ${workDescription.trim()}`;
      
      // Update the talk with generated content
      setEditedTalk({
        ...editedTalk,
        title: generatedTitle,
        content: generatedContent
      });
      
      // Mark that AI has been used
      setHasUsedAI(true);
      
      // Show the edit button and make content non-editable initially
      setShowEditButton(true);
      setIsContentEditable(false);
      
      // Clear the work description after successful generation
      setWorkDescription('');
      
    } catch (error) {
      const latencyMs = logger.getElapsedTime(`ai_generation_${editedTalk.id}`);
      logger.logEvent(editedTalk.id, 'send_failed', { 
        error: error instanceof Error ? error.message : 'AI generation failed',
        latency_ms: latencyMs,
        context: 'ai_generation'
      });
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
      // Log template selection
      logger.logEvent(editedTalk.id, 'task_selected', { 
        source: 'template_selection',
        template_id: templateId,
        template_title: template.title
      });
      
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
    // Log rollcall completion if we have a start time
    if (rollcallStartTime && attendees.length > 0) {
      const latencyMs = Date.now() - rollcallStartTime;
      const presentCount = attendees.filter(a => a.present).length;
      const absentCount = attendees.filter(a => !a.present).length;
      const tempCount = attendees.filter(a => a.isTemporary).length;
      
      logger.logEvent(editedTalk.id, 'rollcall_completed', {
        latency_ms: latencyMs,
        present: presentCount,
        absent: absentCount,
        temp: tempCount
      });
      
      setRollcallStartTime(null); // Reset timer
    }
    
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
      {/* Draft Talk Banner */}
      {!isSubmitted && (
        <div className="bg-primary-50 border-l-4 border-primary-500 text-primary-700 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold">📝 Draft Toolbox Talk</span>
          </div>
          <p className="text-sm">
            Started on {new Date(editedTalk.createdAt).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })} • Not yet completed
          </p>
        </div>
      )}

      {/* Submitted Talk Banner */}
      {isSubmitted && (
        <div className="bg-primary-50 border-l-4 border-primary-500 text-primary-700 p-4 rounded-lg">
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
        <div className="bg-gradient-to-r from-primary-50 to-secondary-50 border-2 border-primary-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="text-primary-600" size={20} />
            <h3 className="font-semibold text-primary-800">AI-Generated Toolbox Talk</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
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
                className="w-full p-3 border border-secondary-300 rounded-lg text-base resize-none"
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
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-secondary-400 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
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
                  // Log AI generation task selection
                  logger.logEvent(editedTalk.id, 'task_selected', { source: 'ai_generation' });
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
                className="w-full bg-secondary-600 hover:bg-secondary-700 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Wrench size={20} />
                Edit Generated Content
              </button>
            )}
          </div>
        </div>
        
        {/* Pre-made Templates */}
        {!hasUsedAI && (
          <div>
            <h4 className="font-medium text-secondary-700 mb-3">Or choose a pre-made template:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {TALK_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => loadTemplate(template.id)}
                  className={`text-left p-3 rounded-lg border-2 transition-all duration-300 ${
                    selectedTemplate === template.id
                      ? 'bg-primary-100 border-primary-500 ring-2 ring-primary-300 shadow-md transform scale-105'
                      : 'bg-secondary-50 border-secondary-200 hover:bg-secondary-100 hover:border-secondary-300'
                  }`}
                >
                  <div className="font-medium">{template.title}</div>
                  <div className="text-sm text-secondary-600">{template.category}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">
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
                ? 'bg-secondary-100 text-secondary-700 cursor-not-allowed'
                : showValidation && validationErrors.includes('date')
                ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
                : 'border-secondary-300'
            }`}
          />
        </div>
        
        <div className="relative">
          <label className="block text-sm font-medium text-secondary-700 mb-1">
            Location *
          </label>
          <div className="relative">
            <input
              data-field="location"
              type="text"
              disabled={isSubmitted}
              value={locationSearch}
              onChange={(e) => handleLocationInputChange(e.target.value)}
              onKeyPress={handleLocationKeyPress}
              onFocus={() => setShowLocationDropdown(locationSearch.length > 0)}
              onBlur={() => setTimeout(() => setShowLocationDropdown(false), 200)}
              placeholder="Search locations or type new location..."
              className={`w-full p-3 border rounded-lg text-lg ${
                isSubmitted 
                  ? 'bg-secondary-100 text-secondary-700 cursor-not-allowed'
                  : showValidation && validationErrors.includes('location')
                  ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
                  : 'border-secondary-300'
              }`}
            />
            
            {/* Dropdown for location suggestions */}
            {!isSubmitted && showLocationDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-secondary-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {/* Show filtered suggestions */}
                {filteredLocations.length > 0 && (
                  <>
                    {filteredLocations.slice(0, 8).map((location, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleLocationSelect(location)}
                        className="w-full text-left px-4 py-3 hover:bg-primary-50 border-b border-secondary-100 last:border-b-0 transition-colors"
                      >
                        <span className="font-medium">{location}</span>
                      </button>
                    ))}
                  </>
                )}
                
                {/* Show "Add new location" option if search doesn't match exactly */}
                {locationSearch.trim() && 
                 !filteredLocations.some(loc => loc.toLowerCase() === locationSearch.toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => handleLocationSelect(locationSearch.trim())}
                    className="w-full text-left px-4 py-3 hover:bg-primary-50 border-b border-secondary-100 bg-primary-25 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Plus size={16} className="text-primary-600" />
                      <span className="font-medium text-primary-700">
                        Add "{locationSearch.trim()}"
                      </span>
                    </div>
                  </button>
                )}
                
                {/* Show message if no results */}
                {filteredLocations.length === 0 && locationSearch.trim() && (
                  <div className="px-4 py-3 text-secondary-500 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Search size={16} />
                      <span>No matching locations found</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLocationSelect(locationSearch.trim())}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Add "{locationSearch.trim()}" as new location
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">
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
                  ? 'bg-secondary-100 text-secondary-700 cursor-not-allowed'
                  : showValidation && validationErrors.includes('weather')
                  ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
                  : 'border-secondary-300'
              }`}
            />
            {!isSubmitted && (
            <button
              type="button"
              onClick={refreshWeather}
              disabled={loadingWeather}
              className={`px-4 py-3 rounded-lg transition-colors disabled:opacity-50 ${
                weatherError 
                  ? 'bg-red-100 hover:bg-red-200 text-red-700 animate-pulse' 
                  : 'bg-primary-100 hover:bg-primary-200 text-primary-700'
              }`}
              title={weatherError || "Get current weather"}
            >
              <Cloud size={20} className={loadingWeather ? 'animate-spin' : ''} />
            </button>
            )}
          </div>
          {!isSubmitted && weatherError && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertTriangle size={14} />
              {weatherError}
            </p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">
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
                ? 'bg-secondary-100 text-secondary-700 cursor-not-allowed'
                : showValidation && validationErrors.includes('supervisor')
                ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
                : 'border-secondary-300'
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

      {/* Edit Generated Content Button - appears above title when AI content is generated */}
      {showEditButton && hasUsedAI && (editedTalk.title || editedTalk.content) && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-800 mb-1">Generated Content Ready</h3>
              <p className="text-sm text-blue-700">
                Review the generated content below, then click "Edit Content" to make changes.
              </p>
            </div>
            <button
              onClick={() => {
                // Log AI generation task selection
                logger.logEvent(editedTalk.id, 'task_selected', { source: 'ai_generation' });
                setIsContentEditable(true);
                setShowEditButton(false);
                // Scroll to the title field for editing
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
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Wrench size={16} />
              Edit Content
            </button>
          </div>
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 mb-1">
          Talk Title *
        </label>
        <input
          data-field="title"
          type="text"
          disabled={isSubmitted || (hasUsedAI && !isContentEditable)}
          value={editedTalk.title}
          onChange={(e) => setEditedTalk({...editedTalk, title: e.target.value})}
          placeholder="Today's safety topic"
          className={`w-full p-3 border rounded-lg text-lg font-medium ${
            isSubmitted || (hasUsedAI && !isContentEditable)
              ? 'bg-secondary-100 text-secondary-700 cursor-not-allowed'
              : showValidation && validationErrors.includes('title')
              ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
              : 'border-secondary-300'
          }`}
        />
      </div>

      {/* Content */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 mb-1">
          Talk Content *
        </label>
        <textarea
          data-field="content"
          value={editedTalk.content}
          disabled={isSubmitted || (hasUsedAI && !isContentEditable)}
          onChange={(e) => setEditedTalk({...editedTalk, content: e.target.value})}
          placeholder="Enter your toolbox talk content here..."
          className={`w-full p-4 border rounded-lg text-base leading-relaxed ${
            isSubmitted || (hasUsedAI && !isContentEditable)
              ? 'bg-secondary-100 text-secondary-700 cursor-not-allowed'
              : showValidation && validationErrors.includes('content')
              ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
              : 'border-secondary-300'
          }`}
          rows={12}
        />
      </div>

      {/* Attendance Section */}
      <div className={`border-t-2 pt-6 ${
        showValidation && validationErrors.includes('attendees')
          ? 'border-red-500'
          : 'border-secondary-200'
      }`}>
        <div className="flex items-center gap-2 mb-4">
          <Users size={24} className="text-primary-600" />
          <h2 className="text-xl font-bold text-secondary-800">Attendance ({presentCount}/{totalCount})</h2>
        </div>

        {isSubmitted ? (
          <div className="bg-secondary-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Final Attendance Record</h3>
            <div className="space-y-3">
              {editedTalk.attendees.length > 0 ? (
                editedTalk.attendees.map((attendee) => (
                  <div
                    key={attendee.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      attendee.present ? 'bg-primary-100 text-primary-800' : 'bg-red-100 text-red-800'
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
                <p className="text-secondary-500 text-center py-4">No attendees recorded</p>
              )}
            </div>
          </div>
        ) : (
          <div data-field="attendees">
            {/* Log rollcall opened when component mounts */}
            {React.useEffect(() => {
              if (!rollcallStartTime) {
                logger.logEvent(editedTalk.id, 'rollcall_opened');
                setRollcallStartTime(Date.now());
              }
            }, [])}
            <QuickAttendance
              attendees={editedTalk.attendees}
              onUpdateAttendees={updateAttendees}
              recentNames={recentNames}
              onRemoveRecentName={onRemoveRecentName}
            />
          </div>
        )}
      </div>

      {/* Recipients Section */}
      <div className={`border-t-2 pt-6 ${
        showValidation && validationErrors.includes('recipients')
          ? 'border-red-500'
          : 'border-secondary-200'
      }`}>
        {isSubmitted ? (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Mail className="text-primary-600" size={20} />
              Email Recipients
            </h3>
            <div className="bg-secondary-50 rounded-lg p-6">
              <div className="space-y-2">
                {editedTalk.recipients.filter(r => r.selected).length > 0 ? (
                  editedTalk.recipients
                    .filter(r => r.selected)
                    .map((recipient) => (
                      <div
                        key={recipient.id}
                        className="flex items-center justify-between p-3 bg-primary-100 text-primary-800 rounded-lg"
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
                  <p className="text-secondary-500 text-center py-4">No recipients selected</p>
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
        <div className="flex flex-col gap-4">
          {hasUsedAI && (editedTalk.title || editedTalk.content) && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="text-green-600" size={20} />
                <span className="font-semibold">Content Generated Successfully!</span>
              </div>
              <p className="text-sm">
                Your custom safety talk has been generated below. Scroll down to review and edit the content.
              </p>
            </div>
          )}
          
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              className="flex-1 bg-secondary-600 hover:bg-secondary-700 text-white py-3 px-6 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Save size={20} />
              Save Draft
            </button>
            
            <button
              onClick={handleSubmitAttempt}
              disabled={!isFormValid}
              className={`flex-1 py-3 px-6 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                isFormValid
                  ? 'bg-primary-600 hover:bg-primary-700 text-white'
                  : 'bg-secondary-300 text-secondary-500 cursor-not-allowed'
              }`}
            >
              <Send size={20} />
              Submit Talk
            </button>
          </div>
          
          {saveStatus && (
            <div className="text-center text-sm text-primary-600 font-medium">
              {saveStatus}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
          <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="text-green-600" size={20} />
              <span className="font-semibold">Content Generated Successfully!</span>
            </div>
            <p className="text-sm">
              Your custom safety talk has been generated below. Scroll down to review and edit the content.
            </p>
          </div>
        )}
      )}
    </div>
  );
};