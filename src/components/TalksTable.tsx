import React from 'react';
import { Calendar, Users, MapPin, User, CheckCircle, Clock, ArrowUpDown } from 'lucide-react';
import { ToolboxTalk } from '../types';

interface TalksTableProps {
  talks: ToolboxTalk[];
  onEditTalk: (id: string) => void;
}

type SortField = 'date' | 'title' | 'location' | 'supervisor' | 'attendees' | 'status';
type SortDirection = 'asc' | 'desc';

export const TalksTable: React.FC<TalksTableProps> = ({ talks, onEditTalk }) => {
  const [sortField, setSortField] = React.useState<SortField>('date');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');
  const [focusedRowIndex, setFocusedRowIndex] = React.useState<number>(-1);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedTalks = React.useMemo(() => {
    return [...talks].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'location':
          aValue = a.location.toLowerCase();
          bValue = b.location.toLowerCase();
          break;
        case 'supervisor':
          aValue = a.supervisor.toLowerCase();
          bValue = b.supervisor.toLowerCase();
          break;
        case 'attendees':
          aValue = a.attendees.filter(att => att.present).length;
          bValue = b.attendees.filter(att => att.present).length;
          break;
        case 'status':
          aValue = a.submittedAt ? 1 : 0;
          bValue = b.submittedAt ? 1 : 0;
          break;
        default:
          aValue = a.date;
          bValue = b.date;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [talks, sortField, sortDirection]);

  const handleKeyDown = (event: React.KeyboardEvent, talkId: string, index: number) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        onEditTalk(talkId);
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (index < sortedTalks.length - 1) {
          setFocusedRowIndex(index + 1);
          const nextRow = document.querySelector(`[data-row-index="${index + 1}"]`) as HTMLElement;
          nextRow?.focus();
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (index > 0) {
          setFocusedRowIndex(index - 1);
          const prevRow = document.querySelector(`[data-row-index="${index - 1}"]`) as HTMLElement;
          prevRow?.focus();
        }
        break;
    }
  };

  const getSortAriaLabel = (field: SortField, currentField: SortField, direction: SortDirection) => {
    if (field === currentField) {
      return `Sort by ${field}, currently sorted ${direction === 'asc' ? 'ascending' : 'descending'}. Click to sort ${direction === 'asc' ? 'descending' : 'ascending'}.`;
    }
    return `Sort by ${field}`;
  };

  const formatDate = (dateString: string) => {
    // Parse as local date (not UTC)
    const localDate = new Date(dateString + 'T00:00:00');
    return localDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  };

  if (talks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500" role="status" aria-live="polite">
        <Calendar size={48} className="mx-auto mb-4 text-gray-300" aria-hidden="true" />
        <p className="text-lg">No toolbox talks found</p>
        <p className="text-sm">Create your first toolbox talk to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table 
        className="w-full border-collapse"
        role="table"
        aria-label="Toolbox talks list"
        aria-rowcount={sortedTalks.length + 1}
      >
        <caption className="sr-only">
          List of {talks.length} toolbox talks. Use arrow keys to navigate rows, Enter or Space to edit a talk.
          Table is sortable by clicking column headers.
        </caption>
        
        <thead>
          <tr role="row" className="bg-gray-50 border-b border-gray-200">
            <th 
              scope="col"
              className="px-4 py-3 text-left text-sm font-semibold text-gray-900"
            >
              <button
                onClick={() => handleSort('date')}
                className="flex items-center gap-2 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1 py-1"
                aria-label={getSortAriaLabel('date', sortField, sortDirection)}
              >
                <Calendar size={16} aria-hidden="true" />
                Date
                <ArrowUpDown 
                  size={14} 
                  className={`transition-transform ${
                    sortField === 'date' 
                      ? sortDirection === 'desc' ? 'rotate-180' : 'rotate-0'
                      : 'opacity-50'
                  }`}
                  aria-hidden="true"
                />
              </button>
            </th>
            
            <th 
              scope="col"
              className="px-4 py-3 text-left text-sm font-semibold text-gray-900"
            >
              <button
                onClick={() => handleSort('title')}
                className="flex items-center gap-2 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1 py-1"
                aria-label={getSortAriaLabel('title', sortField, sortDirection)}
              >
                Talk Title
                <ArrowUpDown 
                  size={14} 
                  className={`transition-transform ${
                    sortField === 'title' 
                      ? sortDirection === 'desc' ? 'rotate-180' : 'rotate-0'
                      : 'opacity-50'
                  }`}
                  aria-hidden="true"
                />
              </button>
            </th>
            
            <th 
              scope="col"
              className="px-4 py-3 text-left text-sm font-semibold text-gray-900"
            >
              <button
                onClick={() => handleSort('location')}
                className="flex items-center gap-2 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1 py-1"
                aria-label={getSortAriaLabel('location', sortField, sortDirection)}
              >
                <MapPin size={16} aria-hidden="true" />
                Location
                <ArrowUpDown 
                  size={14} 
                  className={`transition-transform ${
                    sortField === 'location' 
                      ? sortDirection === 'desc' ? 'rotate-180' : 'rotate-0'
                      : 'opacity-50'
                  }`}
                  aria-hidden="true"
                />
              </button>
            </th>
            
            <th 
              scope="col"
              className="px-4 py-3 text-left text-sm font-semibold text-gray-900"
            >
              <button
                onClick={() => handleSort('supervisor')}
                className="flex items-center gap-2 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1 py-1"
                aria-label={getSortAriaLabel('supervisor', sortField, sortDirection)}
              >
                <User size={16} aria-hidden="true" />
                Supervisor
                <ArrowUpDown 
                  size={14} 
                  className={`transition-transform ${
                    sortField === 'supervisor' 
                      ? sortDirection === 'desc' ? 'rotate-180' : 'rotate-0'
                      : 'opacity-50'
                  }`}
                  aria-hidden="true"
                />
              </button>
            </th>
            
            <th 
              scope="col"
              className="px-4 py-3 text-left text-sm font-semibold text-gray-900"
            >
              <button
                onClick={() => handleSort('attendees')}
                className="flex items-center gap-2 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1 py-1"
                aria-label={getSortAriaLabel('attendees', sortField, sortDirection)}
              >
                <Users size={16} aria-hidden="true" />
                Attendance
                <ArrowUpDown 
                  size={14} 
                  className={`transition-transform ${
                    sortField === 'attendees' 
                      ? sortDirection === 'desc' ? 'rotate-180' : 'rotate-0'
                      : 'opacity-50'
                  }`}
                  aria-hidden="true"
                />
              </button>
            </th>
            
            <th 
              scope="col"
              className="px-4 py-3 text-left text-sm font-semibold text-gray-900"
            >
              <button
                onClick={() => handleSort('status')}
                className="flex items-center gap-2 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1 py-1"
                aria-label={getSortAriaLabel('status', sortField, sortDirection)}
              >
                Status
                <ArrowUpDown 
                  size={14} 
                  className={`transition-transform ${
                    sortField === 'status' 
                      ? sortDirection === 'desc' ? 'rotate-180' : 'rotate-0'
                      : 'opacity-50'
                  }`}
                  aria-hidden="true"
                />
              </button>
            </th>
          </tr>
        </thead>
        
        <tbody>
          {sortedTalks.map((talk, index) => {
            const presentCount = talk.attendees.filter(a => a.present).length;
            const totalCount = talk.attendees.length;
            const isSubmitted = !!talk.submittedAt;
            
            return (
              <tr
                key={talk.id}
                role="row"
                tabIndex={0}
                data-row-index={index}
                className={`border-b border-gray-100 hover:bg-gray-50 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset cursor-pointer transition-colors ${
                  focusedRowIndex === index ? 'bg-blue-50' : ''
                }`}
                onClick={() => onEditTalk(talk.id)}
                onKeyDown={(e) => handleKeyDown(e, talk.id, index)}
                aria-rowindex={index + 2}
                aria-label={`Toolbox talk: ${talk.title}, ${formatDate(talk.date)}, ${presentCount} of ${totalCount} attendees present, ${isSubmitted ? 'submitted' : 'draft'}. Press Enter to edit.`}
              >
                <td className="px-4 py-3 text-sm text-gray-900" role="gridcell">
                  <time dateTime={talk.date}>
                    {formatDate(talk.date)}
                  </time>
                </td>
                
                <td className="px-4 py-3 text-sm font-medium text-gray-900" role="gridcell">
                  {talk.title || <span className="text-gray-400 italic">Untitled</span>}
                </td>
                
                <td className="px-4 py-3 text-sm text-gray-600" role="gridcell">
                  {talk.location || <span className="text-gray-400 italic">No location</span>}
                </td>
                
                <td className="px-4 py-3 text-sm text-gray-600" role="gridcell">
                  {talk.supervisor || <span className="text-gray-400 italic">No supervisor</span>}
                </td>
                
                <td className="px-4 py-3 text-sm text-gray-600" role="gridcell">
                  <span className="flex items-center gap-1">
                    <Users size={14} aria-hidden="true" />
                    <span aria-label={`${presentCount} present out of ${totalCount} total attendees`}>
                      {presentCount}/{totalCount}
                    </span>
                  </span>
                </td>
                
                <td className="px-4 py-3 text-sm" role="gridcell">
                  {isSubmitted ? (
                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                      <CheckCircle size={12} aria-hidden="true" />
                      <span>Submitted</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                      <Clock size={12} aria-hidden="true" />
                      <span>Draft</span>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};