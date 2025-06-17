import React, { useState } from 'react';
import { format, parseISO, isAfter, startOfDay } from 'date-fns';
import { 
  Plus, CheckCircle2, ClipboardList, Calendar, ZoomIn, ZoomOut, 
  RotateCcw, LayoutGrid, AlertTriangle
} from 'lucide-react';
import { useShopStore } from '../store/useShopStore';
import { ViewMode } from '../types';
import ShiftHeader from './ShiftHeader';
import ShiftColumn from './ShiftColumn';
import TaskModal from './TaskModal';
import StatsBar from './StatsBar';
import StartOfShiftChecklist from './StartOfShiftChecklist';
import EndOfShiftCleanup from './EndOfShiftCleanup';
import SimpleView from './SimpleView';
import CalendarView from './CalendarView';
import SearchBar from './SearchBar';
import NotesExporter from './NotesExporter';
import ShiftNotesPanel from './ShiftNotesPanel';
import UserSelector from './UserSelector';

const ShiftDashboard: React.FC = () => {
  const { 
    shifts, 
    workers, 
    parts,
    taskTimeLogs,
    selectedDate,
    selectedTaskId,
    isTaskModalOpen,
    currentUser,
    viewMode,
    setSelectedDate,
    setSelectedTaskId,
    setTaskModalOpen,
    getTaskSummaryForDate,
    getFilteredTasks,
    moveTaskToShift,
    carryOverTask,
    getCarriedOverTasks,
    isStartChecklistComplete,
    isEndCleanupComplete
  } = useShopStore();
  
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [showStartOfShiftChecklist, setShowStartOfShiftChecklist] = useState(false);
  const [showEndOfShiftCleanup, setShowEndOfShiftCleanup] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showSimpleView, setShowSimpleView] = useState(false);
  const [showCalendarView, setShowCalendarView] = useState(false);
  
  const currentDate = selectedDate || format(new Date(), 'yyyy-MM-dd');
  const taskSummary = getTaskSummaryForDate(currentDate);
  const isFutureDate = isAfter(startOfDay(new Date(currentDate)), startOfDay(new Date()));
  
  // Get filtered tasks based on view mode
  const filteredTasks = getFilteredTasks();
  
  const expandedTasks = filteredTasks
    .filter(task => task.createdAt.startsWith(currentDate))
    .map(task => {
      const part = parts.find(p => p.id === task.partId);
      if (!part) return null;
      const taskWorkers = workers.filter(w => task.assignedWorkers.includes(w.id));
      return { ...task, part, workers: taskWorkers };
    })
    .filter(Boolean);
  
  const tasksByShift = shifts.map(shift => {
    const shiftTasks = expandedTasks.filter(task => task?.shiftId === shift.id);
    return { shift, tasks: shiftTasks };
  });

  const carriedOverTasks = getCarriedOverTasks(selectedDate);
  
  // CRITICAL: Only count incomplete checklists for shifts that actually have tasks
  const shiftsWithIncompleteLists = !isFutureDate ? shifts.filter(shift => {
    const shiftTasks = expandedTasks.filter(task => task?.shiftId === shift.id);
    if (shiftTasks.length === 0) return false; // CRITICAL: No tasks = no checklist requirement
    
    const startComplete = isStartChecklistComplete(shift.id, selectedDate);
    const endComplete = isEndCleanupComplete(shift.id, selectedDate);
    return !startComplete || !endComplete;
  }) : [];

  const hasIncompleteChecklists = shiftsWithIncompleteLists.length > 0;
  const incompleteChecklistsCount = shiftsWithIncompleteLists.length;

  const getDateClassName = () => {
    const classes = ['font-medium'];
    
    if (carriedOverTasks.length > 0) {
      classes.push('bg-warning-100 text-warning-800');
    }
    
    if (hasIncompleteChecklists) {
      classes.push('bg-error-100 text-error-800');
    }
    
    if (isFutureDate) {
      classes.push('text-primary-600');
    }
    
    return classes.join(' ');
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setShowCalendarView(false);
  };

  const handleSearchResult = (result: { type: 'date' | 'workOrder'; value: string; taskId?: string }) => {
    if (result.type === 'date') {
      setSelectedDate(result.value);
    } else if (result.type === 'workOrder' && result.taskId) {
      setSelectedTaskId(result.taskId);
      setModalMode('view');
      setTaskModalOpen(true);
    }
  };
  
  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setModalMode('view');
    setTaskModalOpen(true);
  };
  
  const handleAddTask = (shiftId: string) => {
    setSelectedShiftId(shiftId);
    setModalMode('create');
    setTaskModalOpen(true);
  };
  
  const handleTaskMove = (taskId: string, currentShiftId: string, direction: 'back' | 'forward') => {
    const currentShiftIndex = shifts.findIndex(s => s.id === currentShiftId);
    let targetShiftIndex;

    if (direction === 'forward') {
      targetShiftIndex = (currentShiftIndex + 1) % shifts.length;
      carryOverTask(taskId, shifts[targetShiftIndex].id);
    } else {
      targetShiftIndex = currentShiftIndex === 0 ? shifts.length - 1 : currentShiftIndex - 1;
      moveTaskToShift(taskId, shifts[targetShiftIndex].id);
    }
  };
  
  const handleCloseModal = () => {
    setTaskModalOpen(false);
    setSelectedTaskId(null);
    setSelectedShiftId(null);
  };

  const handleZoom = (action: 'in' | 'out' | 'reset') => {
    switch (action) {
      case 'in':
        setZoomLevel(prev => Math.min(prev + 0.1, 1.5));
        break;
      case 'out':
        setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
        break;
      case 'reset':
        setZoomLevel(1);
        break;
    }
  };
  
  const statsData = [
    { label: 'Total Tasks', value: taskSummary.total, color: 'bg-neutral-500' },
    { label: 'Completed', value: taskSummary.completed, color: 'bg-success-500' },
    { label: 'In Progress', value: taskSummary.inProgress, color: 'bg-primary-500' },
    { label: 'Pending', value: taskSummary.pending, color: 'bg-warning-500' },
    { label: 'Carried Over', value: taskSummary.carriedOver, color: 'bg-accent-500' }
  ];

  if (showCalendarView) {
    return (
      <CalendarView 
        onDateSelect={handleDateChange}
        onClose={() => setShowCalendarView(false)}
      />
    );
  }

  if (showSimpleView) {
    return <SimpleView onClose={() => setShowSimpleView(false)} />;
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-50">
      {/* Fixed Header */}
      <div className="flex-none">
        <ShiftHeader onDateChange={handleDateChange} />
        <StatsBar stats={statsData} />
        
        <div className="bg-white border-b border-neutral-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {/* CRITICAL: Calendar button with warning indicator for incomplete checklists */}
              <button
                onClick={() => setShowCalendarView(true)}
                className="mr-3 p-2 hover:bg-neutral-100 rounded-md relative"
              >
                <Calendar className="h-5 w-5 text-neutral-500" />
                {hasIncompleteChecklists && (
                  <AlertTriangle className="absolute -top-1 -right-1 h-4 w-4 text-error-600" />
                )}
              </button>
              <SearchBar onSearchResult={handleSearchResult} />
            </div>
            
            {/* User Selector and View Controls */}
            <UserSelector />
          </div>
        </div>

        {/* Date and Status Info */}
        <div className="bg-white border-b border-neutral-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex items-center">
                <span className={getDateClassName()}>
                  {format(parseISO(currentDate), 'MMMM d, yyyy')}
                </span>
                {isFutureDate && (
                  <span className="ml-2 text-sm text-primary-600">
                    (Future Date)
                  </span>
                )}
                {carriedOverTasks.length > 0 && (
                  <span className="ml-2 text-sm">
                    ({carriedOverTasks.length} carried over)
                  </span>
                )}
                {hasIncompleteChecklists && (
                  <div className="ml-2 flex items-center text-sm text-error-600">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    ({incompleteChecklistsCount} incomplete checklist{incompleteChecklistsCount !== 1 ? 's' : ''})
                  </div>
                )}
              </div>
              
              {/* Current User and View Mode */}
              {currentUser && (
                <div className="ml-4 flex items-center space-x-2 text-sm text-neutral-600">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                    style={{ backgroundColor: currentUser.color }}
                  >
                    {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <span>{currentUser.name}</span>
                  <span>•</span>
                  <span className="font-medium">
                    {viewMode === ViewMode.MY_VIEW ? 'My View' : 'All Data'}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <NotesExporter date={currentDate} />
              <button
                onClick={() => setShowSimpleView(true)}
                className="p-2 bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200 flex items-center"
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                Simple View
              </button>
              <div className="flex items-center bg-neutral-100 rounded-lg p-1">
                <button
                  onClick={() => handleZoom('out')}
                  className="p-1.5 hover:bg-neutral-200 rounded-md"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4 text-neutral-700" />
                </button>
                <button
                  onClick={() => handleZoom('reset')}
                  className="p-1.5 hover:bg-neutral-200 rounded-md mx-1"
                  title="Reset Zoom"
                >
                  <RotateCcw className="h-4 w-4 text-neutral-700" />
                </button>
                <button
                  onClick={() => handleZoom('in')}
                  className="p-1.5 hover:bg-neutral-200 rounded-md"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4 text-neutral-700" />
                </button>
              </div>
              <div className="text-sm text-neutral-600">
                {taskSummary.total === 0 ? (
                  isFutureDate ? 'Plan tasks for this date' : 'No tasks scheduled for this date'
                ) : (
                  `${taskSummary.completed} of ${taskSummary.total} tasks completed`
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 py-3 bg-white border-b border-neutral-200">
          <div className="flex flex-wrap gap-4">
            {shifts.map(shift => (
              <button
                key={shift.id}
                onClick={() => handleAddTask(shift.id)}
                className={`px-4 py-2 rounded-md flex items-center text-white ${
                  shift.type === 'S1' ? 'bg-primary-600 hover:bg-primary-700' :
                  shift.type === 'S2' ? 'bg-secondary-600 hover:bg-secondary-700' :
                  'bg-neutral-600 hover:bg-neutral-700'
                }`}
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Task to Shift {shift.type}
              </button>
            ))}
            {!isFutureDate && (
              <>
                <button
                  onClick={() => setShowStartOfShiftChecklist(true)}
                  className="px-4 py-2 bg-accent-600 text-white rounded-md hover:bg-accent-700 flex items-center ml-auto"
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Start of Shift Checklist
                </button>
                <button
                  onClick={() => setShowEndOfShiftCleanup(true)}
                  className="px-4 py-2 bg-warning-600 text-white rounded-md hover:bg-warning-700 flex items-center"
                >
                  <ClipboardList className="h-5 w-5 mr-2" />
                  End of Shift Cleanup
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left side - Main dashboard */}
        <div className="flex-1 overflow-hidden">
        <div 
          className="h-full overflow-y-auto p-4 transition-transform duration-200"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
        >
          {taskSummary.total === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Calendar className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-700 mb-2">
                  {isFutureDate ? 'Plan Ahead' : 
                   viewMode === ViewMode.MY_VIEW ? 'No Personal Tasks' : 'No Tasks Scheduled'}
                </h3>
                <p className="text-neutral-500 max-w-md">
                  {isFutureDate
                    ? `Schedule tasks for ${format(parseISO(currentDate), 'MMMM d, yyyy')}. Click one of the "Add Task" buttons above to get started.`
                    : viewMode === ViewMode.MY_VIEW
                    ? `You have no tasks scheduled for ${format(parseISO(currentDate), 'MMMM d, yyyy')}. Click one of the "Add Task" buttons above to create a task, or switch to "All Data" view to see tasks from other users.`
                    : `There are no tasks scheduled for ${format(parseISO(currentDate), 'MMMM d, yyyy')}. Click one of the "Add Task" buttons above to schedule a task for this date.`
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tasksByShift.map(({ shift, tasks }, index) => (
                <ShiftColumn
                  key={shift.id}
                  shift={shift}
                  tasks={tasks}
                  onTaskClick={handleTaskClick}
                  onAddTask={handleAddTask}
                  onMoveBack={index > 0 ? 
                    (taskId) => handleTaskMove(taskId, shift.id, 'back') : 
                    undefined
                  }
                  onMoveForward={index < shifts.length - 1 ? 
                    (taskId) => handleTaskMove(taskId, shift.id, 'forward') : 
                    undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
        </div>

        {/* Right side - Shift Notes Panel */}
        <div className="w-80 border-l border-neutral-200 bg-neutral-50 overflow-hidden">
          <div className="h-full overflow-y-auto p-4">
            <ShiftNotesPanel selectedDate={currentDate} />
          </div>
        </div>
      </div>

      {/* Checklists */}
      {!isFutureDate && showStartOfShiftChecklist && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 overflow-auto">
          <StartOfShiftChecklist
            shiftId={shifts[0].id}
            selectedDate={currentDate}
            onComplete={() => setShowStartOfShiftChecklist(false)}
          />
        </div>
      )}
      
      {!isFutureDate && showEndOfShiftCleanup && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 overflow-auto">
          <EndOfShiftCleanup
            shiftId={shifts[0].id}
            selectedDate={currentDate}
            onComplete={() => setShowEndOfShiftCleanup(false)}
          />
        </div>
      )}

      {/* Task Modal */}
      {isTaskModalOpen && (
        <ErrorBoundary fallback={<div className="p-4 text-red-600">Task Modal Error</div>}>
          <TaskModal 
            isOpen={isTaskModalOpen} 
            onClose={handleCloseModal} 
            taskId={selectedTaskId}
            mode={modalMode}
            shiftId={selectedShiftId || undefined}
            selectedDate={currentDate}
          />
        </ErrorBoundary>
      )}
    </div>
  );
};

export default ShiftDashboard;

// Basic ErrorBoundary
class ErrorBoundary extends React.Component<{ fallback: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}