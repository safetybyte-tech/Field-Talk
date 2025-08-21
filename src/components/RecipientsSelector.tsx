import React from 'react';
import { Mail, Users, Plus, Trash2, Star, StarOff } from 'lucide-react';
import { Recipient } from '../types';

interface RecipientsSelectorProps {
  recipients: Recipient[];
  onUpdateRecipients: (recipients: Recipient[]) => void;
}

// Default recipients that come pre-loaded
const DEFAULT_RECIPIENTS: Omit<Recipient, 'id' | 'selected'>[] = [
  { name: 'Safety Manager', email: 'safety@company.com', isDefault: true },
  { name: 'Project Manager', email: 'pm@company.com', isDefault: true },
  { name: 'Site Supervisor', email: 'supervisor@company.com', isDefault: false },
  { name: 'HR Department', email: 'hr@company.com', isDefault: false },
  { name: 'Quality Control', email: 'qc@company.com', isDefault: false },
];

export const RecipientsSelector: React.FC<RecipientsSelectorProps> = ({
  recipients,
  onUpdateRecipients
}) => {
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newRecipient, setNewRecipient] = React.useState({
    name: '',
    email: '',
    isDefault: false
  });

  // Initialize with default recipients if empty
  React.useEffect(() => {
    if (recipients.length === 0) {
      const initialRecipients: Recipient[] = DEFAULT_RECIPIENTS.map((recipient, index) => ({
        ...recipient,
        id: `recipient_${Date.now()}_${index}`,
        selected: recipient.isDefault || false
      }));
      onUpdateRecipients(initialRecipients);
    }
  }, [recipients.length, onUpdateRecipients]);

  const toggleRecipient = (id: string) => {
    onUpdateRecipients(
      recipients.map(recipient =>
        recipient.id === id
          ? { ...recipient, selected: !recipient.selected }
          : recipient
      )
    );
  };

  const toggleDefault = (id: string) => {
    onUpdateRecipients(
      recipients.map(recipient =>
        recipient.id === id
          ? { ...recipient, isDefault: !recipient.isDefault }
          : recipient
      )
    );
  };

  const addRecipient = () => {
    if (newRecipient.name.trim() && newRecipient.email.trim()) {
      const recipient: Recipient = {
        id: `recipient_${Date.now()}`,
        name: newRecipient.name.trim(),
        email: newRecipient.email.trim(),
        selected: true,
        isDefault: newRecipient.isDefault
      };
      
      onUpdateRecipients([...recipients, recipient]);
      setNewRecipient({ name: '', email: '', isDefault: false });
      setShowAddForm(false);
    }
  };

  const removeRecipient = (id: string) => {
    onUpdateRecipients(recipients.filter(r => r.id !== id));
  };

  const selectAll = () => {
    onUpdateRecipients(
      recipients.map(recipient => ({ ...recipient, selected: true }))
    );
  };

  const selectNone = () => {
    onUpdateRecipients(
      recipients.map(recipient => ({ ...recipient, selected: false }))
    );
  };

  const selectDefaults = () => {
    onUpdateRecipients(
      recipients.map(recipient => ({
        ...recipient,
        selected: recipient.isDefault || false
      }))
    );
  };

  const selectedCount = recipients.filter(r => r.selected).length;
  const defaultCount = recipients.filter(r => r.isDefault).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="text-blue-600" size={20} />
            Email Recipients
          </h3>
          <p className="text-sm text-gray-600">
            Selected: {selectedCount} / {recipients.length}
            {defaultCount > 0 && ` • ${defaultCount} auto-select`}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={selectDefaults}
          className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm hover:bg-green-200 transition-colors"
        >
          Select Defaults
        </button>
        <button
          onClick={selectAll}
          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
        >
          Select All
        </button>
        <button
          onClick={selectNone}
          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
        >
          Select None
        </button>
      </div>

      {/* Add New Recipient Form */}
      {showAddForm && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              value={newRecipient.name}
              onChange={(e) => setNewRecipient({...newRecipient, name: e.target.value})}
              placeholder="Recipient name"
              className="p-3 border border-gray-300 rounded-lg"
            />
            <input
              type="email"
              value={newRecipient.email}
              onChange={(e) => setNewRecipient({...newRecipient, email: e.target.value})}
              placeholder="email@company.com"
              className="p-3 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={newRecipient.isDefault}
              onChange={(e) => setNewRecipient({...newRecipient, isDefault: e.target.checked})}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="isDefault" className="text-sm text-gray-700">
              Auto-select for new talks
            </label>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={addRecipient}
              disabled={!newRecipient.name.trim() || !newRecipient.email.trim()}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Add Recipient
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Recipients List */}
      {recipients.length > 0 && (
        <div className="space-y-2">
          {recipients.map((recipient) => (
            <div
              key={recipient.id}
              className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                recipient.selected
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={recipient.selected}
                  onChange={() => toggleRecipient(recipient.id)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{recipient.name}</span>
                    {recipient.isDefault && (
                      <Star size={16} className="text-yellow-500 fill-current" />
                    )}
                  </div>
                  <div className="text-sm text-gray-600 flex items-center gap-1">
                    <Mail size={14} />
                    {recipient.email}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleDefault(recipient.id)}
                  className={`p-2 rounded-full transition-colors ${
                    recipient.isDefault
                      ? 'text-yellow-600 hover:text-yellow-700'
                      : 'text-gray-400 hover:text-yellow-600'
                  }`}
                  title={recipient.isDefault ? 'Remove from auto-select' : 'Add to auto-select'}
                >
                  {recipient.isDefault ? <Star size={18} className="fill-current" /> : <StarOff size={18} />}
                </button>
                
                <button
                  onClick={() => removeRecipient(recipient.id)}
                  className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {recipients.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Users className="mx-auto mb-4 text-gray-300" size={48} />
          <p className="text-lg">No recipients added</p>
          <p className="text-sm">Add email recipients using the + button above</p>
        </div>
      )}
    </div>
  );
};