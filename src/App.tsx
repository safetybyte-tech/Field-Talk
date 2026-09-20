import React from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { TalkEditor, type TalkEditorHandle } from './components/TalkEditor';
import { Outbox } from './components/Outbox';
import { LandingPage } from './components/LandingPage';
import { UserProfile } from './components/UserProfile';
import { ToolboxTalk, User } from './types';
import { storage } from './utils/storage';
import { api } from './utils/api';
import { auth } from './utils/auth';
import { logger } from './utils/logger';
import { Loader2 } from 'lucide-react';

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
  const editorRef = React.useRef<TalkEditorHandle>(null);
  const [dataError, setDataError] = React.useState('');
  const [actionError, setActionError] = React.useState('');
  const [dataLoading, setDataLoading] = React.useState(false);
  const account = React.useRef<string | null>(null);
  const sessionVersion = React.useRef(0);
  const loadVersion = React.useRef(0);
  const openVersion = React.useRef(0);
  const applyUser = React.useCallback((next: User | null) => {
    if (account.current !== (next?.id || null)) {
      sessionVersion.current++;
      loadVersion.current++;
      openVersion.current++;
      account.current = next?.id || null;
      setTalks([]); setRecentNames([]); setCurrentTalk(null);
      setCurrentView('dashboard'); setSubmitStatus(''); setDataError(''); setActionError('');
    }
    setUser(next);
    setIsAuthenticated(!!next);
  }, []);

  const loadData = React.useCallback(async (userId: string) => {
    const requestVersion = ++loadVersion.current;
    const session = sessionVersion.current;
    const current = () => account.current === userId && sessionVersion.current === session && requestVersion === loadVersion.current;
    setDataLoading(true);
    try {
      const [fetchedTalks, fetchedNames] = await Promise.all([
        storage.getTalks(userId),
        storage.getRecentAttendees(userId),
      ]);
      if (!current()) return;
      setDataError('');
      setTalks(fetchedTalks);
      setRecentNames(fetchedNames);
    } catch (err) {
      if (!current()) return;
      console.error('Failed to load data:', err);
      setDataError('Your records could not be loaded. Please retry.');
    } finally { if (current()) setDataLoading(false); }
  }, []);

  const removeRecentName = async (name: string) => {
    if (!user) return;
    const session = sessionVersion.current;
    setActionError('');
    try {
      await storage.removeRecentAttendee(name, user.id);
      if (session === sessionVersion.current) setRecentNames(current => current.filter(item => item !== name));
    } catch {
      if (session === sessionVersion.current) setActionError('This crew member could not be removed. Please retry.');
    }
  };

  const deleteTalk = async (id: string) => {
    if (!user) return;
    const session = sessionVersion.current;
    setActionError('');
    try {
      await storage.deleteTalk(id);
      if (session === sessionVersion.current) setTalks(current => current.filter(talk => talk.id !== id));
    } catch {
      if (session === sessionVersion.current) setActionError('This record could not be deleted. If delivery is pending, reopen it to check delivery first. Otherwise, please retry.');
    }
  };

  React.useEffect(() => {
    let active = true;
    let authEventReceived = false;
    const unsubscribe = auth.onAuthStateChange((changedUser, event) => {
      if (!active) return;
      authEventReceived = true;
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      if (event === 'SIGNED_OUT') setIsPasswordRecovery(false);
      applyUser(changedUser);
      setAuthLoading(false);
    });
    auth.getCurrentUser().then(currentUser => {
      if (active && !authEventReceived) applyUser(currentUser);
    }).catch(() => {
      if (active && !authEventReceived) applyUser(null);
    }).finally(() => { if (active) setAuthLoading(false); });
    return () => { active = false; unsubscribe(); };
  }, [applyUser]);

  // Load data when authenticated
  React.useEffect(() => {
    if (isAuthenticated && user) {
      loadData(user.id);
    }
  }, [isAuthenticated, user, loadData]);

  const handleLogin = (loggedInUser: User) => {
    applyUser(loggedInUser);
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
    const session = sessionVersion.current;
    try {
      await auth.logout();
      if (session === sessionVersion.current) applyUser(null);
    } catch {
      if (session === sessionVersion.current) setActionError('Sign out could not finish. Please retry.');
    }
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
    const session = sessionVersion.current;
    const request = ++openVersion.current;
    setActionError('');
    try {
      const talk = await storage.getTalk(talkId);
      if (session !== sessionVersion.current || request !== openVersion.current) return;
      if (!talk) { setActionError('This record is no longer available. Reload your records.'); return; }
      setCurrentTalk(talk);
      setCurrentView('edit');
    } catch {
      if (session === sessionVersion.current && request === openVersion.current) setActionError('This record could not be opened. Please retry.');
    }
  };

  const rememberAttendees = async (talk: ToolboxTalk, userId: string) => {
    const session = sessionVersion.current;
    try {
      await storage.saveRecentAttendees(talk.attendees, userId);
      const names = await storage.getRecentAttendees(userId);
      if (session === sessionVersion.current) setRecentNames(names);
    } catch (error) {
      // A convenience-list failure must not turn a confirmed save/send into a retry.
      console.warn('Could not update recent crew:', error);
    }
  };

  const saveTalk = async (talk: ToolboxTalk): Promise<ToolboxTalk> => {
    if (!user) throw new Error('Please sign in again before saving.');
    const session = sessionVersion.current;
    const saved = await storage.saveTalk(talk, user.id);
    if (session !== sessionVersion.current) throw new Error('Your session changed. Reopen the record after signing in.');
    setTalks(current => [saved, ...current.filter(item => item.id !== talk.id && item.id !== saved.id)]);
    void rememberAttendees(talk, user.id);
    return saved;
  };

  const submitTalk = async (talk: ToolboxTalk) => {
    if (!user) throw new Error('Please sign in again before sending.');
    const session = sessionVersion.current;
    setSubmitStatus('Submitting...');

    logger.logEvent(user.id, talk.id, 'send_tapped', { ts: Date.now() });
    logger.startTimer(`submit_${talk.id}`);

    try {
      const saved = await api.submitTalk(talk);
      if (session !== sessionVersion.current) throw new Error('Your session changed. Reopen the record after signing in.');
      void rememberAttendees(talk, user.id);
      const latencyMs = logger.getElapsedTime(`submit_${talk.id}`);
      logger.logEvent(user.id, saved.id, 'send_success', { latency_ms: latencyMs });

      setSubmitStatus('Toolbox talk submitted successfully!');
      setTalks(current => [saved, ...current.filter(item => item.id !== talk.id && item.id !== saved.id)]);
      setTimeout(() => {
        if (session === sessionVersion.current) setSubmitStatus('');
      }, 2000);
      return saved;
    } catch (error) {
      if (session !== sessionVersion.current) throw error;
      const latencyMs = logger.getElapsedTime(`submit_${talk.id}`);
      logger.logEvent(user.id, talk.id, 'send_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        latency_ms: latencyMs,
      });
      setSubmitStatus(error instanceof Error ? `Failed to submit: ${error.message}` : 'Failed to submit. Please try again.');
      setTimeout(() => { if (session === sessionVersion.current) setSubmitStatus(''); }, 3000);
      throw error;
    }
  };

  const goToDashboard = () => {
    openVersion.current++;
    if (user) void loadData(user.id);
    setCurrentView('dashboard');
    setCurrentTalk(null);
  };

  const navigate = async (view: ViewType) => {
    const session = sessionVersion.current;
    openVersion.current++;
    if (currentView === 'edit' && !(await editorRef.current?.saveBeforeLeave())) return;
    if (session !== sessionVersion.current) return;
    setActionError('');
    if (user) void loadData(user.id);
    setCurrentView(view);
    setCurrentTalk(null);
  };
  const showOutbox = () => { void navigate('outbox'); };
  const showProfile = () => { void navigate('profile'); };

  const updateUser = (updatedUser: User) => {
    if (account.current === updatedUser.id) setUser(updatedUser);
  };

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
    <div className="min-h-screen bg-ground">
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
        onTitleClick={() => { void navigate('dashboard'); }}
      />

      {submitStatus && (
        <div className="bg-primary-100 border-l-4 border-primary-500 text-primary-700 p-4 text-center">
          {submitStatus}
        </div>
      )}

      {actionError && <div role="alert" className="mx-auto max-w-[760px] p-5 text-stop-text">{actionError}</div>}
      {dataLoading && <p role="status" className="mx-auto max-w-[760px] p-5">Loading records…</p>}
      {dataError && <div role="alert" className="mx-auto max-w-[760px] p-5 text-stop-text">
        {dataError} <button className="min-h-11 underline" onClick={() => user && void loadData(user.id)}>Retry loading records</button>
      </div>}
      {currentView === 'dashboard' && !dataError && !dataLoading && (
        <Dashboard
          talks={talks}
          onShowRecords={showOutbox}
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
          onLogout={handleLogout}
        />
      )}

      {currentView === 'edit' && currentTalk && (
        <TalkEditor
          key={`${user?.id}:${currentTalk.id}`}
          ref={editorRef}
          onDone={goToDashboard}
          talk={currentTalk}
          onSave={saveTalk}
          onSubmit={submitTalk}
          recentNames={recentNames}
          currentUser={user}
          onRemoveRecentName={removeRecentName}
          availableDrafts={talks.filter(t => !t.submittedAt && t.id !== currentTalk.id)}
        />
      )}
    </div>
  );
}

export default App;
