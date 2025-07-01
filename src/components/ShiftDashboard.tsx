import React, { useState, useEffect } from 'react';
import { format, parseISO, isAfter, startOfDay } from 'date-fns';
import { 
  Plus, CheckCircle2, ClipboardList, Calendar, ZoomIn, ZoomOut, 
  RotateCcw, LayoutGrid, AlertTriangle
} from 'lucide-react';
import { useShopStore } from '../store/useShopStore';
import { ViewMode } from '../types';
import { persistenceService } from '../services/persistenceService';
import ShiftHeader from './ShiftHeader';
import ShiftColumn from './ShiftColumn';
import TaskModal from './TaskModal';
import SimpleView from './SimpleView';
import CalendarView from './CalendarView';
import SearchBar from './SearchBar';
import NotesExporter from './NotesExporter';
import UserSelector from './UserSelector';
import EnhancedOfflineNotice from './EnhancedOfflineNotice';
import Tooltip from './Tooltip';

const ShiftDashboard: React.FC = () => {
  const storeState = useShopStore();
  
  // Early return if store state is not properly initialized
  if (!storeState) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const { 
    shifts = [], 
    workers = [], 
    parts = [],
    taskTimeLogs = [],
    selectedDate,
    selectedTaskId,
    isTaskModalOpen = false,
    currentUser,
    viewMode = ViewMode.MY_VIEW,
    pendingChanges = [],
    isInitialized = false,
    setSelectedDate,
    setSelectedTaskId,
    setTaskModalOpen,
    getTaskSummaryForDate,
    getFilteredTasks,
    moveTaskToShift,
    carryOverTask,
    getCarriedOverTasks
  } = storeState;
  
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showSimpleView, setShowSimpleView] = useState(false);
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  
  // Update pending count
  useEffect(() => {
    const interval = setInterval(() => {
      setPendingCount(persistenceService?.getPendingOperationsCount() || 0);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Early return with loading state if not initialized or missing required functions
  if (!isInitialized || !getTaskSummaryForDate || !getFilteredTasks) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Initializing synchronization...</p>
          <p className="text-neutral-500 text-sm mt-2">Setting up multi-device sync...</p>
        </div>
      </div>
    );
  }

  // Safe date handling
  const currentDate = selectedDate || format(new Date(), 'yyyy-MM-dd');
  const taskSummary = getTaskSummaryForDate(currentDate) || {
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    carriedOver: 0
  };
  
  const isFutureDate = isAfter(startOfDay(new Date(currentDate)), startOfDay(new Date()));
  
  // Get filtered tasks based on view mode with safety checks
  const filteredTasks = getFilteredTasks() || [];
  
  const expandedTasks = filteredTasks
    .filter(task => task?.createdAt?.startsWith(currentDate))
    .map(task => {
      if (!task?.id || !task?.partId) return null;
      
      const part = parts.find(p => p?.id === task.partId);
      if (!part) return null;
      
      const taskWorkers = workers.filter(w => w?.id && task?.assignedWorkers?.includes(w.id));
      return { ...task, part, workers: taskWorkers };
    })
    .filter(Boolean);
  
  // Safe shift processing
  const tasksByShift = (shifts || []).map(shift => {
    if (!shift?.id) return { shift, tasks: [] };
    
    const shiftTasks = expandedTasks.filter(task => task?.shiftId === shift.id);
    return { shift, tasks: shiftTasks };
  });

  const carriedOverTasks = getCarriedOverTasks ? getCarriedOverTasks(selectedDate) : [];

  const handleDateChange = (date: string) => {
    if (setSelectedDate) {
      setSelectedDate(date);
    }
    setShowCalendarView(false);
  };

  const handleSearchResult = (result: { type: 'date' | 'workOrder'; value: string; taskId?: string }) => {
    if (result.type === 'date' && setSelectedDate) {
      setSelectedDate(result.value);
    } else if (result.type === 'workOrder' && result.taskId && setSelectedTaskId && setTaskModalOpen) {
      setSelectedTaskId(result.taskId);
      setModalMode('view');
      setTaskModalOpen(true);
    }
  };
  
  const handleTaskClick = (taskId: string) => {
    if (setSelectedTaskId && setTaskModalOpen) {
      setSelectedTaskId(taskId);
      setModalMode('view');
      setTaskModalOpen(true);
    }
  };
  
  const handleAddNote = (shiftId: string) => {
    if (setSelectedTaskId && setTaskModalOpen) {
      setSelectedShiftId(shiftId);
      setModalMode('create');
      setTaskModalOpen(true);
    }
  };
  
  const handleTaskMove = (taskId: string, currentShiftId: string, direction: 'back' | 'forward') => {
    if (!shifts?.length || !moveTaskToShift || !carryOverTask) return;
    
    const currentShiftIndex = shifts.findIndex(s => s?.id === currentShiftId);
    if (currentShiftIndex === -1) return;
    
    let targetShiftIndex;

    if (direction === 'forward') {
      targetShiftIndex = (currentShiftIndex + 1) % shifts.length;
      const targetShift = shifts[targetShiftIndex];
      if (targetShift?.id) {
        carryOverTask(taskId, targetShift.id);
      }
    } else {
      targetShiftIndex = currentShiftIndex === 0 ? shifts.length - 1 : currentShiftIndex - 1;
      const targetShift = shifts[targetShiftIndex];
      if (targetShift?.id) {
        moveTaskToShift(taskId, targetShift.id);
      }
    }
  };
  
  const handleCloseModal = () => {
    if (setTaskModalOpen && setSelectedTaskId) {
      setTaskModalOpen(false);
      setSelectedTaskId(null);
      setSelectedShiftId(null);
    }
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
        
        {/* Enhanced Offline Notice */}
        <EnhancedOfflineNotice />
        
        <div className="bg-white border-b border-neutral-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Tooltip content="Select the date to view or manage notes for that shift" position="bottom">
                <button
                  onClick={() => setShowCalendarView(true)}
                  className="mr-3 p-2 hover:bg-neutral-100 rounded-md relative"
                >
                  <Calendar className="h-5 w-5 text-neutral-500" />
                </button>
              </Tooltip>
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
                <span className="font-medium">
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
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <NotesExporter date={currentDate} />
              <Tooltip content="Switch to simple view for a cleaner layout" position="bottom">
                <button
                  onClick={() => setShowSimpleView(true)}
                  className="p-2 bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200 flex items-center"
                >
                  <LayoutGrid className="h-4 w-4 mr-1" />
                  Simple View
                </button>
              </Tooltip>
              <div className="flex items-center bg-neutral-100 rounded-lg p-1">
                <Tooltip content="Zoom out to see more content" position="bottom">
                  <button
                    onClick={() => handleZoom('out')}
                    className="p-1.5 hover:bg-neutral-200 rounded-md"
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-4 w-4 text-neutral-700" />
                  </button>
                </Tooltip>
                <Tooltip content="Reset zoom to default level" position="bottom">
                  <button
                    onClick={() => handleZoom('reset')}
                    className="p-1.5 hover:bg-neutral-200 rounded-md mx-1"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="h-4 w-4 text-neutral-700" />
                  </button>
                </Tooltip>
                <Tooltip content="Zoom in to see more detail" position="bottom">
                  <button
                    onClick={() => handleZoom('in')}
                    className="p-1.5 hover:bg-neutral-200 rounded-md"
                    title="Zoom In"
                  >
                    <ZoomIn className="h-4 w-4 text-neutral-700" />
                  </button>
                </Tooltip>
              </div>
              <div className="text-sm text-neutral-600">
                {taskSummary.total === 0 ? (
                  isFutureDate ? 'Plan notes for this date' : 'No notes scheduled for this date'
                ) : (
                  `${taskSummary.completed || 0} of ${taskSummary.total || 0} notes completed`
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 py-3 bg-white border-b border-neutral-200">
          <div className="flex flex-wrap gap-4">
            {(shifts || []).map(shift => {
              if (!shift?.id) return null;
              
              return (
                <Tooltip 
                  key={shift.id}
                  content="Create a new note for this shift with description, checklists, and assigned workers"
                  position="bottom"
                >
                  <button
                    onClick={() => handleAddNote(shift.id)}
                    className={`px-4 py-2 rounded-md flex items-center text-white ${
                      shift.type === 'S1' ? 'bg-primary-600 hover:bg-primary-700' :
                      shift.type === 'S2' ? 'bg-secondary-600 hover:bg-secondary-700' :
                      'bg-neutral-600 hover:bg-neutral-700'
                    }`}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Notes to Shift {shift.type}
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content - Full Width */}
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
                   viewMode === ViewMode.MY_VIEW ? 'No Personal Notes' : 'No Notes Scheduled'}
                </h3>
                <p className="text-neutral-500 max-w-md">
                  {isFutureDate
                    ? `Schedule notes for ${format(parseISO(currentDate), 'MMMM d, yyyy')}. Click one of the "Add Notes" buttons above to get started. All data syncs automatically across devices.`
                    : viewMode === ViewMode.MY_VIEW
                    ? `You have no notes scheduled for ${format(parseISO(currentDate), 'MMMM d, yyyy')}. Click one of the "Add Notes" buttons above to create a note, or switch to "All Data" view to see notes from other users.`
                    : `There are no notes scheduled for ${format(parseISO(currentDate), 'MMMM d, yyyy')}. Click one of the "Add Notes" buttons above to schedule a note for this date. Changes sync automatically across all devices.`
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tasksByShift.map(({ shift, tasks }, index) => {
                if (!shift?.id) return null;
                
                return (
                  <ShiftColumn
                    key={shift.id}
                    shift={shift}
                    tasks={tasks}
                    onTaskClick={handleTaskClick}
                    onAddTask={handleAddNote}
                    onMoveBack={index > 0 ? 
                      (taskId) => handleTaskMove(taskId, shift.id, 'back') : 
                      undefined
                    }
                    onMoveForward={index < shifts.length - 1 ? 
                      (taskId) => handleTaskMove(taskId, shift.id, 'forward') : 
                      undefined
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Task Modal */}
      {isTaskModalOpen && setTaskModalOpen && setSelectedTaskId && (
        <ErrorBoundary>
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

// Enhanced ErrorBoundary with proper React import
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Task Modal Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h2 className="text-xl font-semibold text-red-600 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              The note modal encountered an error. Please try refreshing the page.
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}