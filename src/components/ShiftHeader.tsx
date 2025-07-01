import React, { useState } from 'react';
import { format, isAfter, startOfDay } from 'date-fns';
import { Calendar, Plus, AlertCircle } from 'lucide-react';
import { useShopStore } from '../store/useShopStore';
import { ShiftType, TaskStatus, TaskPriority } from '../types';
import SyncStatusIndicator from './SyncStatusIndicator';
import DeviceIndicator from './DeviceIndicator';
import Tooltip from './Tooltip';

interface ShiftHeaderProps {
  onDateChange: (date: string) => void;
}

const ShiftHeader: React.FC<ShiftHeaderProps> = ({ onDateChange }) => {
  const { 
    selectedDate, 
    shifts, 
    addShift,
    getTaskSummaryForDate,
    tasks
  } = useShopStore();
  
  const [showAddShift, setShowAddShift] = useState(false);
  const [newShift, setNewShift] = useState({
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
    addShift(newShift);
    setShowAddShift(false);
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
    <header className="bg-red-800 text-white p-4 shadow-md">
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
                      : 'bg-red-700 border-red-600'
                  } focus:outline-none focus:ring-2 focus:ring-red-500`}
                />
              </div>
            </Tooltip>
            
            <div className="flex space-x-2">
              {shifts.map((shift) => (
                <Tooltip
                  key={shift.id}
                  content="Shows the current shift and its hours. Select to change the shift view"
                  position="bottom"
                >
                  <div className="flex flex-col items-center bg-red-700 p-2 rounded-md">
                    <span className="font-semibold">Shift {shift.type}</span>
                    <span className="text-sm text-red-200">
                      {shift.startTime} - {shift.endTime}
                    </span>
                  </div>
                </Tooltip>
              ))}
              
              <Tooltip content="Add a new shift with custom hours" position="bottom">
                <button
                  onClick={() => setShowAddShift(true)}
                  className="p-2 bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Add Shift Modal */}
        {showAddShift && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Shift</h2>
              
              <form onSubmit={handleAddShift} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shift Type
                  </label>
                  <select
                    value={newShift.type}
                    onChange={(e) => setNewShift({ ...newShift, type: e.target.value as ShiftType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-800"
                  >
                    {Object.values(ShiftType).map((type) => (
                      <option key={type} value={type}>
                        Shift {type}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={newShift.startTime}
                    onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-800"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={newShift.endTime}
                    onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-800"
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddShift(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
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