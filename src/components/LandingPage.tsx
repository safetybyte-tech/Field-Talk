import React from 'react';
import {
  User,
  Shield,
  Mail,
  Lock,
  UserPlus,
  ArrowLeft,
  KeyRound,
  CheckCircle,
} from 'lucide-react';
import { auth } from '../utils/auth';
import { User as UserType } from '../types';

interface LandingPageProps {
  onLogin: (user: UserType) => void;
}

type View = 'login' | 'register' | 'forgot';

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [view, setView] = React.useState<View>('login');
  const [formData, setFormData] = React.useState({
    email: '',
    username: '',
    name: '',
    password: '',
  });
  const [resetData, setResetData] = React.useState({
    email: '',
  });
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [resetSuccess, setResetSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (view === 'login') {
        const user = await auth.login(formData.email, formData.password);
        onLogin(user);
      } else {
        if (!formData.username.trim()) {
          setError('Username is required');
          return;
        }
        if (!formData.name.trim()) {
          setError('Full name is required');
          return;
        }
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters');
          return;
        }

        const user = await auth.register(
          formData.email,
          formData.username,
          formData.name,
          formData.password
        );
        onLogin(user);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await auth.requestPasswordReset(resetData.email);
      setResetSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to send reset email. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    setView('login');
    setError('');
    setResetSuccess(false);
    setResetData({ email: '' });
    setFormData({ email: '', username: '', name: '', password: '' });
  };

  const toggleMode = () => {
    setView(view === 'login' ? 'register' : 'login');
    setError('');
    setFormData({ email: '', username: '', name: '', password: '' });
  };

  // Forgot Password
  if (view === 'forgot') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="bg-primary-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <KeyRound className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-secondary-900 mb-2">
              Field Talk
            </h1>
            <p className="text-secondary-600">Reset your password</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            {resetSuccess ? (
              <div className="text-center">
                <CheckCircle className="mx-auto mb-4 text-green-500" size={48} />
                <h2 className="text-2xl font-bold text-secondary-900 mb-2">
                  Check Your Email
                </h2>
                <p className="text-secondary-600 mb-6">
                  If an account exists for <strong>{resetData.email}</strong>, a
                  password reset link has been sent.
                </p>
                <button
                  onClick={goToLogin}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 px-4 rounded-lg font-medium text-lg transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-center text-secondary-900 mb-2">
                    Forgot Password
                  </h2>
                  <p className="text-center text-secondary-600">
                    Enter your email and we&apos;ll send a reset link.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                    {error}
                  </div>
                )}

                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400"
                        size={20}
                      />
                      <input
                        type="email"
                        required
                        value={resetData.email}
                        onChange={(e) =>
                          setResetData({ ...resetData, email: e.target.value })
                        }
                        className="w-full pl-10 pr-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white py-3 px-4 rounded-lg font-medium text-lg transition-colors"
                  >
                    {loading ? 'Sending...' : 'Send Reset Email'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    onClick={goToLogin}
                    className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium"
                  >
                    <ArrowLeft size={16} />
                    Back to Sign In
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="text-center mt-8 text-sm text-secondary-500">
            <p>Secure • Fast • Mobile-First</p>
          </div>
        </div>
      </div>
    );
  }

  // Login / Register
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
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

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-center text-secondary-900 mb-2">
              {view === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-center text-secondary-600">
              {view === 'login'
                ? 'Sign in to access your toolbox talks'
                : 'Get started with your safety documentation'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400"
                  size={20}
                />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            {view === 'register' && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Username
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400"
                    size={20}
                  />
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="username"
                  />
                </div>
              </div>
            )}

            {view === 'register' && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserPlus
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400"
                    size={20}
                  />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="John Smith"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-secondary-700">
                  Password
                </label>
                {view === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setResetSuccess(false);
                      setResetData({ email: formData.email });
                      setView('forgot');
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400"
                  size={20}
                />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="••••••••"
                  minLength={view === 'login' ? 1 : 6}
                />
              </div>
              {view === 'register' && (
                <p className="text-xs text-secondary-500 mt-1">
                  Minimum 6 characters
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white py-3 px-4 rounded-lg font-medium text-lg transition-colors"
            >
              {loading
                ? 'Please wait...'
                : view === 'login'
                  ? 'Sign In'
                  : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={toggleMode}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              {view === 'login'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        <div className="text-center mt-8 text-sm text-secondary-500">
          <p>Secure • Fast • Mobile-First</p>
        </div>
      </div>
    </div>
  );
};
