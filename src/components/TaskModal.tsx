import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, User, Info, AlertTriangle,
  Trash2, Printer, Plus, RefreshCw, MessageSquarePlus, CheckCircle2, ClipboardList, Calendar, ArrowRight
} from 'lucide-react';
import { format, formatDistanceToNow, addDays, parseISO, isValid, formatISO } from 'date-fns';
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
    carryOverTask,
    deleteTask,
    printTask,
    addManualWorker,
    deleteWorker,
    moveTaskToNextDay,
    currentUser,
    startChecklists,
    endCleanups
  } = useShopStore();
  
  const [manualWorkerName, setManualWorkerName] = useState('');
  const [noteText, setNoteText] = useState('');
  const [isWorkOrderValid, setIsWorkOrderValid] = useState(false);
  const [existingTask, setExistingTask] = useState<any>(null);
  
  // Checklist state
  const [startChecklistData, setStartChecklistData] = useState({
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
  });

  const [endCleanupData, setEndCleanupData] = useState({
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
  });
  
  const task = taskId ? getExpandedTask(taskId) : null;
  const taskNotes = taskId ? getTaskNotesByTaskId(taskId) : [];
  
  // Get existing checklist data for this shift and date
  const existingStartChecklist = startChecklists.find(c => 
    c.shiftId === (task?.shiftId || shiftId) && c.date === selectedDate
  );
  
  const existingEndCleanup = endCleanups.find(c => 
    c.shiftId === (task?.shiftId || shiftId) && c.date === selectedDate
  );
  
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<TaskFormData>({
    defaultValues: {
      workOrderNumber: '',
      description: '',
      assignedWorkers: [],
      status: TaskStatus.PENDING
    }
  });

  // Handle start checklist changes
  const handleStartChecklistChange = (field: string, value: any) => {
    setStartChecklistData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStartSafetyCheckChange = (checkName: string, checked: boolean) => {
    setStartChecklistData(prev => ({
      ...prev,
      safetyChecks: {
        ...prev.safetyChecks,
        [checkName]: checked
      }
    }));
  };

  // Handle end cleanup changes
  const handleEndCleanupChange = (section: 'preparationChecks' | 'cleaningChecks', checkName: string, checked: boolean) => {
    setEndCleanupData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [checkName]: checked
      }
    }));
  };

  const handleEndCleanupNotesChange = (notes: string) => {
    setEndCleanupData(prev => ({
      ...prev,
      notes
    }));
  };

  useEffect(() => {
    if (task && (mode === 'view' || mode === 'edit')) {
      setValue('workOrderNumber', task.workOrderNumber);
      setValue('description', task.description);
      setValue('assignedWorkers', task.assignedWorkers);
      setValue('status', task.status);
    } else {
      reset();
    }

    // Load existing checklist data if available
    if (existingStartChecklist) {
      setStartChecklistData({
        workOrderNumber: existingStartChecklist.workOrderNumber || '',
        palletNumber: existingStartChecklist.palletNumber || '',
        partNumber: existingStartChecklist.partNumber || '',
        programNumber: existingStartChecklist.programNumber || '',
        startingBlockNumber: existingStartChecklist.startingBlockNumber || '',
        toolNumber: existingStartChecklist.toolNumber || '',
        toolsRequiringAttention: Array.isArray(existingStartChecklist.toolsRequiringAttention) 
          ? existingStartChecklist.toolsRequiringAttention.join(', ')
          : existingStartChecklist.toolsRequiringAttention || '',
        immediateAttentionTools: Array.isArray(existingStartChecklist.immediateAttentionTools)
          ? existingStartChecklist.immediateAttentionTools.join(', ')
          : existingStartChecklist.immediateAttentionTools || '',
        notes: existingStartChecklist.notes || '',
        safetyChecks: existingStartChecklist.safetyChecks || {}
      });
    }

    if (existingEndCleanup) {
      setEndCleanupData({
        preparationChecks: existingEndCleanup.preparationChecks || {},
        cleaningChecks: existingEndCleanup.cleaningChecks || {},
        notes: existingEndCleanup.notes || ''
      });
    }
  }, [task, mode, reset, setValue, existingStartChecklist, existingEndCleanup]);

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
        estimatedDuration: 60,
        priority: TaskPriority.MEDIUM,
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

  const handleMoveToNextDay = async () => {
    if (!task) {
      console.error('No task available for move operation');
      alert('Unable to move note: No task data available.');
      return;
    }

    try {
      let taskDate;
      
      if (!task.createdAt) {
        console.warn('Task has no createdAt value, using current date');
        taskDate = new Date();
      } else {
        taskDate = parseISO(task.createdAt);
        
        if (!isValid(taskDate)) {
          console.warn('Invalid createdAt value for task', task.id, 'got', task.createdAt, 'defaulting to current date');
          taskDate = new Date();
        }
      }

      const nextDate = addDays(taskDate, 1);
      
      if (!isValid(nextDate)) {
        console.error('Failed to calculate next day date');
        alert('Unable to move note: Date calculation error.');
        return;
      }

      const nextDayFormatted = format(nextDate, 'MMMM d, yyyy');
      
      if (window.confirm(`Move this note to tomorrow (${nextDayFormatted}) first shift?`)) {
        console.log(`Moving task ${task.workOrderNumber} to next day: ${formatISO(nextDate, { representation: 'date' })}`);
        
        moveTaskToNextDay(task.id);
        onClose();
        
        console.log(`✅ Successfully moved task ${task.workOrderNumber} to next day`);
      }
    } catch (error) {
      console.error('Error in handleMoveToNextDay:', error);
      alert('Unable to move note: An unexpected error occurred. Please contact support.');
    }
  };

  const handleCarryToNextShift = () => {
    if (!task) {
      console.error('No task available for carry operation');
      alert('Unable to carry note: No task data available.');
      return;
    }

    try {
      const currentShiftIndex = shifts.findIndex(s => s.id === task.shiftId);
      
      if (currentShiftIndex === -1) {
        console.error('Current shift not found');
        alert('Unable to carry note: Current shift not found.');
        return;
      }

      const nextShiftIndex = (currentShiftIndex + 1) % shifts.length;
      const nextShift = shifts[nextShiftIndex];
      
      if (!nextShift) {
        console.error('Next shift not found');
        alert('Unable to carry note: Next shift not found.');
        return;
      }

      const currentShiftName = shifts[currentShiftIndex].type;
      const nextShiftName = nextShift.type;
      
      if (window.confirm(`Carry this note from Shift ${currentShiftName} to Shift ${nextShiftName} on the same day?`)) {
        console.log(`Carrying task ${task.workOrderNumber} from Shift ${currentShiftName} to Shift ${nextShiftName}`);
        
        carryOverTask(task.id, nextShift.id);
        onClose();
        
        console.log(`✅ Successfully carried task ${task.workOrderNumber} to next shift`);
      }
    } catch (error) {
      console.error('Error in handleCarryToNextShift:', error);
      alert('Unable to carry note: An unexpected error occurred. Please contact support.');
    }
  };

  // Check if this is a Shift 3 task
  const isShift3Task = task && shifts.find(s => s.id === task.shiftId)?.type === 'S3';

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
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={mode === 'view'}
                placeholder="Enter detailed notes about the work order, setup requirements, special instructions, etc."
              />
            </div>

            {/* Checklists Section */}
            <div className="space-y-8 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-800">Checklists</h3>
              
              {/* Start of Shift Checklist */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
                  <CheckCircle2 className="h-5 w-5 mr-2 text-primary-600" />
                  Start of Shift Checklist
                  {existingStartChecklist && (
                    <span className="ml-2 text-sm text-success-600 bg-success-100 px-2 py-1 rounded">
                      Saved by {existingStartChecklist.modifiedBy} at {format(new Date(existingStartChecklist.lastModified), 'HH:mm')}
                    </span>
                  )}
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Work Order Number
                    </label>
                    <input
                      type="text"
                      value={startChecklistData.workOrderNumber}
                      onChange={(e) => handleStartChecklistChange('workOrderNumber', e.target.value)}
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
                      value={startChecklistData.palletNumber}
                      onChange={(e) => handleStartChecklistChange('palletNumber', e.target.value)}
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
                      value={startChecklistData.partNumber}
                      onChange={(e) => handleStartChecklistChange('partNumber', e.target.value)}
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
                      value={startChecklistData.programNumber}
                      onChange={(e) => handleStartChecklistChange('programNumber', e.target.value)}
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
                      value={startChecklistData.startingBlockNumber}
                      onChange={(e) => handleStartChecklistChange('startingBlockNumber', e.target.value)}
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
                      value={startChecklistData.toolNumber}
                      onChange={(e) => handleStartChecklistChange('toolNumber', e.target.value)}
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
                      value={startChecklistData.toolsRequiringAttention}
                      onChange={(e) => handleStartChecklistChange('toolsRequiringAttention', e.target.value)}
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
                      value={startChecklistData.immediateAttentionTools}
                      onChange={(e) => handleStartChecklistChange('immediateAttentionTools', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      disabled={mode === 'view'}
                      placeholder="Tool 1, Tool 2, Tool 3"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <h5 className="font-medium text-gray-900 mb-3">Safety Checks</h5>
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
                          checked={startChecklistData.safetyChecks[key as keyof typeof startChecklistData.safetyChecks] || false}
                          onChange={(e) => handleStartSafetyCheckChange(key, e.target.checked)}
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
                    Checklist Notes
                  </label>
                  <textarea
                    value={startChecklistData.notes}
                    onChange={(e) => handleStartChecklistChange('notes', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={mode === 'view'}
                  />
                </div>
              </div>

              {/* End of Shift Cleanup */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
                  <ClipboardList className="h-5 w-5 mr-2 text-warning-600" />
                  End of Shift Cleanup
                  {existingEndCleanup && (
                    <span className="ml-2 text-sm text-success-600 bg-success-100 px-2 py-1 rounded">
                      Saved by {existingEndCleanup.modifiedBy} at {format(new Date(existingEndCleanup.lastModified), 'HH:mm')}
                    </span>
                  )}
                </h4>

                <div className="space-y-4">
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">Preparation</h5>
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
                            checked={endCleanupData.preparationChecks[key as keyof typeof endCleanupData.preparationChecks] || false}
                            onChange={(e) => handleEndCleanupChange('preparationChecks', key, e.target.checked)}
                            disabled={mode === 'view'}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">Clean</h5>
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
                            checked={endCleanupData.cleaningChecks[key as keyof typeof endCleanupData.cleaningChecks] || false}
                            onChange={(e) => handleEndCleanupChange('cleaningChecks', key, e.target.checked)}
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
                      Cleanup Notes
                    </label>
                    <textarea
                      value={endCleanupData.notes}
                      onChange={(e) => handleEndCleanupNotesChange(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      disabled={mode === 'view'}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Assigned Workers */}
            <div className="border-t border-gray-200 pt-6">
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

            {/* Additional Notes Section */}
            {mode === 'view' && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Additional Notes</h3>
                  <NotesExporter taskId={taskId} />
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

                <div className="flex gap-2 mt-4">
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
                
                {/* Save & Move to Next Day Button - Only for Shift 3 */}
                {isShift3Task && (
                  <button
                    onClick={handleMoveToNextDay}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Save & Move to Next Day
                  </button>
                )}
                
                {/* Carry to Next Shift Button */}
                <button
                  onClick={handleCarryToNextShift}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 flex items-center"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Carry to Next Shift
                </button>
                
                {task?.status !== TaskStatus.COMPLETED && (
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