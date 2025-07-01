import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, Clock, User, Tag, Info, AlertTriangle, Play, Square,
  Trash2, Printer, Plus, RefreshCw, MessageSquarePlus
} from 'lucide-react';
import { format, formatDistanceToNow, formatDuration, intervalToDuration } from 'date-fns';
import { Task, TaskStatus, TaskPriority, Worker, Part } from '../types';
import { useShopStore } from '../store/useShopStore';
import WorkOrderValidator from './WorkOrderValidator';
import NotesExporter from './NotesExporter';

interface TaskFormData {
  workOrderNumber: string;
  description: string;
  assignedWorkers: string[];
  status: TaskStatus;
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string | null;
  mode: 'view' | 'edit' | 'create';
  shiftId?: string;
  selectedDate: string;
}

const TaskModal: React.FC<TaskModalProps> = ({ 
  isOpen, 
  onClose, 
  taskId,
  mode, 
  shiftId,
  selectedDate 
}) => {
  const { 
    workers,
    shifts,
    addTask,
    updateTaskStatus,
    assignWorkerToTask,
    removeWorkerFromTask,
    addTaskNote,
    getExpandedTask,
    getTaskNotesByTaskId,
    startTaskTimer,
    stopTaskTimer,
    carryOverTask,
    deleteTask,
    printTask,
    addManualWorker,
    deleteWorker
  } = useShopStore();
  
  const [manualWorkerName, setManualWorkerName] = useState('');
  const [noteText, setNoteText] = useState('');
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isWorkOrderValid, setIsWorkOrderValid] = useState(false);
  const [existingTask, setExistingTask] = useState<any>(null);
  
  const task = taskId ? getExpandedTask(taskId) : null;
  const taskNotes = taskId ? getTaskNotesByTaskId(taskId) : [];
  
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<TaskFormData>({
    defaultValues: {
      workOrderNumber: '',
      description: '',
      assignedWorkers: [],
      status: TaskStatus.PENDING
    }
  });

  useEffect(() => {
    if (task && (mode === 'view' || mode === 'edit')) {
      setValue('workOrderNumber', task.workOrderNumber);
      setValue('description', task.description);
      setValue('assignedWorkers', task.assignedWorkers);
      setValue('status', task.status);
    } else {
      reset();
    }
  }, [task, mode, reset, setValue]);

  const handleAddNote = () => {
    if (taskId && noteText.trim()) {
      const workerId = workers[0].id;
      
      addTaskNote({
        taskId,
        workerId,
        noteText: noteText.trim()
      });
      
      setNoteText('');
    }
  };

  const onSubmit = (data: TaskFormData) => {
    if (mode === 'create' && !isWorkOrderValid) {
      alert('Please enter a valid work order number that is not already in use.');
      return;
    }
    
    if (mode === 'create' && shiftId) {
      const newTask = addTask({
        workOrderNumber: data.workOrderNumber,
        description: data.description,
        estimatedDuration: 60, // Default value since we removed the field
        priority: TaskPriority.MEDIUM, // Default value since we removed the field
        assignedWorkers: data.assignedWorkers || [],
        shiftId,
        createdAt: selectedDate
      });
      
      onClose();
    } else if (mode === 'edit' && task) {
      if (data.status !== task.status) {
        updateTaskStatus(task.id, data.status);
      }
      
      const currentWorkers = new Set(task.assignedWorkers);
      const newWorkers = new Set(data.assignedWorkers);
      
      for (const workerId of newWorkers) {
        if (!currentWorkers.has(workerId)) {
          assignWorkerToTask(task.id, workerId);
        }
      }
      
      for (const workerId of currentWorkers) {
        if (!newWorkers.has(workerId)) {
          removeWorkerFromTask(task.id, workerId);
        }
      }
      
      onClose();
    }
  };

  const handleDelete = () => {
    if (task && window.confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      deleteTask(task.id);
      onClose();
    }
  };

  const handleCarryOver = () => {
    if (task) {
      const currentShiftIndex = shifts.findIndex(s => s.id === task.shiftId);
      const nextShiftIndex = (currentShiftIndex + 1) % shifts.length;
      const nextShiftId = shifts[nextShiftIndex].id;
      
      carryOverTask(task.id, nextShiftId);
      onClose();
    }
  };

  const handlePrint = () => {
    if (task) {
      printTask(task.id);
    }
  };

  const handleDeleteWorker = (workerId: string) => {
    if (window.confirm('Are you sure you want to delete this worker? This will remove them from all assigned notes.')) {
      deleteWorker(workerId);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 overflow-auto z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-8">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">
              {mode === 'create' ? 'Add New Notes' : 
               mode === 'edit' ? 'Edit Notes' : 'Notes Details'}
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(100vh-16rem)]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Work Order Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Work Order Number *
              </label>
              <input
                type="text"
                {...register('workOrderNumber', { required: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={mode === 'view'}
              />
              {mode === 'create' && (
                <WorkOrderValidator
                  workOrderNumber={watch('workOrderNumber') || ''}
                  onValidation={(isValid, existing) => {
                    setIsWorkOrderValid(isValid);
                    setExistingTask(existing);
                  }}
                />
              )}
            </div>

            {/* Notes Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                {...register('description', { required: true })}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={mode === 'view'}
                placeholder="Enter detailed notes about the work order, setup requirements, special instructions, etc."
              />
            </div>

            {/* Assigned Workers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned Workers
              </label>
              
              {mode !== 'view' && (
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={manualWorkerName}
                    onChange={(e) => setManualWorkerName(e.target.value)}
                    placeholder="Enter worker name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (manualWorkerName.trim()) {
                        const currentShiftId = task?.shiftId || shiftId;
                        if (currentShiftId) {
                          const workerId = addManualWorker(manualWorkerName.trim(), currentShiftId);
                          const currentWorkers = watch('assignedWorkers') || [];
                          setValue('assignedWorkers', [...currentWorkers, workerId]);
                          setManualWorkerName('');
                        }
                      }
                    }}
                    disabled={!manualWorkerName.trim()}
                    className="px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}
              
              <div className="border border-gray-300 rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                {workers.map(worker => (
                  <div key={worker.id} className="flex items-center justify-between">
                    <label className="flex items-center flex-1">
                      <input
                        type="checkbox"
                        value={worker.id}
                        {...register('assignedWorkers')}
                        disabled={mode === 'view'}
                        className="mr-2"
                      />
                      <span>
                        {worker.name} ({worker.role})
                        {worker.isManual && <span className="ml-1 text-sm text-gray-500">(Manual)</span>}
                      </span>
                    </label>
                    {mode !== 'view' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteWorker(worker.id)}
                        className="p-1 text-error-600 hover:bg-error-50 rounded-md"
                        title="Delete Worker"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                {workers.length === 0 && (
                  <div className="text-center text-gray-500 py-2">
                    No workers added yet
                  </div>
                )}
              </div>
            </div>

            {/* Additional Notes (View Mode Only) */}
            {mode === 'view' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Additional Notes</h3>
                  <div className="flex items-center space-x-2">
                    <NotesExporter taskId={taskId} />
                    <button
                      type="button"
                      onClick={() => setNoteText('')}
                      className="text-primary-600 hover:text-primary-700 flex items-center"
                    >
                      <MessageSquarePlus className="h-5 w-5 mr-1" />
                      Add Note
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {taskNotes.map((note) => (
                    <div
                      key={note.id}
                      className="bg-neutral-50 p-3 rounded-md border border-neutral-200"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-medium text-sm text-neutral-700">
                          {workers.find(w => w.id === note.workerId)?.name || 'Unknown Worker'}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {formatDistanceToNow(new Date(note.timestamp), { addSuffix: true })}
                        </div>
                      </div>
                      <p className="text-sm text-neutral-600">{note.noteText}</p>
                    </div>
                  ))}

                  {taskNotes.length === 0 && (
                    <div className="text-center text-neutral-500 py-4">
                      No additional notes yet
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add an additional note..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={handleAddNote}
                    disabled={!noteText.trim()}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    Add Note
                  </button>
                </div>
              </div>
            )}

            {/* Time Tracking (View Mode Only) */}
            {mode === 'view' && task && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Time Tracking</h3>
                
                {task.timeLogs && task.timeLogs.length > 0 ? (
                  <div className="space-y-3">
                    {task.timeLogs.map((log) => (
                      <div key={log.id} className="bg-neutral-50 p-3 rounded-md border">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-sm">
                              {workers.find(w => w.id === log.workerId)?.name || 'Unknown Worker'}
                            </div>
                            <div className="text-sm text-neutral-600">
                              Started: {format(new Date(log.startTime), 'MMM d, yyyy HH:mm')}
                            </div>
                            {log.endTime && (
                              <div className="text-sm text-neutral-600">
                                Ended: {format(new Date(log.endTime), 'MMM d, yyyy HH:mm')}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            {log.duration ? (
                              <div className="text-sm font-medium">
                                {log.duration} minutes
                              </div>
                            ) : (
                              <div className="text-sm text-primary-600 font-medium">
                                Running...
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-neutral-500 py-4">
                    No time logs recorded
                  </div>
                )}

                {task.activeTimeLog && (
                  <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-primary-800">Timer Running</div>
                        <div className="text-sm text-primary-600">
                          Started {formatDistanceToNow(new Date(task.activeTimeLog.startTime), { addSuffix: true })}
                        </div>
                      </div>
                      <button
                        onClick={() => stopTaskTimer(task.id)}
                        className="px-4 py-2 bg-error-600 text-white rounded-md hover:bg-error-700 flex items-center"
                      >
                        <Square className="h-4 w-4 mr-2" />
                        Stop Timer
                      </button>
                    </div>
                  </div>
                )}

                {!task.activeTimeLog && task.workers.length > 0 && (
                  <button
                    onClick={() => startTaskTimer(task.id, task.workers[0].id)}
                    className="px-4 py-2 bg-success-600 text-white rounded-md hover:bg-success-700 flex items-center mt-4"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Timer
                  </button>
                )}
              </div>
            )}
          </form>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-lg">
          <div className="flex justify-end space-x-2">
            {mode === 'view' ? (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
                
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-neutral-600 text-white rounded-md hover:bg-neutral-700 flex items-center"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </button>
                
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-error-600 text-white rounded-md hover:bg-error-700 flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </button>
                
                {task?.status !== TaskStatus.COMPLETED && (
                  <>
                    <button
                      onClick={() => {
                        if (task) updateTaskStatus(task.id, TaskStatus.COMPLETED);
                        onClose();
                      }}
                      className="px-4 py-2 bg-success-600 text-white rounded-md hover:bg-success-700 flex items-center"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Mark Complete
                    </button>
                    <button
                      onClick={handleCarryOver}
                      className="px-4 py-2 bg-accent-600 text-white rounded-md hover:bg-accent-700 flex items-center"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Carry to Next Shift
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit(onSubmit)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  disabled={mode === 'create' && !isWorkOrderValid}
                >
                  {mode === 'create' ? 'Create Notes' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;