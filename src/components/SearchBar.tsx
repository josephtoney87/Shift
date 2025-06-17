import React, { useState, useEffect } from 'react';
import { Search, Calendar, FileText, X } from 'lucide-react';
import { useShopStore } from '../store/useShopStore';
import { format, parseISO } from 'date-fns';

interface SearchBarProps {
  onSearchResult: (result: { type: 'date' | 'workOrder'; value: string; taskId?: string }) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearchResult }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { tasks, parts, getExpandedTask } = useShopStore();

  useEffect(() => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      setIsOpen(false);
      return;
    }

    const results = [];
    
    // Search for work orders
    const workOrderResults = tasks
      .filter(task => 
        task.workOrderNumber.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .map(task => {
        const expandedTask = getExpandedTask(task.id);
        return {
          type: 'workOrder',
          id: task.id,
          workOrderNumber: task.workOrderNumber,
          description: task.description,
          date: task.createdAt.split('T')[0],
          status: task.status
        };
      })
      .slice(0, 5);

    results.push(...workOrderResults);

    // Search for dates (if it looks like a date)
    if (/^\d{4}-\d{2}-\d{2}$/.test(searchTerm) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(searchTerm)) {
      let dateStr = searchTerm;
      if (searchTerm.includes('/')) {
        const [month, day, year] = searchTerm.split('/');
        dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      const tasksOnDate = tasks.filter(task => task.createdAt.startsWith(dateStr));
      if (tasksOnDate.length > 0) {
        results.push({
          type: 'date',
          date: dateStr,
          taskCount: tasksOnDate.length,
          displayDate: format(parseISO(dateStr), 'MMMM d, yyyy')
        });
      }
    }

    setSearchResults(results);
    setIsOpen(results.length > 0);
  }, [searchTerm, tasks, getExpandedTask]);

  const handleResultClick = (result: any) => {
    if (result.type === 'workOrder') {
      onSearchResult({ type: 'workOrder', value: result.workOrderNumber, taskId: result.id });
    } else if (result.type === 'date') {
      onSearchResult({ type: 'date', value: result.date });
    }
    setSearchTerm('');
    setIsOpen(false);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setIsOpen(false);
  };

  return (
    <div className="relative flex-1 max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search work orders or dates (YYYY-MM-DD)..."
          className="w-full pl-10 pr-10 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && searchResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {searchResults.map((result, index) => (
            <button
              key={index}
              onClick={() => handleResultClick(result)}
              className="w-full px-4 py-3 text-left hover:bg-neutral-50 border-b border-neutral-100 last:border-b-0"
            >
              {result.type === 'workOrder' ? (
                <div className="flex items-center">
                  <FileText className="h-4 w-4 text-primary-500 mr-3 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-neutral-900 truncate">
                      {result.workOrderNumber}
                    </div>
                    <div className="text-sm text-neutral-600 truncate">
                      {result.description}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {format(parseISO(result.date), 'MMM d, yyyy')} • {result.status}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-secondary-500 mr-3 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-neutral-900">
                      {result.displayDate}
                    </div>
                    <div className="text-sm text-neutral-600">
                      {result.taskCount} task{result.taskCount !== 1 ? 's' : ''} scheduled
                    </div>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;