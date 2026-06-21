import React from 'react';
import { Shield, Mail, Lock, UserPlus, User } from 'lucide-react';
import { auth, describeAuthError } from '../utils/auth';
import { User as UserType } from '../types';

interface LandingPageProps {
  onLogin: (user: UserType) => void;
  isRecoveryMode?: boolean;
  onPasswordResetComplete?: () => void;
}

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

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
        onLogin(user);
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
      setError(describeAuthError(err));
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
    ? 'Welcome Back'
    : isSignup
      ? 'Create Account'
      : isForgot
        ? 'Reset Password'
        : 'Set New Password';

  const subheadingText = isLogin
    ? 'Sign in to access your toolbox talks'
    : isSignup
      ? 'Get started with your safety documentation'
      : isForgot
        ? 'Enter your email and we will send a reset link'
        : 'Enter a new password for your account';

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-primary-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-secondary-900 mb-2">
            Field Talk
          </h1>
          <p className="text-secondary-600">
            Mobile toolbox talk generator for construction sites
          </p>
        </div>

        {/* Auth Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-center text-secondary-900 mb-2">
              {headingText}
            </h2>
            <p className="text-center text-secondary-600">
              {subheadingText}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            {!isReset && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" size={20} />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
            )}

            {/* Username (Register only) */}
            {isSignup && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" size={20} />
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="username"
                  />
                </div>
              </div>
            )}

            {/* Full Name (Register only) */}
            {isSignup && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" size={20} />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="John Smith"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            {!isForgot && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  {isReset ? 'New Password' : 'Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" size={20} />
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="••••••••"
                    minLength={isSignup || isReset ? 6 : 1}
                  />
                </div>
                {(isSignup || isReset) && (
                  <p className="text-xs text-secondary-500 mt-1">
                    Minimum 6 characters
                  </p>
                )}
              </div>
            )}

            {isReset && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" size={20} />
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="••••••••"
                    minLength={6}
                  />
                </div>
              </div>
            )}

            {isForgot && (
              <p className="text-xs text-secondary-500">
                Check your spam folder if you do not see the email. Reset links expire for security.
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
             className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white py-3 px-4 rounded-lg font-medium text-lg transition-colors"
            >
              {loading
                ? 'Please wait...'
                : isLogin
                  ? 'Sign In'
                  : isSignup
                    ? 'Create Account'
                    : isForgot
                      ? 'Send Reset Email'
                      : 'Update Password'
              }
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            {(isLogin || isSignup) && (
              <button
                type="button"
                onClick={toggleMode}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"
                }
              </button>
            )}
            {isLogin && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={showForgotPassword}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Forgot your password?
                </button>
              </div>
            )}
            {isForgot && (
              <button
                type="button"
                onClick={backToLogin}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Back to sign in
              </button>
            )}
            {isReset && (
              <button
                type="button"
                onClick={backFromReset}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-secondary-500">
          <p>Secure • Fast • Mobile-First</p>
          <p className="mt-2 text-xs text-secondary-400">
            Built by{' '}
            <a
              href="https://nickrogoff.com"
              className="text-secondary-500 hover:text-secondary-600 underline-offset-2 hover:underline"
            >
              Nick Rogoff
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};
