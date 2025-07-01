import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useShopStore } from '../store/useShopStore';
import { ViewMode } from '../types';

interface CalendarViewProps {
  onDateSelect: (date: string) => void;
  onClose: () => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ onDateSelect, onClose }) => {
  const { 
    tasks, 
    selectedDate, 
    currentUser,
    viewMode
  } = useShopStore();
  const [currentMonth, setCurrentMonth] = React.useState(new Date(selectedDate));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get tasks for each date based on view mode
  const getTasksForDate = (dateStr: string) => {
    let dateTasks = tasks.filter(task => task.createdAt.startsWith(dateStr));
    
    // Filter by user in MY_VIEW mode
    if (viewMode === ViewMode.MY_VIEW && currentUser) {
      dateTasks = dateTasks.filter(task => task.createdBy === currentUser.id);
    }
    
    return dateTasks;
  };

  // Get task counts for each date based on view mode
  const tasksByDate = tasks.reduce((acc, task) => {
    const date = task.createdAt.split('T')[0];
    
    // Filter by view mode for task counts
    let shouldInclude = true;
    if (viewMode === ViewMode.MY_VIEW && currentUser) {
      shouldInclude = task.createdBy === currentUser.id;
    }
    
    if (shouldInclude) {
      acc[date] = (acc[date] || 0) + 1;
    }
    
    return acc;
  }, {} as Record<string, number>);

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  const handleDateClick = (date: Date) => {
    if (isSameMonth(date, currentMonth)) {
      onDateSelect(format(date, 'yyyy-MM-dd'));
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <CalendarIcon className="h-8 w-8 text-primary-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">
              Task Calendar
            </h1>
            {currentUser && viewMode === ViewMode.MY_VIEW && (
              <div className="ml-4 flex items-center space-x-2 text-sm text-neutral-600">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: currentUser.color }}
                >
                  {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <span>{currentUser.name}'s View</span>
              </div>
            )}
            {viewMode === ViewMode.ALL_DATA && (
              <div className="ml-4 text-sm text-neutral-600">
                All Users Data
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-md hover:bg-neutral-200"
          >
            Return to Shifts
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <button
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-neutral-100 rounded-full"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-semibold">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-neutral-100 rounded-full"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div
                key={day}
                className="bg-neutral-50 py-2 text-center text-sm font-medium text-neutral-700"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {Array.from({ length: monthStart.getDay() }).map((_, index) => (
              <div key={`empty-start-${index}`} className="bg-white p-4" />
            ))}

            {daysInMonth.map(date => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const taskCount = tasksByDate[dateStr] || 0;
              const isSelected = isSameDay(date, new Date(selectedDate));

              return (
                <button
                  key={dateStr}
                  onClick={() => handleDateClick(date)}
                  className={`bg-white p-4 min-h-[100px] relative hover:bg-neutral-50 transition-colors ${
                    !isSameMonth(date, currentMonth) ? 'text-neutral-300' :
                    isSelected ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className={`text-right mb-2 ${
                    isToday(date) ? 'text-primary-600 font-bold' : ''
                  }`}>
                    {format(date, 'd')}
                  </div>
                  
                  {/* Task Count - Only show if there are tasks for this user/view */}
                  {taskCount > 0 && (
                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="bg-warning-100 text-warning-800 text-xs px-2 py-1 rounded-full">
                        {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}

            {Array.from({ 
              length: 6 - endOfMonth(currentMonth).getDay() 
            }).map((_, index) => (
              <div key={`empty-end-${index}`} className="bg-white p-4" />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold mb-3">Legend</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-warning-100 border border-warning-300 rounded mr-2"></div>
              <span>Days with scheduled tasks</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-primary-100 border border-primary-300 rounded mr-2"></div>
              <span>Selected date</span>
            </div>
          </div>
          
          {viewMode === ViewMode.MY_VIEW && currentUser && (
            <div className="mt-3 p-2 bg-blue-50 rounded border text-sm text-blue-700">
              <strong>My View:</strong> Only showing your tasks. Other users' tasks are hidden.
            </div>
          )}
          
          {viewMode === ViewMode.ALL_DATA && (
            <div className="mt-3 p-2 bg-green-50 rounded border text-sm text-green-700">
              <strong>All Data:</strong> Showing tasks from all users.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;