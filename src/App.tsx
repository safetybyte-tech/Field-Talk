import React from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { TalkEditor } from './components/TalkEditor';
import { ToolboxTalk } from './types';
import { storage } from './utils/storage';
import { api } from './utils/api';

type ViewType = 'dashboard' | 'edit';

function App() {
  const [currentView, setCurrentView] = React.useState<ViewType>('dashboard');
  const [talks, setTalks] = React.useState<ToolboxTalk[]>([]);
  const [currentTalk, setCurrentTalk] = React.useState<ToolboxTalk | null>(null);
  const [recentNames, setRecentNames] = React.useState<string[]>([]);
  const [submitStatus, setSubmitStatus] = React.useState<string>('');

  // Load data on mount
  React.useEffect(() => {
    setTalks(storage.getTalks());
    setRecentNames(storage.getRecentAttendees());
  }, []);

  // Register service worker
  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .catch(error => console.log('SW registration failed:', error));
    }
  }, []);

  const createNewTalk = () => {
    const today = new Date().toISOString().split('T')[0];
    
    const newTalk: ToolboxTalk = {
      id: `talk_${Date.now()}`,
      title: '',
      content: '',
      date: today,
      location: '',
      weather: '',
      supervisor: '',
      attendees: [],
      createdAt: Date.now()
    };
    
    setCurrentTalk(newTalk);
    setCurrentView('edit');
  };

  const editTalk = (talkId: string) => {
    const talk = storage.getTalk(talkId);
    if (talk) {
      setCurrentTalk(talk);
      setCurrentView('edit');
    }
  };

  const saveTalk = (talk: ToolboxTalk) => {
    storage.saveTalk(talk);
    storage.saveRecentAttendees(talk.attendees);
    setTalks(storage.getTalks());
    setRecentNames(storage.getRecentAttendees());
    setSubmitStatus('Talk saved locally');
    setTimeout(() => setSubmitStatus(''), 3000);
  };

  const submitTalk = async (talk: ToolboxTalk) => {
    setSubmitStatus('Submitting...');
    
    // Save locally first
    storage.saveTalk(talk);
    storage.saveRecentAttendees(talk.attendees);
    
    try {
      const success = await api.submitTalk(talk);
      
      if (success) {
        setSubmitStatus('✅ Talk submitted successfully!');
        setTimeout(() => {
          setSubmitStatus('');
          setCurrentView('dashboard');
        }, 2000);
      } else {
        setSubmitStatus('📱 Saved offline - will sync when online');
        setTimeout(() => {
          setSubmitStatus('');
          setCurrentView('dashboard');
        }, 3000);
      }
    } catch (error) {
      setSubmitStatus('📱 Saved offline - will sync when online');
      setTimeout(() => {
        setSubmitStatus('');
        setCurrentView('dashboard');
      }, 3000);
    }
    
    setTalks(storage.getTalks());
    setRecentNames(storage.getRecentAttendees());
  };

  const goToDashboard = () => {
    setCurrentView('dashboard');
    setCurrentTalk(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title={currentView === 'dashboard' ? 'Toolbox Talks' : 'Edit Talk'}
        showQueue={currentView === 'dashboard'}
      />
      
      {submitStatus && (
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 text-center">
          {submitStatus}
        </div>
      )}
      
      {currentView === 'dashboard' && (
        <Dashboard
          talks={talks}
          onNewTalk={createNewTalk}
          onEditTalk={editTalk}
        />
      )}
      
      {currentView === 'edit' && currentTalk && (
        <div>
          <div className="p-4">
            <button
              onClick={goToDashboard}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Dashboard
            </button>
          </div>
          
          <TalkEditor
            talk={currentTalk}
            onSave={saveTalk}
            onSubmit={submitTalk}
            recentNames={recentNames}
          />
        </div>
      )}
    </div>
  );
}

export default App;