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
  const uniqueRecentNames = Array.from(new Set(recentNames)).slice(0, 20);

  // Filter names based on search term
  const filteredNames = uniqueRecentNames.filter(name =>
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addNewAttendee = (name: string, isTemporary: boolean = false) => {
    if (name.trim() && !attendees.find(a => a.name === name.trim())) {
      const newAttendee: Attendee = {
        id: `attendee_${Date.now()}_${Math.random()}`,
        name: name.trim(),
        present: true, // Auto-mark as present when adding new
        isTemporary
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
        present: true,
        isTemporary: false
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
      addWorkerFromSearch();
    }
  };

  const addWorkerFromSearch = (isTemporary: boolean = false) => {
    if (searchTerm.trim() && !isAttendeeAdded(searchTerm.trim())) {
      addNewAttendee(searchTerm.trim(), isTemporary);
    }
  };

  const presentCount = attendees.filter(a => a.present).length;
  const totalCount = attendees.length;

  // Check if search term would create a new worker
  const canAddNewWorker = searchTerm.trim() && 
    !filteredNames.some(name => name.toLowerCase() === searchTerm.toLowerCase()) && 
    !isAttendeeAdded(searchTerm.trim());

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

      {/* Scrollable Worker Database */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">
            Recent Workers ({filteredNames.length + (canAddNewWorker ? 1 : 0)}):
          </p>
          {filteredNames.length > 0 && filteredNames.length < 5 && (
            <button
              onClick={() => {
                // Add all filtered workers as present
                const newAttendees = filteredNames
                  .filter(name => !isAttendeeAdded(name))
                  .map(name => ({
                    id: `attendee_${Date.now()}_${Math.random()}`,
                    name: name,
                    present: true,
                    isTemporary: false
                  }));
                
                if (newAttendees.length > 0) {
                  onUpdateAttendees([...attendees, ...newAttendees]);
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
            >
              <Users size={14} />
              Add All Workers
            </button>
          )}
        </div>
        
        {(filteredNames.length > 0 || canAddNewWorker) ? (
          <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
            {/* Add New Worker Option */}
            {canAddNewWorker && (
              <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-blue-50">
                <div className="flex items-center gap-2 flex-1">
                  <Plus size={16} className="text-blue-600" />
                  <span className="font-medium text-lg text-blue-700">
                    Add "{searchTerm}"
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => addWorkerFromSearch(false)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                    title="Add worker and save to future lists"
                  >
                    <Plus size={14} />
                    Add
                  </button>
                  <button
                    onClick={() => addWorkerFromSearch(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                    title="Add temporary worker (won't be saved for future)"
                  >
                    <Plus size={14} />
                    Temp
                  </button>
                </div>
              </div>
            )}
            
            {/* Existing Workers */}
            {filteredNames.slice(0, 4).map((name, index) => {
              const isPresent = isAttendeePresent(name);
              const isAdded = isAttendeeAdded(name);
              
              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 ${
                    canAddNewWorker || index < 3 ? 'border-b border-gray-100' : ''
                  } transition-colors ${
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
            
            {/* Show remaining workers if more than 4 */}
            {filteredNames.length > 4 && (
              <div className="max-h-48 overflow-y-auto">
                {filteredNames.slice(4).map((name, index) => {
                  const isPresent = isAttendeePresent(name);
                  const isAdded = isAttendeeAdded(name);
                  const actualIndex = index + 4;
                  
                  return (
                    <div
                      key={actualIndex}
                      className={`flex items-center justify-between p-4 ${
                        actualIndex < filteredNames.length - 1 ? 'border-b border-gray-100' : ''
                      } transition-colors ${
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
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
            {searchTerm ? (
              <>
                <Search className="mx-auto mb-2 text-gray-300" size={32} />
                <p>No existing workers found matching "{searchTerm}"</p>
              </>
            ) : (
              <>
                <Users className="mx-auto mb-2 text-gray-300" size={32} />
                <p>No recent workers found</p>
                <p className="text-sm">Type a name in the search bar to add new workers</p>
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
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{attendee.name}</span>
                    {attendee.isTemporary && (
                      <span className="bg-orange-200 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                        TEMP
                      </span>
                    )}
                  </div>
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