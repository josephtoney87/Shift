import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, CheckCircle2, ClipboardList, Trash2, AlertTriangle, Check } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'tasks'>('tasks');
  const { 
    deleteTask, 
    selectedDate
  } = useShopStore();

  const handleTabChange = (tab: 'tasks') => {
    setActiveTab(tab);
    setIsCollapsed(false);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all notes in this shift? This action cannot be undone.')) {
      tasks.forEach(task => deleteTask(task.id));
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-neutral-100 dark:bg-gray-800 rounded-lg shadow-sm transition-colors duration-200">
      <div className={`${
        shift.type === 'S1' ? 'bg-primary-700' :
        shift.type === 'S2' ? 'bg-secondary-700' :
        'bg-neutral-700'
      } dark:opacity-90 text-white p-3 rounded-t-lg relative transition-colors duration-200`}>
        
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
              {tasks.length} {tasks.length === 1 ? 'Note' : 'Notes'}
            </span>
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 hover:bg-white/20 rounded"
            >
              {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          </div>
        </div>

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
            Notes
          </button>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="flex-grow p-3 overflow-y-auto bg-white dark:bg-gray-700 transition-colors duration-200">
          {activeTab === 'tasks' && (
            <div className="space-y-3">
              {tasks.length > 0 ? (
                <>
                  <div className="flex justify-end">
                    <button
                      onClick={handleClearAll}
                      className="flex items-center px-3 py-1.5 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-md transition-colors"
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
                        shiftType={shift.type}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-neutral-400 dark:text-gray-500 text-center p-4">
                  <p>No notes for this shift</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ShiftColumn;