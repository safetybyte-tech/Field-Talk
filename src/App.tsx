import React from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { TalkEditor } from './components/TalkEditor';
import { LandingPage } from './components/LandingPage';
import { ToolboxTalk, User } from './types';
import { storage } from './utils/storage';
import { api } from './utils/api';
import { auth } from './utils/auth';

type ViewType = 'dashboard' | 'edit';

function App() {
  const [user, setUser] = React.useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [currentView, setCurrentView] = React.useState<ViewType>('dashboard');
  const [talks, setTalks] = React.useState<ToolboxTalk[]>([]);
  const [currentTalk, setCurrentTalk] = React.useState<ToolboxTalk | null>(null);
  const [recentNames, setRecentNames] = React.useState<string[]>([]);
  const [submitStatus, setSubmitStatus] = React.useState<string>('');

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
    const today = new Date().toISOString().split('T')[0];
    
    const newTalk: ToolboxTalk = {
      id: `talk_${Date.now()}`,
      title: '',
      content: '',
      date: today,
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

  // Show landing page if not authenticated
  if (!isAuthenticated) {
    return <LandingPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title={currentView === 'dashboard' ? 'Field Talk' : 'Edit Talk'}
        showQueue={currentView === 'dashboard'}
        user={user}
        onLogout={handleLogout}
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
            currentUser={user}
          />
        </div>
      )}
    </div>
  );
}

export default App;