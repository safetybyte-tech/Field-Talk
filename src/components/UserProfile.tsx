import React from 'react';
import { ArrowLeft, User, Mail, Save, Eye, EyeOff } from 'lucide-react';
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
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
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
      // Validate email format
      if (!auth.isValidEmail(editedUser.email)) {
        setError('Please enter a valid email address');
        return;
      }

      // Check if username is available (if changed)
      if (editedUser.username !== user.username && !auth.isUsernameAvailable(editedUser.username)) {
        setError('Username is already taken');
        return;
      }

      // If password is being changed, validate it
      if (newPassword || currentPassword) {
        if (!currentPassword) {
          setError('Current password is required to change password');
          return;
        }

        if (newPassword.length < 6) {
          setError('New password must be at least 6 characters');
          return;
        }

        if (newPassword !== confirmPassword) {
          setError('New passwords do not match');
          return;
        }

        // Verify current password
        const storedPassword = localStorage.getItem(`pwd_${user.id}`);
        if (storedPassword !== btoa(currentPassword)) {
          setError('Current password is incorrect');
          return;
        }

        // Update password
        localStorage.setItem(`pwd_${user.id}`, btoa(newPassword));
      }

      // Update user data
      const updatedUser = { ...editedUser };
      auth.saveUserToList(updatedUser);
      auth.saveUser(updatedUser);
      onUpdateUser(updatedUser);

      setSuccess('Profile updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Show success message briefly then redirect to dashboard
      setTimeout(() => {
        setSuccess('');
        onBack(); // Navigate back to dashboard
      }, 1500);

    } catch (err) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = 
    editedUser.name !== user.name ||
    editedUser.username !== user.username ||
    editedUser.email !== user.email ||
    editedUser.trade !== user.trade;

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
                  onChange={(e) => setEditedUser({...editedUser, email: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>
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
            </div>
          </div>
        </div>

        {/* Password Change */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">Change Password</h2>
          
          <button
            onClick={() => {
              // This would trigger a password change workflow
              // For now, we'll just show an alert
              alert('Password change functionality would be implemented here');
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Lock size={20} />
            Change Password
          </button>
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