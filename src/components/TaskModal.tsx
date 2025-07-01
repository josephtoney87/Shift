import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, Clock, User, Tag, Info, AlertTriangle, Play, Square,
  Trash2, Printer, Plus, RefreshCw, MessageSquarePlus, CheckCircle2, ClipboardList
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
  // Checklist data
  startChecklist?: {
    workOrderNumber: string;
    palletNumber: string;
    partNumber: string;
    programNumber: string;
    startingBlockNumber: string;
    toolNumber: string;
    toolsRequiringAttention: string;
    immediateAttentionTools: string;
    notes: string;
    safetyChecks: Record<string, boolean>;
  };
  endCleanup?: {
    preparationChecks: Record<string, boolean>;
    cleaningChecks: Record<string, boolean>;
    notes: string;
  };
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
    deleteWorker,
    createStartOfShiftChecklist,
    createEndOfShiftCleanup
  } = useShopStore();
  
  const [manualWorkerName, setManualWorkerName] = useState('');
  const [noteText, setNoteText] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'checklists' | 'time'>('details');
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
      status: TaskStatus.PENDING,
      startChecklist: {
        workOrderNumber: '',
        palletNumber: '',
        partNumber: '',
        programNumber: '',
        startingBlockNumber: '',
        toolNumber: '',
        toolsRequiringAttention: '',
        immediateAttentionTools: '',
        notes: '',
        safetyChecks: {
          workAreaReviewed: false,
          measurementDevicesCalibrated: false,
          measurementDevicesClean: false,
          ipcMeasurementUnderstood: false,
          materialIconGreen: false,
          previousRoutingStepsComplete: false,
          projectManagerNotesReviewed: false,
          workOrderNotesReviewed: false,
          setupOverviewReviewed: false,
          materialQuantityConfirmed: false,
        }
      },
      endCleanup: {
        preparationChecks: {
          wayLubeChecked: false,
          coolantLevelChecked: false,
          toolboxOrganized: false,
          deburringToolsOrganized: false,
          torqueWrenchCondition: false,
          setupToolsStored: false,
        },
        cleaningChecks: {
          dirtyRagsDisposed: false,
          chipBarrelEmptied: false,
          coolantDrainsCleaned: false,
          coolantScreenCleaned: false,
          floorMatCleaned: false,
          toolsStored: false,
          areaSweptMopped: false,
        },
        notes: ''
      }
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

      // Save checklists if provided
      if (data.startChecklist && Object.values(data.startChecklist.safetyChecks).some(Boolean)) {
        createStartOfShiftChecklist({
          ...data.startChecklist,
          toolsRequiringAttention: data.startChecklist.toolsRequiringAttention.split(',').map(t => t.trim()).filter(Boolean),
          immediateAttentionTools: data.startChecklist.immediateAttentionTools.split(',').map(t => t.trim()).filter(Boolean),
          shiftId,
          date: selectedDate,
          completedBy: 'current-worker'
        });
      }

      if (data.endCleanup && (Object.values(data.endCleanup.preparationChecks).some(Boolean) || Object.values(data.endCleanup.cleaningChecks).some(Boolean))) {
        createEndOfShiftCleanup({
          ...data.endCleanup,
          shiftId,
          date: selectedDate,
          completedBy: 'current-worker'
        });
      }
      
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-8">
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
          
          {/* Tab Navigation */}
          <div className="flex space-x-4 mt-4">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeTab === 'details' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('checklists')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeTab === 'checklists' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Checklists
            </button>
            {mode === 'view' && (
              <button
                onClick={() => setActiveTab('time')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'time' 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Time Tracking
              </button>
            )}
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(100vh-16rem)]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {activeTab === 'details' && (
              <>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    {...register('description', { required: true })}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={mode === 'view'}
                    placeholder="Enter detailed notes about the work order, setup requirements, special instructions, etc."
                  />
                </div>

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
              </>
            )}

            {activeTab === 'checklists' && (
              <div className="space-y-8">
                {/* Start of Shift Checklist */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <CheckCircle2 className="h-5 w-5 mr-2 text-primary-600" />
                    Start of Shift Checklist
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Work Order Number
                      </label>
                      <input
                        type="text"
                        {...register('startChecklist.workOrderNumber')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        disabled={mode === 'view'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pallet Number
                      </label>
                      <input
                        type="text"
                        {...register('startChecklist.palletNumber')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        disabled={mode === 'view'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Part Number
                      </label>
                      <input
                        type="text"
                        {...register('startChecklist.partNumber')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        disabled={mode === 'view'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CNC Program Number
                      </label>
                      <input
                        type="text"
                        {...register('startChecklist.programNumber')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        disabled={mode === 'view'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Starting Block Number
                      </label>
                      <input
                        type="text"
                        {...register('startChecklist.startingBlockNumber')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        disabled={mode === 'view'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tool Number
                      </label>
                      <input
                        type="text"
                        {...register('startChecklist.toolNumber')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        disabled={mode === 'view'}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tools Requiring Attention (comma-separated)
                      </label>
                      <input
                        type="text"
                        {...register('startChecklist.toolsRequiringAttention')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        disabled={mode === 'view'}
                        placeholder="Tool 1, Tool 2, Tool 3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tools Needing Immediate Attention (comma-separated)
                      </label>
                      <input
                        type="text"
                        {...register('startChecklist.immediateAttentionTools')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        disabled={mode === 'view'}
                        placeholder="Tool 1, Tool 2, Tool 3"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Safety Checks</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries({
                        workAreaReviewed: 'Review work area for safety concerns',
                        measurementDevicesCalibrated: 'Measurement devices calibration verified',
                        measurementDevicesClean: 'Measurement devices clean and zeroed',
                        ipcMeasurementUnderstood: 'IPC measurement understanding confirmed',
                        materialIconGreen: 'Material icon is green',
                        previousRoutingStepsComplete: 'Previous routing steps completed',
                        projectManagerNotesReviewed: 'Project manager notes reviewed',
                        workOrderNotesReviewed: 'Work order notes reviewed',
                        setupOverviewReviewed: 'Setup overview reviewed',
                        materialQuantityConfirmed: 'Material quantity confirmed'
                      }).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            {...register(`startChecklist.safetyChecks.${key}` as any)}
                            disabled={mode === 'view'}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      {...register('startChecklist.notes')}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      disabled={mode === 'view'}
                    />
                  </div>
                </div>

                {/* End of Shift Cleanup */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <ClipboardList className="h-5 w-5 mr-2 text-warning-600" />
                    End of Shift Cleanup
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Preparation</h4>
                      <div className="space-y-2">
                        {Object.entries({
                          wayLubeChecked: 'Way lube check, if less than half top it off',
                          coolantLevelChecked: 'Coolant level check, if low, fill',
                          toolboxOrganized: 'All toolbox tools put away in appropriate spots',
                          deburringToolsOrganized: 'Organize all deburring and measuring tools currently used',
                          torqueWrenchCondition: 'Torque wrench and hammer in good condition and hanging in their spot',
                          setupToolsStored: 'If in middle of setup, put away all finished items'
                        }).map(([key, label]) => (
                          <label key={key} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              {...register(`endCleanup.preparationChecks.${key}` as any)}
                              disabled={mode === 'view'}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <span className="text-sm text-gray-700">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Clean</h4>
                      <div className="space-y-2">
                        {Object.entries({
                          dirtyRagsDisposed: 'Pick up all dirty rags and dispose properly',
                          chipBarrelEmptied: 'Empty and reposition chip barrel, ensure proper material separation',
                          coolantDrainsCleaned: 'Clean coolant drains inside machine and empty auger',
                          coolantScreenCleaned: 'Clean screen underneath coolant drain in tank',
                          floorMatCleaned: 'Shake out floor mat and clean underneath',
                          toolsStored: 'Put away all tool holders and tools not being used',
                          areaSweptMopped: 'Sweep and/or mop area'
                        }).map(([key, label]) => (
                          <label key={key} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              {...register(`endCleanup.cleaningChecks.${key}` as any)}
                              disabled={mode === 'view'}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <span className="text-sm text-gray-700">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        {...register('endCleanup.notes')}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        disabled={mode === 'view'}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'time' && task && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Time Tracking</h3>
                
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
                  <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
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
                    className="px-4 py-2 bg-success-600 text-white rounded-md hover:bg-success-700 flex items-center"
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