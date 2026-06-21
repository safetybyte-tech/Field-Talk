import React from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { TalkEditor } from './components/TalkEditor';
import { Outbox } from './components/Outbox';
import { LandingPage } from './components/LandingPage';
import { UserProfile } from './components/UserProfile';
import { ToolboxTalk, User } from './types';
import { storage } from './utils/storage';
import { api } from './utils/api';
import { auth } from './utils/auth';
import { isSupabaseConfigured } from './utils/supabase';
import { logger } from './utils/logger';
import { Loader2, AlertTriangle } from 'lucide-react';

type ViewType = 'dashboard' | 'edit' | 'outbox' | 'profile';

function isPasswordRecoveryLink(): boolean {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  const hashHasRecoveryToken =
    !!hashParams.get('access_token') ||
    !!hashParams.get('refresh_token') ||
    !!hashParams.get('token_hash');

  if (hashParams.get('type') === 'recovery' && hashHasRecoveryToken) {
    return true;
  }

  const queryParams = new URLSearchParams(window.location.search);
  const queryHasRecoveryToken =
    !!queryParams.get('access_token') ||
    !!queryParams.get('refresh_token') ||
    !!queryParams.get('token_hash');

  return queryParams.get('type') === 'recovery' && queryHasRecoveryToken;
}

