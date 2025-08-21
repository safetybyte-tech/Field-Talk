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
  const [searchTerm, setSearchTerm] = React.useState('');

  // Get unique names from recent names (last 10 unique names)
  const uniqueRecentNames = Array.from(new Set(recentNames)).slice(0, 10);

  // Filter names based on search term
  const filteredNames = uniqueRecentNames.filter(name =>
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addNewAttendee = (name: string) => {
    if (name.trim() && !attendees.find(a => a.name === name.trim())) {
      const newAttendee: Attendee = {
        id: `attendee_${Date.now()}_${Math.random()}`,
        name: name.trim(),
        present: true // Auto-mark as present when adding new
      };
      
      onUpdateAttendees([...attendees, newAttendee]);
      setSearchTerm('');
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

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      // If search term doesn't match any existing names, add as new worker
      const exactMatch = uniqueRecentNames.find(name => 
        name.toLowerCase() === searchTerm.toLowerCase()
      );
      
      if (!exactMatch && !isAttendeeAdded(searchTerm.trim())) {
        addNewAttendee(searchTerm.trim());
      }
    }
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

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            placeholder="Search workers or add new..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-lg"
          />
        </div>
      </div>

      {/* Add New Worker Hint */}
      {searchTerm.trim() && !filteredNames.some(name => 
        name.toLowerCase() === searchTerm.toLowerCase()
      ) && !isAttendeeAdded(searchTerm.trim()) && (
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
          <p className="text-sm text-blue-700">
            Press <kbd className="bg-blue-100 px-2 py-1 rounded text-xs font-mono">Enter</kbd> to add "{searchTerm}" as a new worker
          </p>
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
                <p className="text-sm">Type a name in the search bar and press Enter to add new workers</p>
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