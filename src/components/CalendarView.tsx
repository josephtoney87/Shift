import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { useShopStore } from '../store/useShopStore';

interface CalendarViewProps {
  onDateSelect: (date: string) => void;
  onClose: () => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ onDateSelect, onClose }) => {
  const { 
    tasks, 
    selectedDate, 
    shifts, 
    isStartChecklistComplete, 
    isEndCleanupComplete 
  } = useShopStore();
  const [currentMonth, setCurrentMonth] = React.useState(new Date(selectedDate));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get tasks for each date (ALL tasks, regardless of view mode for calendar)
  const tasksByDate = tasks.reduce((acc, task) => {
    const date = task.createdAt.split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get checklist completion status for each date
  const getChecklistStatus = (dateStr: string) => {
    const incompleteShifts = shifts.filter(shift => {
      const startComplete = isStartChecklistComplete(shift.id, dateStr);
      const endComplete = isEndCleanupComplete(shift.id, dateStr);
      return !startComplete || !endComplete;
    });
    
    return {
      hasIncompleteTasks: incompleteShifts.length > 0,
      incompleteCount: incompleteShifts.length
    };
  };

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
              const checklistStatus = getChecklistStatus(dateStr);

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
                  
                  {/* Incomplete Checklist Warning */}
                  {checklistStatus.hasIncompleteTasks && (
                    <div className="absolute top-2 left-2">
                      <AlertTriangle className="h-4 w-4 text-error-600" />
                    </div>
                  )}
                  
                  {/* Task Count */}
                  {taskCount > 0 && (
                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="bg-warning-100 text-warning-800 text-xs px-2 py-1 rounded-full">
                        {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                      </div>
                    </div>
                  )}

                  {/* Checklist Status */}
                  {checklistStatus.hasIncompleteTasks && (
                    <div className="absolute bottom-8 left-2 right-2">
                      <div className="bg-error-100 text-error-800 text-xs px-2 py-1 rounded-full">
                        {checklistStatus.incompleteCount} incomplete checklist{checklistStatus.incompleteCount !== 1 ? 's' : ''}
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
              <AlertTriangle className="h-4 w-4 text-error-600 mr-2" />
              <span>Days with incomplete checklists</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-primary-100 border border-primary-300 rounded mr-2"></div>
              <span>Selected date</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;