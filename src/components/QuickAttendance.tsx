import React from 'react';
import { Check, X, Plus, Trash2 } from 'lucide-react';
import { Attendee } from '../types';

interface QuickAttendanceProps {
  attendees: Attendee[];
  onUpdateAttendees: (attendees: Attendee[]) => void;
  recentNames?: string[];
}

export const QuickAttendance: React.FC<QuickAttendanceProps> = ({
  attendees,
  onUpdateAttendees,
  recentNames = []
}) => {
  const [newName, setNewName] = React.useState('');
  const [showAddForm, setShowAddForm] = React.useState(false);

  const addAttendee = (name: string) => {
    if (name.trim() && !attendees.find(a => a.name === name.trim())) {
      const newAttendee: Attendee = {
        id: `attendee_${Date.now()}_${Math.random()}`,
        name: name.trim(),
        present: false
      };
      
      onUpdateAttendees([...attendees, newAttendee]);
      setNewName('');
      setShowAddForm(false);
    }
  };

  const toggleAttendance = (id: string) => {
    onUpdateAttendees(
      attendees.map(attendee =>
        attendee.id === id
          ? { ...attendee, present: !attendee.present }
          : attendee
      )
    );
  };

  const removeAttendee = (id: string) => {
    onUpdateAttendees(attendees.filter(a => a.id !== id));
  };

  const quickAddFromRecent = (name: string) => {
    addAttendee(name);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Quick Attendance</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 text-white p-2 rounded-lg"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Recent Names Quick Add */}
      {recentNames.length > 0 && (
        <div>
          <p className="text-sm text-gray-600 mb-2">Recent:</p>
          <div className="grid grid-cols-2 gap-2">
            {recentNames.slice(0, 8).map((name, index) => (
              <button
                key={index}
                onClick={() => quickAddFromRecent(name)}
                className="text-left p-2 bg-gray-100 rounded border text-sm hover:bg-gray-200 transition-colors"
                disabled={attendees.some(a => a.name === name)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add New Form */}
      {showAddForm && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Enter name"
            className="flex-1 p-3 border border-gray-300 rounded-lg text-lg"
            onKeyPress={(e) => e.key === 'Enter' && addAttendee(newName)}
            autoFocus
          />
          <button
            onClick={() => addAttendee(newName)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg"
            disabled={!newName.trim()}
          >
            Add
          </button>
        </div>
      )}

      {/* Attendance List */}
      <div className="space-y-2">
        {attendees.map((attendee) => (
          <div
            key={attendee.id}
            className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
              attendee.present
                ? 'bg-green-50 border-green-300'
                : 'bg-red-50 border-red-300'
            }`}
          >
            <span className="font-medium text-lg">{attendee.name}</span>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleAttendance(attendee.id)}
                className={`p-2 rounded-full transition-colors ${
                  attendee.present
                    ? 'bg-green-600 text-white'
                    : 'bg-red-600 text-white'
                }`}
              >
                {attendee.present ? <Check size={24} /> : <X size={24} />}
              </button>
              
              <button
                onClick={() => removeAttendee(attendee.id)}
                className="p-2 text-gray-500 hover:text-red-600 transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {attendees.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No attendees added yet</p>
          <p className="text-sm">Tap + to add names quickly</p>
        </div>
      )}
    </div>
  );
};