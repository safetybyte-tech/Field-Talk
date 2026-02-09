import React from 'react';
import { ArrowLeft, User, Mail, Save, Key } from 'lucide-react';
import { User as UserType } from '../types';
import { auth } from '../utils/auth';

interface UserProfileProps {
  user: UserType;
  onBack: () => void;
  onUpdateUser: (user: UserType) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  onBack,
  onUpdateUser
}) => {
  const [editedUser, setEditedUser] = React.useState<UserType>(user);
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPasswordForm, setShowPasswordForm] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [loading, setLoading] = React.useState(false);

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

      onUpdateUser(updatedUser);
      setSuccess('Profile updated successfully!');

      setTimeout(() => {
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
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">User Profile</h1>
          <p className="text-gray-600">Manage your account settings</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Profile Information */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="text-primary-600" size={20} />
            Profile Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={editedUser.name}
                onChange={(e) => setEditedUser({...editedUser, name: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={editedUser.username}
                onChange={(e) => setEditedUser({...editedUser, username: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Your username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  value={editedUser.email}
                  disabled
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  placeholder="your@email.com"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trade/Role
              </label>
              <select
                value={editedUser.trade || ''}
                onChange={(e) => setEditedUser({...editedUser, trade: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Please specify your trade/role
                  </label>
                  <input
                    type="text"
                    value={editedUser.customTrade || ''}
                    onChange={(e) => setEditedUser({...editedUser, customTrade: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter your specific trade or role"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Password Change */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">Change Password</h2>

          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Key size={20} />
              Change Password
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="New password (min 6 characters)"
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Confirm new password"
                  minLength={6}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleChangePassword}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  {loading ? 'Saving...' : 'Update Password'}
                </button>
                <button
                  onClick={() => {
                    setShowPasswordForm(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Account Info */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">Account Information</h2>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Account Created:</span>
              <span className="font-medium">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">User ID:</span>
              <span className="font-mono text-xs">{user.id}</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSaveProfile}
            disabled={loading || !hasChanges}
            className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Save size={20} />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>

          <button
            onClick={onBack}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