function App() {
  const [user, setUser] = React.useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = React.useState(isPasswordRecoveryLink);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [currentView, setCurrentView] = React.useState<ViewType>('dashboard');
  const [talks, setTalks] = React.useState<ToolboxTalk[]>([]);
  const [currentTalk, setCurrentTalk] = React.useState<ToolboxTalk | null>(null);
  const [recentNames, setRecentNames] = React.useState<string[]>([]);
  const [submitStatus, setSubmitStatus] = React.useState<string>('');

  const loadData = React.useCallback(async (userId: string) => {
    try {
      const [fetchedTalks, fetchedNames] = await Promise.all([
        storage.getTalks(userId),
        storage.getRecentAttendees(userId),
      ]);
      setTalks(fetchedTalks);
      setRecentNames(fetchedNames);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }, []);

  const removeRecentName = async (name: string) => {
    if (!user) return;
    await storage.removeRecentAttendee(name, user.id);
    setRecentNames(await storage.getRecentAttendees(user.id));
  };

  const deleteTalk = async (id: string) => {
    if (!user) return;
    await storage.deleteTalk(id);
    setTalks(await storage.getTalks(user.id));
  };

  // Auth state listener
  React.useEffect(() => {
    // Check initial session
    auth.getCurrentUser().then((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
      }
      setAuthLoading(false);
    });

    // Subscribe to future auth changes
    const unsubscribe = auth.onAuthStateChange((changedUser, event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
      if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
      }

      if (changedUser) {
        setUser(changedUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return unsubscribe;
  }, []);

  // Load data when authenticated
  React.useEffect(() => {
    if (isAuthenticated && user) {
      loadData(user.id);
    }
  }, [isAuthenticated, user, loadData]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setIsAuthenticated(true);
    setIsPasswordRecovery(false);
  };

  const handlePasswordResetComplete = () => {
    setIsPasswordRecovery(false);

    const queryParams = new URLSearchParams(window.location.search);
    ['type', 'access_token', 'refresh_token', 'expires_in', 'expires_at', 'token_type', 'token_hash'].forEach((key) => {
      queryParams.delete(key);
    });
    const cleanedSearch = queryParams.toString();
    const nextUrl = `${window.location.pathname}${cleanedSearch ? `?${cleanedSearch}` : ''}`;
    window.history.replaceState({}, document.title, nextUrl);
  };

  const handleLogout = async () => {
    await auth.logout();
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
      .split('T')[0];

    const newTalk: ToolboxTalk = {
      id: `talk_${Date.now()}`,
      title: '',
      content: '',
      date: localDate,
      location: '',
      projectNumber: '',
      weather: '',
      supervisor: user?.name || '',
      supervisorEmail: user?.email || '',
      attendees: [],
      recipients: [],
      createdAt: Date.now()
    };

    if (user) {
      logger.logEvent(user.id, newTalk.id, 'task_selected', { source: 'new_talk_button' });
    }

    setCurrentTalk(newTalk);
    setCurrentView('edit');
  };

  const editTalk = async (talkId: string) => {
    const talk = await storage.getTalk(talkId);
    if (talk) {
      setCurrentTalk(talk);
      setCurrentView('edit');
    }
  };

  const saveTalk = async (talk: ToolboxTalk) => {
    if (!user) return;
    const saved = await storage.saveTalk(talk, user.id);
    await storage.saveRecentAttendees(talk.attendees, user.id);
    // Update current talk with persisted ID if it was new
    if (talk.id !== saved.id) {
      setCurrentTalk(saved);
    }
    setTalks(await storage.getTalks(user.id));
    setRecentNames(await storage.getRecentAttendees(user.id));
    setSubmitStatus('Talk saved');
    setTimeout(() => setSubmitStatus(''), 3000);
  };

  const submitTalk = async (talk: ToolboxTalk) => {
    if (!user) return;
    setSubmitStatus('Submitting...');

    logger.logEvent(user.id, talk.id, 'send_tapped', { ts: Date.now() });
    logger.startTimer(`submit_${talk.id}`);

    try {
      const saved = await api.submitTalk(talk, user.id);
      await storage.saveRecentAttendees(talk.attendees, user.id);
      const latencyMs = logger.getElapsedTime(`submit_${talk.id}`);
      logger.logEvent(user.id, saved.id, 'send_success', { latency_ms: latencyMs });

      setSubmitStatus('Toolbox talk submitted successfully!');
      setTalks(await storage.getTalks(user.id));
      setRecentNames(await storage.getRecentAttendees(user.id));
      setTimeout(() => {
        setSubmitStatus('');
        setCurrentView('dashboard');
      }, 2000);
    } catch (error) {
      const latencyMs = logger.getElapsedTime(`submit_${talk.id}`);
      logger.logEvent(user.id, talk.id, 'send_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        latency_ms: latencyMs,
      });
      setSubmitStatus('Failed to submit. Please try again.');
      setTimeout(() => setSubmitStatus(''), 3000);
    }
  };

  const goToDashboard = () => {
    setCurrentView('dashboard');
    setCurrentTalk(null);
  };

  const saveAndGoToDashboard = () => {
    if (currentTalk) {
      saveTalk(currentTalk);
    }
    goToDashboard();
  };

  const showOutbox = () => {
    setCurrentView('outbox');
    setCurrentTalk(null);
  };

  const showProfile = () => {
    setCurrentView('profile');
    setCurrentTalk(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  // Backend isn't configured for this build (missing VITE_SUPABASE_* vars).
  // These are inlined at build time, so this can only be fixed by setting the
  // vars and redeploying — show a clear message instead of a blank page.
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="text-red-600" size={32} />
          </div>
          <h1 className="text-xl font-bold text-secondary-900 mb-2">
            Configuration error
          </h1>
          <p className="text-secondary-600 text-sm">
            This app can't connect to its backend because the Supabase
            environment variables are missing from this build. Set
            <code className="mx-1 px-1 py-0.5 bg-gray-100 rounded text-xs">VITE_SUPABASE_URL</code>
            and
            <code className="mx-1 px-1 py-0.5 bg-gray-100 rounded text-xs">VITE_SUPABASE_ANON_KEY</code>
            in the deployment settings, then redeploy.
          </p>
        </div>
      </div>
    );
  }

  // Loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-3" />
          <p className="text-secondary-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Show landing page if not authenticated
  if (!isAuthenticated || isPasswordRecovery) {
    return (
      <LandingPage
        onLogin={handleLogin}
        isRecoveryMode={isPasswordRecovery}
        onPasswordResetComplete={handlePasswordResetComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title={
          currentView === 'dashboard' ? 'Field Talk' :
          currentView === 'edit' ? 'Tool Box Talk Record' :
          currentView === 'outbox' ? 'Outbox' :
          'User Profile'
        }
        showQueue={currentView === 'dashboard'}
        showTimer={currentView === 'edit'}
        user={user}
        onLogout={handleLogout}
        onEditProfile={showProfile}
        onShowOutbox={showOutbox}
        talks={talks}
        onTitleClick={currentView === 'edit' ? saveAndGoToDashboard : undefined}
      />

      {submitStatus && (
        <div className="bg-primary-100 border-l-4 border-primary-500 text-primary-700 p-4 text-center">
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
          onEditTalk={editTalk}
        />
      )}

      {currentView === 'profile' && user && (
        <UserProfile
          user={user}
          onBack={goToDashboard}
          onUpdateUser={updateUser}
        />
      )}

      {currentView === 'edit' && currentTalk && (
        <div>
          <div className="p-4">
            <button
              onClick={goToDashboard}
              className="text-primary-600 hover:text-primary-800 font-medium"
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
            availableDrafts={talks.filter(t => !t.submittedAt && t.id !== currentTalk.id)}
          />
        </div>
      )}
    </div>
  );
}

export default App;
