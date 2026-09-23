import React from 'react';
import { Mail, Lock, UserPlus, User } from 'lucide-react';
import { auth } from '../utils/auth';
import { User as UserType } from '../types';

interface LandingPageProps {
  onLogin: (user: UserType) => void;
  isRecoveryMode?: boolean;
  onPasswordResetComplete?: () => void;
}

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

function formatAuthError(error: unknown): string {
  if (error instanceof Error && error.message === 'Failed to fetch') {
    return "We couldn't reach the account service. Check your connection and try again. If it keeps happening, contact your site administrator.";
  }

  return error instanceof Error ? error.message : 'An error occurred. Please try again.';
}

const fieldClass = 'mt-2 min-h-[52px] w-full border border-rule bg-sheet pl-11 pr-3 text-[16px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none';

export const LandingPage: React.FC<LandingPageProps> = ({
  onLogin,
  isRecoveryMode = false,
  onPasswordResetComplete
}) => {
  const [mode, setMode] = React.useState<AuthMode>(isRecoveryMode ? 'reset' : 'login');
  const [formData, setFormData] = React.useState({
    email: '',
    username: '',
    name: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (isRecoveryMode) {
      setMode('reset');
      setError('');
      setSuccess('');
      setFormData((current) => ({
        ...current,
        password: '',
        confirmPassword: ''
      }));
      return;
    }

    // If recovery mode has been cleared (or stale URL params were removed),
    // return to the normal login experience.
    setMode((current) => (current === 'reset' ? 'login' : current));
  }, [isRecoveryMode]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (params.has('error') || params.has('error_code')) {
      setError('This sign-in or reset link has expired or is invalid. Request a new link and try again.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const user = await auth.login(formData.email.trim(), formData.password);
        onLogin(user);
      } else if (mode === 'signup') {
        if (!formData.username.trim()) {
          throw new Error('Username is required');
        }
        if (!formData.name.trim()) {
          throw new Error('Full name is required');
        }
        if (formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }

        const user = await auth.register(
          formData.email.trim(),
          formData.username,
          formData.name,
          formData.password
        );
        if (user) onLogin(user);
        else {
          setSuccess('Check your inbox to confirm your email, then sign in.');
          setFormData(current => ({ ...current, password: '', confirmPassword: '' }));
          setMode('login');
        }
      } else if (mode === 'forgot') {
        if (!auth.isValidEmail(formData.email.trim())) {
          throw new Error('Please enter a valid email address');
        }
        await auth.requestPasswordReset(formData.email.trim());
        setSuccess('Password reset email sent. Check your inbox for the reset link.');
        setMode('login');
      } else {
        if (formData.password.length < 6) {
          throw new Error('New password must be at least 6 characters');
        }
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        await auth.changePassword(formData.password);
        const currentUser = await auth.getCurrentUser();
        setSuccess('Password updated successfully.');
        onPasswordResetComplete?.();
        if (currentUser) {
          onLogin(currentUser);
        } else {
          setMode('login');
        }
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError('');
    setSuccess('');
    setFormData({
      email: '',
      username: '',
      name: '',
      password: '',
      confirmPassword: ''
    });
  };

  const showForgotPassword = () => {
    setMode('forgot');
    setError('');
    setSuccess('');
    setFormData((current) => ({
      ...current,
      password: '',
      confirmPassword: ''
    }));
  };

  const backToLogin = () => {
    setMode('login');
    setError('');
    setSuccess('');
    setFormData({
      email: formData.email,
      username: '',
      name: '',
      password: '',
      confirmPassword: ''
    });
  };

  const backFromReset = () => {
    onPasswordResetComplete?.();
    backToLogin();
  };

  const isLogin = mode === 'login';
  const isSignup = mode === 'signup';
  const isForgot = mode === 'forgot';
  const isReset = mode === 'reset';

  const headingText = isLogin
    ? 'Welcome back'
    : isSignup
      ? 'Create your account'
      : isForgot
        ? 'Reset your password'
        : 'Set a new password';

  const subheadingText = isLogin
    ? 'Sign in to your toolbox talks'
    : isSignup
      ? 'Get started with your safety documentation'
      : isForgot
        ? "Enter your email and we'll send a reset link"
        : 'Enter a new password for your account';

  return (
    <div className="min-h-screen bg-ground px-5 py-10">
      <div className="mx-auto w-full max-w-[420px]">
        <div className="text-center">
          <span className="block text-[24px] font-bold tracking-[-.025em] text-ink">Field Talk</span>
          <span className="snd-label mt-1 block text-accent">Safety Net Dispatch</span>
          <p className="mt-4 text-[15px] text-ink-body">Mobile toolbox talk generator for construction sites</p>
        </div>

        <div className="mt-8 border border-rule bg-sheet p-6">
          <h1 className="text-[22px] font-bold tracking-[-.02em] text-ink">{headingText}</h1>
          <p className="mt-1 text-[15px] text-ink-muted">{subheadingText}</p>

          {error && (
            <div role="alert" className="mt-5 border border-stop bg-stop-tint px-4 py-3 text-sm text-stop-text">
              {error}
            </div>
          )}

          {success && (
            <div role="status" className="mt-5 border border-ok bg-ok-tint px-4 py-3 text-sm text-ok-text">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {!isReset && (
              <div>
                <label className="snd-label text-ink-muted">Email address</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" size={18} />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={fieldClass}
                    placeholder="your@email.com"
                  />
                </div>
              </div>
            )}

            {isSignup && (
              <div>
                <label className="snd-label text-ink-muted">Username</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" size={18} />
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className={fieldClass}
                    placeholder="username"
                  />
                </div>
              </div>
            )}

            {isSignup && (
              <div>
                <label className="snd-label text-ink-muted">Full name</label>
                <div className="relative">
                  <UserPlus className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" size={18} />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={fieldClass}
                    placeholder="John Smith"
                  />
                </div>
              </div>
            )}

            {!isForgot && (
              <div>
                <label className="snd-label text-ink-muted">{isReset ? 'New password' : 'Password'}</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" size={18} />
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={fieldClass}
                    placeholder="********"
                    minLength={isSignup || isReset ? 6 : 1}
                  />
                </div>
                {(isSignup || isReset) && (
                  <p className="snd-mono mt-2 text-xs text-ink-faint">Minimum 6 characters</p>
                )}
              </div>
            )}

            {isReset && (
              <div>
                <label className="snd-label text-ink-muted">Confirm new password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" size={18} />
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={fieldClass}
                    placeholder="********"
                    minLength={6}
                  />
                </div>
              </div>
            )}

            {isForgot && (
              <p className="text-sm text-ink-muted">
                Check your spam folder if you do not see the email. Reset links expire for security.
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="min-h-14 w-full bg-accent px-4 text-lg font-bold text-white transition-colors hover:bg-accent-hover active:bg-accent-press disabled:bg-[#F0EBE3] disabled:text-ink-faint"
            >
              {loading
                ? 'Please wait...'
                : isLogin
                  ? 'Sign in'
                  : isSignup
                    ? 'Create account'
                    : isForgot
                      ? 'Send reset email'
                      : 'Update password'
              }
            </button>
          </form>

          <div className="mt-6 border-t border-rule-soft pt-5 text-center">
            {(isLogin || isSignup) && (
              <button
                type="button"
                onClick={toggleMode}
                className="min-h-11 font-semibold text-accent"
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"
                }
              </button>
            )}
            {isLogin && (
              <div className="mt-1">
                <button
                  type="button"
                  onClick={showForgotPassword}
                  className="min-h-11 text-sm font-semibold text-accent"
                >
                  Forgot your password?
                </button>
              </div>
            )}
            {isForgot && (
              <button
                type="button"
                onClick={backToLogin}
                className="min-h-11 font-semibold text-accent"
              >
                Back to sign in
              </button>
            )}
            {isReset && (
              <button
                type="button"
                onClick={backFromReset}
                className="min-h-11 font-semibold text-accent"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="snd-mono text-xs text-ink-faint">Secure &middot; Fast &middot; Mobile-first</p>
          <p className="mt-2 text-xs text-ink-faint">
            A{' '}
            <a href="https://safetynetdispatch.com" className="text-ink-muted underline-offset-2 hover:text-accent hover:underline">
              Safety Net Dispatch
            </a>
            {' '}tool, built by{' '}
            <a href="https://nickrogoff.com" className="text-ink-muted underline-offset-2 hover:text-accent hover:underline">
              Nick Rogoff
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};
