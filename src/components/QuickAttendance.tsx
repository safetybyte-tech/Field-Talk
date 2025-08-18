import React from 'react';
import { Check, X, Plus, Trash2, Users } from 'lucide-react';
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

  const addAttendeeAsPresent = (name: string) => {
    if (name.trim() && !attendees.find(a => a.name === name.trim())) {
      const newAttendee: Attendee = {
        id: `attendee_${Date.now()}_${Math.random()}`,
        name: name.trim(),
        present: true // Auto-mark as present
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
    addAttendeeAsPresent(name);
  };

  // Filter out names that are already added
  const availableRecentNames = recentNames.filter(name => 
    !attendees.some(a => a.name === name)
  );

  const presentCount = attendees.filter(a => a.present).length;
  const totalCount = attendees.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Quick Attendance</h3>
          <p className="text-sm text-gray-600">
            Present: {presentCount} / {totalCount}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* One-Tap Add from Recent Names */}
      {availableRecentNames.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">
            Tap to add as present:
          </p>
          <div className="grid grid-cols-1 gap-2">
            {availableRecentNames.slice(0, 12).map((name, index) => (
              <button
                key={index}
                onClick={() => quickAddFromRecent(name)}
                className="text-left p-4 bg-green-50 border-2 border-green-200 rounded-lg text-lg font-medium hover:bg-green-100 transition-colors active:bg-green-200"
              >
                <div className="flex items-center justify-between">
                  <span>{name}</span>
                  <div className="bg-green-600 text-white p-1 rounded-full">
                    <Check size={16} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Manual Add Form */}
      {showAddForm && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new name"
              className="flex-1 p-3 border border-gray-300 rounded-lg text-lg"
              onKeyPress={(e) => e.key === 'Enter' && addAttendeeAsPresent(newName)}
              autoFocus
            />
            <button
              onClick={() => addAttendeeAsPresent(newName)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              disabled={!newName.trim()}
            >
              Add Present
            </button>
          </div>
        </div>
      )}

      {/* Current Attendance List */}
      {attendees.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">
            Current Attendance:
          </p>
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
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {attendee.present ? <Check size={20} /> : <X size={20} />}
                  </button>
                  
                  <button
                    onClick={() => removeAttendee(attendee.id)}
                    className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {attendees.length === 0 && availableRecentNames.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Users className="mx-auto mb-4 text-gray-300" size={48} />
          <p className="text-lg">No attendees yet</p>
          <p className="text-sm">Add names using the + button above</p>
        </div>
      )}

      {attendees.length === 0 && availableRecentNames.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Tap names above to add as present</p>
        </div>
      )}
    </div>
  );
};