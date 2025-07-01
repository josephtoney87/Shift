import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Clock, AlertTriangle, User, Package } from 'lucide-react';
import { Task, Worker, Part } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  task?: Task | null;
  workers: Worker[];
  parts: Part[];
  shiftId?: string;
}

export default function TaskModal({
  isOpen,
  onClose,
  onSave,
  task,
  workers = [],
  parts = [],
  shiftId
}: TaskModalProps) {
  const [formData, setFormData] = useState({
    description: '',
    estimated_duration: 60,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    part_id: '',
    status: 'pending' as 'pending' | 'in_progress' | 'completed',
    shift_id: shiftId || ''
  });

  const [assignedWorkers, setAssignedWorkers] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (task) {
      setFormData({
        description: task.description || '',
        estimated_duration: task.estimated_duration || 60,
        priority: task.priority || 'medium',
        part_id: task.part_id || '',
        status: task.status || 'pending',
        shift_id: task.shift_id || shiftId || ''
      });
      setAssignedWorkers([]);
      setNotes('');
    } else {
      setFormData({
        description: '',
        estimated_duration: 60,
        priority: 'medium',
        part_id: '',
        status: 'pending',
        shift_id: shiftId || ''
      });
      setAssignedWorkers([]);
      setNotes('');
    }
  }, [task, shiftId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const taskData = {
      ...formData,
      id: task?.id
    };

    onSave(taskData);
    onClose();
  };

  const handleWorkerToggle = (workerId: string) => {
    setAssignedWorkers(prev => 
      prev.includes(workerId)
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  const canSubmit = formData.description.trim().length > 0 && formData.estimated_duration > 0;

  const priorityColors = {
    low: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    urgent: 'bg-red-100 text-red-800 border-red-200'
  };

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
              {task ? 'Edit Task' : 'Create New Task'}
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
            {/* Task Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter detailed task description..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                required
              />
            </div>

            {/* Part Selection */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Package className="w-4 h-4 mr-2" />
                Associated Part
              </label>
              <select
                value={formData.part_id}
                onChange={(e) => setFormData(prev => ({ ...prev, part_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a part (optional)</option>
                {parts.map(part => (
                  <option key={part.id} value={part.id}>
                    {part.part_number} - Rev {part.revision} ({part.material})
                  </option>
                ))}
              </select>
            </div>

            {/* Priority and Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>
                <div className={`mt-2 px-3 py-1 rounded-md text-xs font-medium border ${priorityColors[formData.priority]} inline-block`}>
                  {formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)}
                </div>
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 mr-2" />
                  Estimated Duration (minutes)
                </label>
                <input
                  type="number"
                  value={formData.estimated_duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration: parseInt(e.target.value) || 0 }))}
                  min="1"
                  step="15"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  {Math.floor(formData.estimated_duration / 60)}h {formData.estimated_duration % 60}m
                </p>
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

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes or instructions..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
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
              {task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}