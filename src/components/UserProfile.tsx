import React from 'react';
import { ArrowLeft, Mail, Save, Key, LogOut } from 'lucide-react';
import { User as UserType } from '../types';
import { auth } from '../utils/auth';

interface UserProfileProps {
  user: UserType;
  onBack: () => void;
  onUpdateUser: (user: UserType) => void;
  onLogout: () => void | Promise<void>;
}

const fieldClass = 'mt-2 min-h-[52px] w-full border border-rule bg-sheet px-3 text-[16px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none';

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  onBack,
  onUpdateUser,
  onLogout
}) => {
  const [editedUser, setEditedUser] = React.useState<UserType>(user);
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPasswordForm, setShowPasswordForm] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const active = React.useRef(true);
  const returnTimer = React.useRef<ReturnType<typeof setTimeout>>();
  React.useEffect(() => {
    active.current = true;
    return () => { active.current = false; clearTimeout(returnTimer.current); };
  }, []);

  // Common construction trades
  const trades = [
    'General Contractor',
    'Carpenter',
    'Electrician',
    'Plumber',
    'HVAC Technician',
    'Roofer',
    'Mason/Bricklayer',
    'Concrete Worker',
    'Painter',
    'Flooring Installer',
    'Drywall Installer',
    'Insulation Worker',
    'Glazier',
    'Heavy Equipment Operator',
    'Crane Operator',
    'Welder',
    'Ironworker',
    'Sheet Metal Worker',
    'Tile Setter',
    'Landscaper',
    'Site Supervisor',
    'Safety Manager',
    'Project Manager',
    'Foreman',
    'Laborer',
    'Other'
  ];

  const handleSaveProfile = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!auth.isValidEmail(editedUser.email)) {
        setError('Please enter a valid email address');
        return;
      }

      const updatedUser = await auth.updateProfile({
        name: editedUser.name,
        username: editedUser.username,
        trade: editedUser.trade,
        customTrade: editedUser.customTrade,
      });

      if (!active.current) return;
      onUpdateUser(updatedUser);
      setSuccess('Profile updated successfully!');

      returnTimer.current = setTimeout(() => {
        setSuccess('');
        onBack();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await auth.changePassword(newPassword);
      setSuccess('Password changed successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges =
    editedUser.name !== user.name ||
    editedUser.username !== user.username ||
    editedUser.trade !== user.trade ||
    editedUser.customTrade !== user.customTrade;

  return (
    <main className="mx-auto max-w-[640px] px-5 pb-32 pt-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Back to dashboard"
          className="grid h-11 w-11 shrink-0 place-items-center border border-rule bg-sheet text-ink hover:border-accent"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-[24px] font-bold tracking-[-.02em] text-ink">User Profile</h1>
          <p className="text-sm text-ink-muted">Manage your account settings</p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {error && (
          <div role="alert" className="border border-stop bg-stop-tint px-4 py-3 text-sm text-stop-text">
            {error}
          </div>
        )}

        {success && (
          <div role="status" className="border border-ok bg-ok-tint px-4 py-3 text-sm text-ok-text">
            {success}
          </div>
        )}

        <div className="border border-rule bg-sheet p-4">
          <h2 className="snd-label text-ink-muted">Profile information</h2>

          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-semibold text-ink">Full name</label>
              <input
                type="text"
                value={editedUser.name}
                onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                className={fieldClass}
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-ink">Username</label>
              <input
                type="text"
                value={editedUser.username}
                onChange={(e) => setEditedUser({ ...editedUser, username: e.target.value })}
                className={fieldClass}
                placeholder="Your username"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-ink">Email address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" size={18} />
                <input
                  type="email"
                  value={editedUser.email}
                  disabled
                  className={`${fieldClass} cursor-not-allowed bg-ground pl-11 text-ink-muted`}
                  placeholder="your@email.com"
                />
              </div>
              <p className="snd-mono mt-2 text-xs text-ink-faint">Email cannot be changed</p>
            </div>

            <div>
              <label className="text-sm font-semibold text-ink">Trade/role</label>
              <select
                value={editedUser.trade || ''}
                onChange={(e) => setEditedUser({ ...editedUser, trade: e.target.value })}
                className={fieldClass}
              >
                <option value="">Select your trade or role</option>
                {trades.map((trade) => (
                  <option key={trade} value={trade}>
                    {trade}
                  </option>
                ))}
              </select>

              {editedUser.trade === 'Other' && (
                <div className="mt-3">
                  <label className="text-sm font-semibold text-ink">Please specify your trade/role</label>
                  <input
                    type="text"
                    value={editedUser.customTrade || ''}
                    onChange={(e) => setEditedUser({ ...editedUser, customTrade: e.target.value })}
                    className={fieldClass}
                    placeholder="Enter your specific trade or role"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border border-rule bg-sheet p-4">
          <h2 className="snd-label text-ink-muted">Change password</h2>

          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="mt-4 flex min-h-12 items-center gap-2 border border-ink px-5 text-sm font-semibold text-ink hover:border-accent"
            >
              <Key size={18} />
              Change password
            </button>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-semibold text-ink">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={fieldClass}
                  placeholder="New password (min 6 characters)"
                  minLength={6}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-ink">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={fieldClass}
                  placeholder="Confirm new password"
                  minLength={6}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleChangePassword}
                  disabled={loading}
                  className="min-h-12 bg-accent px-5 font-bold text-white hover:bg-accent-hover disabled:bg-[#F0EBE3] disabled:text-ink-faint"
                >
                  {loading ? 'Saving...' : 'Update password'}
                </button>
                <button
                  onClick={() => {
                    setShowPasswordForm(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="min-h-12 border border-ink px-5 text-sm font-semibold text-ink hover:border-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border border-rule bg-sheet p-4">
          <h2 className="snd-label text-ink-muted">Account information</h2>
          <div className="mt-4 space-y-2 border border-rule bg-ground p-3">
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-ink-muted">Account created</span>
              <span className="font-medium text-ink">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-ink-muted">User ID</span>
              <span className="snd-mono min-w-0 break-all text-right text-xs text-ink">{user.id}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSaveProfile}
            disabled={loading || !hasChanges}
            className="flex min-h-14 flex-1 items-center justify-center gap-2 bg-accent px-5 font-bold text-white hover:bg-accent-hover disabled:bg-[#F0EBE3] disabled:text-ink-faint"
          >
            <Save size={20} />
            {loading ? 'Saving...' : 'Save changes'}
          </button>

          <button
            onClick={onBack}
            className="min-h-14 border border-ink px-5 text-sm font-semibold text-ink hover:border-accent"
          >
            Cancel
          </button>
        </div>

        <button
          onClick={() => void onLogout()}
          className="flex min-h-14 w-full items-center justify-center gap-2 border border-stop bg-stop-tint px-4 font-semibold text-stop-text hover:bg-[#FBDBD8]"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </main>
  );
};
