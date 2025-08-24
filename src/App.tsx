import React from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { TalkEditor } from './components/TalkEditor';
import { Outbox } from './components/Outbox';
import { LandingPage } from './components/LandingPage';
import { ToolboxTalk, User } from './types';
import { storage } from './utils/storage';
import { api } from './utils/api';
import { auth } from './utils/auth';

type ViewType = 'dashboard' | 'edit' | 'outbox';

function App() {
  const [user, setUser] = React.useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [currentView, setCurrentView] = React.useState<ViewType>('dashboard');
  const [talks, setTalks] = React.useState<ToolboxTalk[]>([]);
  const [currentTalk, setCurrentTalk] = React.useState<ToolboxTalk | null>(null);
  const [recentNames, setRecentNames] = React.useState<string[]>([]);
  const [submitStatus, setSubmitStatus] = React.useState<string>('');

  const removeRecentName = (name: string) => {
    storage.removeRecentAttendee(name);
    setRecentNames(storage.getRecentAttendees());
  };

  const deleteTalk = (id: string) => {
    storage.deleteTalk(id);
    setTalks(storage.getTalks());
  };

  // Check for existing user session on mount
  React.useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setIsAuthenticated(true);
    }
  }, []);

  // Load data on mount
  React.useEffect(() => {
    if (isAuthenticated) {
      setTalks(storage.getTalks());
      setRecentNames(storage.getRecentAttendees());
    }
  }, [isAuthenticated]);

  // Register service worker
  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .catch(error => console.log('SW registration failed:', error));
    }
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    auth.logout();
    setUser(null);
    setIsAuthenticated(false);
    setCurrentView('dashboard');
    setCurrentTalk(null);
    setTalks([]);
    setRecentNames([]);
  };

  const createNewTalk = () => {
    const today = new Date();
    const localDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000))
      .toISOString()
      .split('T')[0]; // YYYY-MM-DD format in local timezone
    
    const newTalk: ToolboxTalk = {
      id: `talk_${Date.now()}`,
      title: '',
      content: '',
      date: localDate,
      location: '',
      weather: '',
      supervisor: user?.name || '',
      attendees: [],
      recipients: [],
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
        setSubmitStatus('✅ Toolbox talk submitted successfully!');
        setTimeout(() => {
          setSubmitStatus('');
          setCurrentView('dashboard');
        }, 2000);
      } else {
        setSubmitStatus('📱 Toolbox talk saved offline - will sync when online');
        setTimeout(() => {
          setSubmitStatus('');
          setCurrentView('dashboard');
        }, 3000);
      }
    } catch (error) {
      setSubmitStatus('📱 Toolbox talk saved offline - will sync when online');
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

  const showOutbox = () => {
    setCurrentView('outbox');
    setCurrentTalk(null);
  };

  // Show landing page if not authenticated
  if (!isAuthenticated) {
    return <LandingPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title={
          currentView === 'dashboard' ? 'Field Talk' : 
          currentView === 'edit' ? 'Tool Box Talk Record' : 
          'Outbox'
        }
        showQueue={currentView === 'dashboard'}
        showTimer={currentView === 'edit'}
        user={user}
        onLogout={handleLogout}
        onShowOutbox={showOutbox}
        talks={talks}
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
      
      {currentView === 'outbox' && (
        <Outbox
          talks={talks}
          onBack={goToDashboard}
          onDeleteTalk={deleteTalk}
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
            currentUser={user}
            onRemoveRecentName={removeRecentName}
          />
        </div>
      )}
    </div>
  );
}

export default App;