import React from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, UserCircle, CheckCircle2, AlertTriangle, AlertCircle, 
  Square, RotateCcw, ArrowLeftCircle, ArrowRightCircle, RefreshCw, ArrowRight, Calendar
} from 'lucide-react';
import { TaskStatus, Task, Worker, Part } from '../types';
import { useShopStore } from '../store/useShopStore';
import { format, addDays, parseISO } from 'date-fns';
import Tooltip from './Tooltip';

interface TaskCardProps {
  task: Task & { 
    part: Part;
    workers: Worker[];
  };
  onClick: () => void;
  onMoveBack?: () => void;
  onMoveForward?: () => void;
  shiftType?: string;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onClick,
  onMoveBack,
  onMoveForward,
  shiftType
}) => {
  const { updateTaskStatus, moveTaskToNextDay } = useShopStore();

  const statusConfig = {
    [TaskStatus.PENDING]: { 
      color: 'bg-neutral-100 text-neutral-700 border-neutral-300', 
      label: 'Pending' 
    },
    [TaskStatus.IN_PROGRESS]: { 
      color: 'bg-primary-100 text-primary-700 border-primary-300', 
      label: 'In Progress' 
    },
    [TaskStatus.COMPLETED]: { 
      color: 'bg-success-100 text-success-700 border-success-300', 
      label: 'Completed' 
    }
  };

  const handleContinueTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateTaskStatus(task.id, TaskStatus.IN_PROGRESS);
  };

  const handleAddBack = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateTaskStatus(task.id, TaskStatus.PENDING);
  };

  const handleMoveTask = (e: React.MouseEvent, direction: 'back' | 'forward') => {
    e.stopPropagation();
    if (direction === 'back' && onMoveBack) {
      onMoveBack();
    } else if (direction === 'forward' && onMoveForward) {
      onMoveForward();
    }
  };

  const handleMoveToNextDay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextDay = format(addDays(parseISO(task.createdAt), 1), 'MMMM d, yyyy');
    if (window.confirm(`Move this note to tomorrow (${nextDay}) first shift?`)) {
      moveTaskToNextDay(task.id);
    }
  };

  const getThemeClasses = (baseClasses: string) => {
    switch (themeMode) {
      case ThemeMode.DARK:
        return baseClasses.replace(/bg-white/g, 'bg-gray-800')
                         .replace(/text-neutral-800/g, 'text-white')
                         .replace(/text-neutral-600/g, 'text-gray-400')
                         .replace(/text-neutral-500/g, 'text-gray-500')
                         .replace(/text-neutral-400/g, 'text-gray-600')
                         .replace(/border-neutral-200/g, 'border-gray-700')
                         .replace(/hover:border-primary-300/g, 'hover:border-red-500')
                         .replace(/bg-neutral-100/g, 'bg-gray-700')
                         .replace(/text-neutral-700/g, 'text-gray-300');
      case ThemeMode.INVERT:
        return baseClasses; // Keep cards white in invert mode
      case ThemeMode.LIGHT:
      default:
        return baseClasses;
    }
  };

  return (
    <motion.div 
      className={getThemeClasses("bg-white rounded-lg shadow-md overflow-hidden cursor-pointer border border-neutral-200 hover:border-primary-300 transition-all duration-200")}
      onClick={onClick}
      whileHover={{ scale: 1.01, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      layout
    >
      <div className="p-4">
        {task.carriedOverFromTaskId && (
          <div className={getThemeClasses("mb-2 text-xs font-medium bg-accent-100 text-accent-700 py-1 px-2 rounded inline-flex items-center")}>
            <span>Carried Over</span>
          </div>
        )}
        
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className={getThemeClasses("text-lg font-semibold text-neutral-800 truncate")}>
              {task.workOrderNumber}
            </h3>
            <div className={getThemeClasses("text-sm text-neutral-600")}>
              {task.part.partNumber}
            </div>
          </div>
        </div>
        
        <p className={getThemeClasses("text-neutral-600 text-sm mb-3 line-clamp-3")}>{task.description}</p>
        
        <div className={getThemeClasses("flex items-center justify-between text-sm text-neutral-500 mb-4")}>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            <span>Notes</span>
          </div>
        </div>
        
        <div className={getThemeClasses("border-t border-neutral-200 pt-3")}>
          <div className="flex flex-wrap gap-2 mb-3">
            {task.workers?.map((worker) => (
              <div key={worker.id} className={getThemeClasses("inline-flex items-center bg-neutral-100 px-2 py-1 rounded text-xs")}>
                <UserCircle className="h-3 w-3 mr-1" />
                <span>{worker.name}</span>
                <span className="ml-1 text-neutral-400">({worker.role})</span>
              </div>
            ))}
            {task.workers?.length === 0 && (
              <div className={getThemeClasses("text-xs text-neutral-400")}>No workers assigned</div>
            )}
          </div>
          
          <div className="flex justify-between items-center">
            <div className={`text-xs font-medium ${statusConfig[task.status].color} border py-1 px-2 rounded-full`}>
              {statusConfig[task.status].label}
            </div>
            
            <div className="flex items-center space-x-2">
              {onMoveBack && (
                <Tooltip content="Move to previous shift" position="top">
                  <button
                    onClick={(e) => handleMoveTask(e, 'back')}
                    className="p-1.5 rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  >
                    <ArrowLeftCircle className="h-4 w-4" />
                  </button>
                </Tooltip>
              )}

              {task.status === TaskStatus.COMPLETED && (
                <Tooltip content="Mark as pending to work on again" position="top">
                  <button
                    onClick={handleAddBack}
                    className="p-1.5 rounded-full bg-warning-100 text-warning-600 hover:bg-warning-200 flex items-center"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    <span className="text-xs">Add Back</span>
                  </button>
                </Tooltip>
              )}

              {task.status === TaskStatus.COMPLETED && (
                <Tooltip content="Continue working on this completed note" position="top">
                  <button
                    onClick={handleContinueTask}
                    className="p-1.5 rounded-full bg-primary-100 text-primary-600 hover:bg-primary-200 flex items-center"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    <span className="text-xs">Continue</span>
                  </button>
                </Tooltip>
              )}

              {/* Next Day Button - Only show for third shift (S3) */}
              {shiftType === 'S3' && (
                <Tooltip content="Move to tomorrow's first shift" position="top">
                  <button
                    onClick={handleMoveToNextDay}
                    className="p-1.5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center"
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    <span className="text-xs">Next Day</span>
                  </button>
                </Tooltip>
              )}
              
              {task.status === TaskStatus.COMPLETED && (
                <CheckCircle2 className="h-5 w-5 text-success-500" />
              )}

              {onMoveForward && (
                <Tooltip content="Move to next shift" position="top">
                  <button
                    onClick={(e) => handleMoveTask(e, 'forward')}
                    className="p-1.5 rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  >
                    <ArrowRightCircle className="h-4 w-4" />
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TaskCard;