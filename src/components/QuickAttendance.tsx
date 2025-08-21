import React from 'react';
import { Check, X, Plus, Trash2, Users, Search } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = React.useState('');

  // Get unique names from recent names (last 10 unique names)
  const uniqueRecentNames = Array.from(new Set(recentNames)).slice(0, 10);

  // Filter names based on search term
  const filteredNames = uniqueRecentNames.filter(name =>
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addNewAttendee = () => {
    if (newName.trim() && !attendees.find(a => a.name === newName.trim())) {
      const newAttendee: Attendee = {
        id: `attendee_${Date.now()}_${Math.random()}`,
        name: newName.trim(),
        present: true // Auto-mark as present when adding new
      };
      
      onUpdateAttendees([...attendees, newAttendee]);
      setNewName('');
      setShowAddForm(false);
    }
  };

  const toggleAttendance = (name: string) => {
    const existingAttendee = attendees.find(a => a.name === name);
    
    if (existingAttendee) {
      // Toggle existing attendee
      onUpdateAttendees(
        attendees.map(attendee =>
          attendee.name === name
            ? { ...attendee, present: !attendee.present }
            : attendee
        )
      );
    } else {
      // Add new attendee as present
      const newAttendee: Attendee = {
        id: `attendee_${Date.now()}_${Math.random()}`,
        name: name,
        present: true
      };
      onUpdateAttendees([...attendees, newAttendee]);
    }
  };

  const removeAttendee = (id: string) => {
    onUpdateAttendees(attendees.filter(a => a.id !== id));
  };

  const isAttendeePresent = (name: string): boolean => {
    const attendee = attendees.find(a => a.name === name);
    return attendee ? attendee.present : false;
  };

  const isAttendeeAdded = (name: string): boolean => {
    return attendees.some(a => a.name === name);
  };

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
      </div>

      {/* Search Bar with Add Button */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search workers..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-lg"
          />
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Add New Worker Form */}
      {showAddForm && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new worker name"
              className="flex-1 p-3 border border-gray-300 rounded-lg text-lg"
              onKeyPress={(e) => e.key === 'Enter' && addNewAttendee()}
              autoFocus
            />
            <button
              onClick={addNewAttendee}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              disabled={!newName.trim()}
            >
              Add
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Scrollable Worker Database */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">
          Recent Workers ({filteredNames.length}):
        </p>
        
        {filteredNames.length > 0 ? (
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
            {filteredNames.map((name, index) => {
              const isPresent = isAttendeePresent(name);
              const isAdded = isAttendeeAdded(name);
              
              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0 transition-colors ${
                    isPresent ? 'bg-green-50' : isAdded ? 'bg-red-50' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium text-lg">{name}</span>
                  
                  <button
                    onClick={() => toggleAttendance(name)}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      isPresent
                        ? 'bg-green-600 border-green-600 text-white'
                        : isAdded
                        ? 'bg-red-600 border-red-600 text-white'
                        : 'border-gray-300 hover:border-green-500'
                    }`}
                  >
                    {isPresent ? (
                      <Check size={20} />
                    ) : isAdded ? (
                      <X size={20} />
                    ) : null}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
            {searchTerm ? (
              <>
                <Search className="mx-auto mb-2 text-gray-300" size={32} />
                <p>No workers found matching "{searchTerm}"</p>
              </>
            ) : (
              <>
                <Users className="mx-auto mb-2 text-gray-300" size={32} />
                <p>No recent workers found</p>
                <p className="text-sm">Add workers using the + button above</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Current Attendance Summary */}
      {attendees.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">
            Current Attendance Summary:
          </p>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 gap-2">
              {attendees.map((attendee) => (
                <div
                  key={attendee.id}
                  className={`flex items-center justify-between p-2 rounded ${
                    attendee.present ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  <span className="font-medium">{attendee.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {attendee.present ? 'Present' : 'Absent'}
                    </span>
                    <button
                      onClick={() => removeAttendee(attendee.id)}
                      className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};