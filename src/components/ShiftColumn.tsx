import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, CheckCircle2, ClipboardList, Trash2, AlertTriangle, Check } from 'lucide-react';
import { Shift, Task, Part, Worker } from '../types';
import TaskCard from './TaskCard';
import StartOfShiftChecklist from './StartOfShiftChecklist';
import EndOfShiftCleanup from './EndOfShiftCleanup';
import { useShopStore } from '../store/useShopStore';

interface ShiftColumnProps {
  shift: Shift;
  tasks: (Task & { part: Part; workers: Worker[] })[];
  onTaskClick: (taskId: string) => void;
  onAddTask: (shiftId: string) => void;
  onMoveBack?: (taskId: string) => void;
  onMoveForward?: (taskId: string) => void;
}

const ShiftColumn: React.FC<ShiftColumnProps> = ({ 
  shift, 
  tasks, 
  onTaskClick,
  onAddTask,
  onMoveBack,
  onMoveForward
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'startChecklist' | 'endCleanup'>('tasks');
  const { 
    deleteTask, 
    selectedDate, 
    isStartChecklistComplete, 
    isEndCleanupComplete 
  } = useShopStore();
  
  // CRITICAL: Only evaluate checklists if there are actual tasks for this shift
  const hasTasksForShift = tasks.length > 0;
  
  // CRITICAL: Only check checklist completion if tasks exist for this shift
  const startChecklistComplete = hasTasksForShift ? isStartChecklistComplete(shift.id, selectedDate) : true;
  const endCleanupComplete = hasTasksForShift ? isEndCleanupComplete(shift.id, selectedDate) : true;
  
  // CRITICAL: Only show incomplete warning if there are tasks AND checklists are incomplete
  const hasIncompleteChecklists = hasTasksForShift && (!startChecklistComplete || !endCleanupComplete);
  
  // CRITICAL: Get shift background color - ONLY red if tasks exist and checklists incomplete
  const getShiftColor = () => {
    if (hasIncompleteChecklists) {
      return 'bg-error-700'; // Red for any shift type when tasks exist and checklists incomplete
    }
    
    // Normal colors when no tasks OR checklists complete
    const normalColors = {
      'S1': 'bg-primary-700',
      'S2': 'bg-secondary-700', 
      'S3': 'bg-neutral-700',
    };
    return normalColors[shift.type as keyof typeof normalColors] || 'bg-primary-700';
  };

  const handleTabChange = (tab: 'tasks' | 'startChecklist' | 'endCleanup') => {
    setActiveTab(tab);
    setIsCollapsed(false);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all tasks in this shift? This action cannot be undone.')) {
      tasks.forEach(task => deleteTask(task.id));
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-neutral-100 rounded-lg shadow-sm">
      <div className={`${getShiftColor()} text-white p-3 rounded-t-lg relative`}>
        {/* CRITICAL: Warning Icon - Only show if tasks exist and checklists incomplete */}
        {hasIncompleteChecklists && (
          <div className="absolute top-2 right-2">
            <AlertTriangle className="h-5 w-5 text-yellow-300 animate-pulse" />
          </div>
        )}
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <h3 className="font-semibold">Shift {shift.type}</h3>
            <div className="ml-2 text-xs bg-white/20 py-1 px-2 rounded flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {shift.startTime} - {shift.endTime}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm">
              {tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'}
            </span>
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 hover:bg-white/20 rounded"
            >
              {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          </div>
        </div>

        {/* CRITICAL: Checklist Status Indicators - Only show if tasks exist */}
        {hasTasksForShift && (
          <div className="mb-2 flex items-center space-x-2 text-xs">
            {startChecklistComplete && (
              <div className="flex items-center bg-success-600 px-2 py-1 rounded">
                <Check className="h-3 w-3 mr-1" />
                Start Complete
              </div>
            )}
            {endCleanupComplete && (
              <div className="flex items-center bg-success-600 px-2 py-1 rounded">
                <Check className="h-3 w-3 mr-1" />
                End Complete
              </div>
            )}
            {hasIncompleteChecklists && (
              <div className="flex items-center bg-error-500 px-2 py-1 rounded">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Action Required
              </div>
            )}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-2 mt-2">
          <button
            onClick={() => handleTabChange('tasks')}
            className={`px-3 py-1.5 rounded text-sm flex items-center ${
              activeTab === 'tasks' 
                ? 'bg-white text-neutral-800' 
                : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            Tasks
          </button>
          <button
            onClick={() => handleTabChange('startChecklist')}
            className={`px-3 py-1.5 rounded text-sm flex items-center ${
              activeTab === 'startChecklist' 
                ? 'bg-white text-neutral-800' 
                : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            <CheckCircle2 className={`h-4 w-4 mr-1 ${hasTasksForShift && startChecklistComplete ? 'text-success-600' : ''}`} />
            Start
            {hasTasksForShift && startChecklistComplete && (
              <Check className="h-3 w-3 ml-1 text-success-600" />
            )}
          </button>
          <button
            onClick={() => handleTabChange('endCleanup')}
            className={`px-3 py-1.5 rounded text-sm flex items-center ${
              activeTab === 'endCleanup' 
                ? 'bg-white text-neutral-800' 
                : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            <ClipboardList className={`h-4 w-4 mr-1 ${hasTasksForShift && endCleanupComplete ? 'text-success-600' : ''}`} />
            End
            {hasTasksForShift && endCleanupComplete && (
              <Check className="h-3 w-3 ml-1 text-success-600" />
            )}
          </button>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="flex-grow p-3 overflow-y-auto">
          {activeTab === 'tasks' && (
            <div className="space-y-3">
              {tasks.length > 0 ? (
                <>
                  <div className="flex justify-end">
                    <button
                      onClick={handleClearAll}
                      className="flex items-center px-3 py-1.5 text-sm text-error-600 hover:bg-error-50 rounded-md transition-colors"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear All
                    </button>
                  </div>
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onClick={() => onTaskClick(task.id)}
                        onMoveBack={onMoveBack ? () => onMoveBack(task.id) : undefined}
                        onMoveForward={onMoveForward ? () => onMoveForward(task.id) : undefined}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-neutral-400 text-center p-4">
                  <p>No tasks for this shift</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'startChecklist' && (
            <div>
              {hasTasksForShift && startChecklistComplete ? (
                <div className="bg-success-50 border border-success-200 rounded-lg p-4 text-center">
                  <CheckCircle2 className="h-12 w-12 text-success-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-success-800 mb-2">
                    Start of Shift Checklist Complete
                  </h3>
                  <p className="text-success-700">
                    The start of shift checklist has been completed for this shift.
                  </p>
                </div>
              ) : !hasTasksForShift ? (
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 text-center">
                  <CheckCircle2 className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-neutral-600 mb-2">
                    No Tasks Yet
                  </h3>
                  <p className="text-neutral-500">
                    Add tasks to this shift to enable the start of shift checklist.
                  </p>
                </div>
              ) : (
                <StartOfShiftChecklist
                  shiftId={shift.id}
                  selectedDate={selectedDate}
                  onComplete={() => setActiveTab('tasks')}
                />
              )}
            </div>
          )}

          {activeTab === 'endCleanup' && (
            <div>
              {hasTasksForShift && endCleanupComplete ? (
                <div className="bg-success-50 border border-success-200 rounded-lg p-4 text-center">
                  <CheckCircle2 className="h-12 w-12 text-success-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-success-800 mb-2">
                    End of Shift Cleanup Complete
                  </h3>
                  <p className="text-success-700">
                    The end of shift cleanup has been completed for this shift.
                  </p>
                </div>
              ) : !hasTasksForShift ? (
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 text-center">
                  <ClipboardList className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-neutral-600 mb-2">
                    No Tasks Yet
                  </h3>
                  <p className="text-neutral-500">
                    Add tasks to this shift to enable the end of shift cleanup.
                  </p>
                </div>
              ) : (
                <EndOfShiftCleanup
                  shiftId={shift.id}
                  selectedDate={selectedDate}
                  onComplete={() => setActiveTab('tasks')}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ShiftColumn;