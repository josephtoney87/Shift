import React, { useState } from 'react';
import { format, isAfter, startOfDay } from 'date-fns';
import { Calendar, Plus, AlertCircle, Trash2, X } from 'lucide-react';
import { useShopStore } from '../store/useShopStore';
import { ShiftType, TaskStatus, TaskPriority } from '../types';
import SyncStatusIndicator from './SyncStatusIndicator';
import DeviceIndicator from './DeviceIndicator';
import DarkModeToggle from './DarkModeToggle';
import Tooltip from './Tooltip';

interface ShiftHeaderProps {
  onDateChange: (date: string) => void;
}

const ShiftHeader: React.FC<ShiftHeaderProps> = ({ onDateChange }) => {
  const { 
    selectedDate, 
    shifts, 
    addShift,
    deleteShift,
    getTaskSummaryForDate,
    tasks
  } = useShopStore();
  
  const [showAddShift, setShowAddShift] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showEditShift, setShowEditShift] = useState<string | null>(null);
  const [newShift, setNewShift] = useState({
    type: ShiftType.S1,
    startTime: '06:00',
    endTime: '14:00'
  });

  const [editShift, setEditShift] = useState({
    type: ShiftType.S1,
    startTime: '06:00',
    endTime: '14:00'
  });

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    onDateChange(newDate);
  };

  const handleAddShift = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      addShift(newShift);
      setShowAddShift(false);
      setNewShift({
        type: ShiftType.S1,
        startTime: '06:00',
        endTime: '14:00'
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to add shift');
    }
  };

  const handleEditShift = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!showEditShift) return;
    
    try {
      updateShift(showEditShift, editShift);
      setShowEditShift(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update shift');
    }
  };

  const openEditShift = (shift: any) => {
    setEditShift({
      type: shift.type,
      startTime: shift.startTime,
      endTime: shift.endTime
    });
    setShowEditShift(shift.id);
  };

  const handleDeleteShift = (shiftId: string) => {
    deleteShift(shiftId);
    setShowDeleteConfirm(null);
  };
  // Get task count for date highlighting
  const taskSummary = getTaskSummaryForDate(selectedDate);
  const hasTasksForDate = taskSummary.total > 0;

  // Style the calendar input to highlight dates with tasks
  const style = document.createElement('style');
  const datesWithTasks = new Set(
    tasks.map(task => task.createdAt.split('T')[0])
  );

  // Create CSS rules for highlighting dates with tasks
  const highlightRules = Array.from(datesWithTasks).map(date => `
    input[type="date"][value="${date}"],
    input[type="date"]::-webkit-calendar-picker-indicator:hover {
      background-color: #fef9c3;
      border-color: #eab308;
      color: #854d0e;
    }
  `).join('\n');

  style.textContent = `
    input[type="date"]::-webkit-calendar-picker-indicator {
      background-color: transparent;
      padding: 0.5rem;
      cursor: pointer;
      border-radius: 0.375rem;
      transition: all 0.2s;
    }
    ${highlightRules}
  `;

  // Add style to document head
  if (!document.head.contains(style)) {
    document.head.appendChild(style);
  }

  return (
    <header className="bg-red-800 dark:bg-red-900 text-white p-4 shadow-md transition-colors duration-200">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <img 
              src="/Updated OCD clear logo.png" 
              alt="OCD Logo" 
              className="h-12 w-auto mr-4"
            />
            <h1 className="text-2xl font-bold">CNC Shop Shift Management</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Dark Mode Toggle */}
            <DarkModeToggle />
            
            {/* Device Indicator */}
            <DeviceIndicator />
            
            {/* Sync Status Indicator */}
            <SyncStatusIndicator />
            
            <Tooltip content="Select the date to view or manage tasks for that shift" position="bottom">
              <div className="relative flex items-center group">
                <Calendar className="absolute left-3 text-red-200" size={18} />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className={`pl-10 pr-4 py-2 rounded-md border ${
                    hasTasksForDate 
                      ? 'bg-warning-100 border-warning-300 text-warning-900' 
                      : 'bg-red-700 dark:bg-red-800 border-red-600 dark:border-red-700'
                  } focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400`}
                />
              </div>
            </Tooltip>
            
            <div className="flex space-x-2">
              {shifts.map((shift) => (
                <div
                  key={shift.id}
                  className="relative group cursor-pointer"
                  onClick={() => openEditShift(shift)}
                >
                  <Tooltip
                    content="Click to edit shift times, or hover to see delete option"
                    position="bottom"
                  >
                    <div className="flex flex-col items-center bg-red-700 dark:bg-red-800 p-2 rounded-md relative hover:bg-red-600 dark:hover:bg-red-700 transition-colors">
                      <span className="font-semibold">Shift {shift.type}</span>
                      <span className="text-sm text-red-200 dark:text-red-300">
                        {shift.startTime} - {shift.endTime}
                      </span>
                      
                      {/* Delete button - only show if there are multiple shifts */}
                      {shifts.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(shift.id);
                          }}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          title="Delete this shift"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </Tooltip>
                </div>
              ))}
              
              <Tooltip content="Add a new shift with custom hours" position="bottom">
                <button
                  onClick={() => setShowAddShift(true)}
                  className="p-2 bg-red-600 dark:bg-red-700 rounded-md hover:bg-red-700 dark:hover:bg-red-800 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center mb-4">
                <Trash2 className="h-6 w-6 text-red-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Delete Shift</h2>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Are you sure you want to delete this shift?
                </p>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                  <div className="flex items-center text-red-800 dark:text-red-200">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <span className="font-medium">Warning:</span>
                  </div>
                  <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                    This will also delete all workers, notes, and related data for this shift. 
                    This action cannot be undone.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteShift(showDeleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Shift
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Shift Modal */}
        {showEditShift && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Edit Shift</h2>
              
              <form onSubmit={handleEditShift} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Shift Type
                  </label>
                  <select
                    value={editShift.type}
                    onChange={(e) => setEditShift({ ...editShift, type: e.target.value as ShiftType })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700"
                  >
                    {Object.values(ShiftType).map((type) => (
                      <option key={type} value={type}>
                        Shift {type}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={editShift.startTime}
                    onChange={(e) => setEditShift({ ...editShift, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={editShift.endTime}
                    onChange={(e) => setEditShift({ ...editShift, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700"
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowEditShift(null)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-800"
                  >
                    Update Shift
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Add Shift Modal */}
        {showAddShift && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Add New Shift</h2>
              
              <form onSubmit={handleAddShift} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Shift Type
                  </label>
                  {shifts.length >= 3 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Maximum number of shifts reached. Delete a shift to add a new one.
                    </p>
                  )}
                  <select
                    value={newShift.type}
                    onChange={(e) => setNewShift({ ...newShift, type: e.target.value as ShiftType })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700"
                    disabled={shifts.length >= 3}
                  >
                    {Object.values(ShiftType)
                      .filter(type => !shifts.some(s => s.type === type))
                      .map((type) => (
                        <option key={type} value={type}>
                          Shift {type}
                        </option>
                      ))
                    }
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={newShift.startTime}
                    onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={newShift.endTime}
                    onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700"
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddShift(false);
                      setNewShift({
                        type: ShiftType.S1,
                        startTime: '06:00',
                        endTime: '14:00'
                      });
                    }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={shifts.length >= 3 || shifts.some(s => s.type === newShift.type)}
                    className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-800"
                  >
                    Add Shift
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default ShiftHeader;