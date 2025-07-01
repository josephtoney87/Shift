import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, User, FileText, ClipboardList } from 'lucide-react';
import { Task } from '../types';
import { useShopStore } from '../store/useShopStore';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId?: string | null;
  shiftId?: string;
}

export default function TaskModal({
  isOpen,
  onClose,
  taskId,
  shiftId
}: TaskModalProps) {
  const { 
    tasks, 
    workers, 
    parts, 
    addTask, 
    updateTask, 
    currentUser 
  } = useShopStore();
  
  const task = taskId ? tasks.find(t => t.id === taskId) : null;
  
  const [formData, setFormData] = useState({
    description: '',
    workOrderNumber: '',
    status: 'pending' as 'pending' | 'in_progress' | 'completed',
    shiftId: shiftId || ''
  });

  const [assignedWorkers, setAssignedWorkers] = useState<string[]>([]);
  const [checklistItems, setChecklistItems] = useState<string[]>(['']);

  useEffect(() => {
    if (task) {
      setFormData({
        description: task.description || '',
        workOrderNumber: task.workOrderNumber || '',
        status: task.status || 'pending',
        shiftId: task.shiftId || shiftId || ''
      });
      setAssignedWorkers([]);
      setChecklistItems(['']);
    } else {
      setFormData({
        description: '',
        workOrderNumber: '',
        status: 'pending',
        shiftId: shiftId || ''
      });
      setAssignedWorkers([]);
      setChecklistItems(['']);
    }
  }, [task, shiftId, taskId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (task && taskId) {
      // Update existing task
      updateTask(taskId, {
        description: formData.description,
        workOrderNumber: formData.workOrderNumber,
        status: formData.status,
        shiftId: formData.shiftId
      });
    } else {
      // Create new task
      addTask({
        workOrderNumber: formData.workOrderNumber || `WO-${Date.now()}`,
        description: formData.description,
        status: formData.status,
        shiftId: formData.shiftId,
        assignedWorkers: assignedWorkers,
        createdBy: currentUser?.id || 'unknown'
      });
    }
    
    onClose();
  };

  const handleWorkerToggle = (workerId: string) => {
    setAssignedWorkers(prev => 
      prev.includes(workerId)
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  const addChecklistItem = () => {
    setChecklistItems(prev => [...prev, '']);
  };

  const updateChecklistItem = (index: number, value: string) => {
    setChecklistItems(prev => prev.map((item, i) => i === index ? value : item));
  };

  const removeChecklistItem = (index: number) => {
    setChecklistItems(prev => prev.filter((_, i) => i !== index));
  };

  const canSubmit = formData.description.trim().length > 0 && formData.workOrderNumber.trim().length > 0;</parameter>

  const statusColors = {
    pending: 'bg-gray-100 text-gray-800 border-gray-200',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
    completed: 'bg-green-100 text-green-800 border-green-200'
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form id="task-form" onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">
              {task ? 'Edit Notes & Checklist' : 'Create New Notes & Checklist'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Work Order */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 mr-2" />
                Work Order *
              </label>
              <input
                type="text"
                value={formData.workOrderNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, workOrderNumber: e.target.value }))}
                placeholder="Enter work order number..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Notes */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 mr-2" />
                Notes *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter detailed notes..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                required
              />
            </div>

            {/* Checklist */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Checklist
                </label>
                <button
                  type="button"
                  onClick={addChecklistItem}
                  className="flex items-center px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </button>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {checklistItems.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateChecklistItem(index, e.target.value)}
                      placeholder="Enter checklist item..."
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    />
                    {checklistItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeChecklistItem(index)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <div className={`mt-2 px-3 py-1 rounded-md text-xs font-medium border ${statusColors[formData.status]} inline-block`}>
                {formData.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
            </div>

            {/* Assigned Workers */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                <User className="w-4 h-4 mr-2" />
                Assigned Workers
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {workers.map(worker => (
                  <label key={worker.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={assignedWorkers.includes(worker.id)}
                      onChange={() => handleWorkerToggle(worker.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">{worker.name}</span>
                      <span className="text-xs text-gray-500 ml-2">({worker.role})</span>
                    </div>
                  </label>
                ))}
                {workers.length === 0 && (
                  <div className="text-center text-gray-500 py-2">
                    No workers added yet
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`px-6 py-2 text-sm font-medium text-white rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                canSubmit
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {task ? 'Update Notes' : 'Create Notes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}