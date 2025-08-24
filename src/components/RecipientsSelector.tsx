import React from 'react';
import { Mail, Users, Plus, Trash2, Star, StarOff, Search, Edit } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = React.useState('');
  const [newRecipient, setNewRecipient] = React.useState({
    name: '',
    email: '',
    company: '',
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

  // Filter recipients based on search term (by name or email domain/company)
  const filteredRecipients = recipients.filter(recipient => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = recipient.name.toLowerCase().includes(searchLower);
    const emailMatch = recipient.email.toLowerCase().includes(searchLower);
    // Extract company from email domain (e.g., "company" from "user@company.com")
    const emailDomain = recipient.email.split('@')[1]?.split('.')[0] || '';
    const companyMatch = emailDomain.toLowerCase().includes(searchLower);
    
    return nameMatch || emailMatch || companyMatch;
  });

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
      setNewRecipient({ name: '', email: '', company: '', isDefault: false });
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

  // Check if search term would create a new recipient
  const canAddNewRecipient = searchTerm.trim() && 
    !filteredRecipients.some(recipient => 
      recipient.name.toLowerCase() === searchTerm.toLowerCase() ||
      recipient.email.toLowerCase() === searchTerm.toLowerCase()
    );

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

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search recipients by name or company..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-lg"
          />
        </div>
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
          
          <div>
            <input
              type="text"
              value={newRecipient.company}
              onChange={(e) => setNewRecipient({...newRecipient, company: e.target.value})}
              placeholder="Company name (optional)"
              className="w-full p-3 border border-gray-300 rounded-lg"
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

      {/* Recipients Database */}
      <div>
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Instructions:</strong> Check recipients to include in email distribution
          </p>
        </div>
        
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">
            Recipients ({filteredRecipients.length + (canAddNewRecipient ? 1 : 0)}):
          </p>
          {filteredRecipients.length > 0 && filteredRecipients.length < 5 && (
            <button
              onClick={() => {
                // Select all filtered recipients
                const updatedRecipients = recipients.map(recipient => {
                  if (filteredRecipients.some(fr => fr.id === recipient.id)) {
                    return { ...recipient, selected: true };
                  }
                  return recipient;
                });
                onUpdateRecipients(updatedRecipients);
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
            >
              <Users size={14} />
              Select All Shown
            </button>
          )}
        </div>
        
        {(filteredRecipients.length > 0 || canAddNewRecipient) ? (
          <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
            {/* Add New Recipient Option */}
            {canAddNewRecipient && (
              <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-blue-50">
                <div className="flex items-center gap-2 flex-1">
                  <Plus size={16} className="text-blue-600" />
                  <span className="font-medium text-lg text-blue-700">
                    Add "{searchTerm}"
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const recipient: Recipient = {
                        id: `recipient_${Date.now()}`,
                        name: searchTerm.trim(),
                        email: searchTerm.includes('@') ? searchTerm.trim() : `${searchTerm.trim()}@company.com`,
                        selected: true,
                        isDefault: false
                      };
                      onUpdateRecipients([...recipients, recipient]);
                      setSearchTerm('');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>
              </div>
            )}
            
            {/* Existing Recipients */}
            {filteredRecipients.map((recipient, index) => (
              <div
                key={recipient.id}
                className={`flex items-center justify-between p-4 ${
                  canAddNewRecipient || index < filteredRecipients.length - 1 ? 'border-b border-gray-100' : ''
                } transition-colors ${
                  recipient.selected ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
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
                      <span className="font-medium text-lg">{recipient.name}</span>
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
                    onClick={() => {
                      setNewRecipient({
                        name: recipient.name,
                        email: recipient.email,
                        company: recipient.email.split('@')[1]?.split('.')[0] || '',
                        isDefault: recipient.isDefault
                      });
                      setShowAddForm(true);
                      // Remove the existing recipient so it can be re-added with edits
                      removeRecipient(recipient.id);
                    }}
                    className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                    title="Edit recipient"
                  >
                    <Edit size={18} />
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
        ) : (
          <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
            {searchTerm ? (
              <>
                <Search className="mx-auto mb-2 text-gray-300" size={32} />
                <p>No recipients found matching "{searchTerm}"</p>
              </>
            ) : (
              <>
                <Users className="mx-auto mb-2 text-gray-300" size={32} />
                <p>No recipients found</p>
                <p className="text-sm">Add recipients using the + button above</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};