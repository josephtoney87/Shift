import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, Trash2 } from 'lucide-react';
import { Shift, Task, Part, Worker } from '../types';
import TaskCard from './TaskCard';
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
  const { deleteTask } = useShopStore();

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all tasks in this shift? This action cannot be undone.')) {
      tasks.forEach(task => deleteTask(task.id));
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-neutral-100 rounded-lg shadow-sm">
      <div className={`bg-primary-700 text-white p-3 rounded-t-lg relative`}>
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
      </div>
      
      {!isCollapsed && (
        <div className="flex-grow p-3 overflow-y-auto">
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
        </div>
      )}
    </div>
  );
};

export default ShiftColumn;