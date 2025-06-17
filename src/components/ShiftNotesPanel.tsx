import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  ChevronDown, 
  ChevronUp, 
  Users, 
  CheckCircle2, 
  XCircle, 
  MessageSquare,
  Clock,
  Plus,
  Download,
  FileText
} from 'lucide-react';
import { useShopStore } from '../store/useShopStore';
import { Shift, Worker } from '../types';

interface ShiftNotesPanelProps {
  selectedDate: string;
  className?: string;
}

const ShiftNotesPanel: React.FC<ShiftNotesPanelProps> = ({ selectedDate, className = '' }) => {
  const [expandedShift, setExpandedShift] = useState<string | null>(null);
  const [newNote, setNewNote] = useState<Record<string, string>>({});
  
  const { 
    shifts, 
    workers, 
    tasks,
    taskNotes,
    isStartChecklistComplete,
    isEndCleanupComplete,
    addTaskNote
  } = useShopStore();

  const getShiftData = (shift: Shift) => {
    const shiftWorkers = workers.filter(w => w.shiftId === shift.id);
    const shiftTasks = tasks.filter(t => 
      t.shiftId === shift.id && 
      t.createdAt.startsWith(selectedDate)
    );
    
    // Get all notes for tasks in this shift
    const shiftNotes = taskNotes.filter(note => {
      const task = tasks.find(t => t.id === note.taskId);
      return task && task.shiftId === shift.id && task.createdAt.startsWith(selectedDate);
    }).map(note => {
      const task = tasks.find(t => t.id === note.taskId);
      const worker = workers.find(w => w.id === note.workerId);
      return {
        ...note,
        taskWorkOrder: task?.workOrderNumber || 'Unknown',
        workerName: worker?.name || 'Unknown Worker'
      };
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const startChecklistComplete = isStartChecklistComplete(shift.id, selectedDate);
    const endCleanupComplete = isEndCleanupComplete(shift.id, selectedDate);

    return {
      workers: shiftWorkers,
      tasks: shiftTasks,
      notes: shiftNotes,
      startChecklistComplete,
      endCleanupComplete
    };
  };

  const handleAddNote = (shiftId: string) => {
    const noteText = newNote[shiftId]?.trim();
    if (!noteText) return;

    // Find the first task in this shift to attach the note to
    const shiftTasks = tasks.filter(t => 
      t.shiftId === shiftId && 
      t.createdAt.startsWith(selectedDate)
    );

    if (shiftTasks.length === 0) {
      alert('No tasks found for this shift. Please add a task first before adding notes.');
      return;
    }

    // Use the first worker or create a default one
    const shiftWorkers = workers.filter(w => w.shiftId === shiftId);
    const workerId = shiftWorkers[0]?.id || workers[0]?.id;

    if (!workerId) {
      alert('No workers found. Please add a worker first.');
      return;
    }

    addTaskNote({
      taskId: shiftTasks[0].id, // Attach to first task as a shift-level note
      workerId,
      noteText: `[Shift Note] ${noteText}`
    });

    setNewNote(prev => ({ ...prev, [shiftId]: '' }));
  };

  const exportShiftNotes = (shift: Shift) => {
    const shiftData = getShiftData(shift);
    
    let content = `Shift ${shift.type} Notes - ${format(new Date(selectedDate), 'MMMM d, yyyy')}\n`;
    content += `Time: ${shift.startTime} - ${shift.endTime}\n`;
    content += `Generated: ${format(new Date(), 'MMMM d, yyyy HH:mm')}\n`;
    content += '='.repeat(60) + '\n\n';

    // Workers
    content += 'WORKERS:\n';
    if (shiftData.workers.length > 0) {
      shiftData.workers.forEach(worker => {
        content += `- ${worker.name} (${worker.role})\n`;
      });
    } else {
      content += 'No workers assigned\n';
    }
    content += '\n';

    // Checklists
    content += 'CHECKLISTS:\n';
    content += `Start of Shift: ${shiftData.startChecklistComplete ? 'COMPLETED' : 'PENDING'}\n`;
    content += `End of Shift: ${shiftData.endCleanupComplete ? 'COMPLETED' : 'PENDING'}\n\n`;

    // Tasks Summary
    content += 'TASKS SUMMARY:\n';
    content += `Total Tasks: ${shiftData.tasks.length}\n`;
    content += `Completed: ${shiftData.tasks.filter(t => t.status === 'completed').length}\n`;
    content += `In Progress: ${shiftData.tasks.filter(t => t.status === 'in_progress').length}\n`;
    content += `Pending: ${shiftData.tasks.filter(t => t.status === 'pending').length}\n\n`;

    // Notes
    content += 'NOTES:\n';
    if (shiftData.notes.length > 0) {
      shiftData.notes.forEach((note, index) => {
        content += `${index + 1}. [${note.taskWorkOrder}] by ${note.workerName}\n`;
        content += `   Time: ${format(new Date(note.timestamp), 'HH:mm')}\n`;
        content += `   Note: ${note.noteText}\n\n`;
      });
    } else {
      content += 'No notes recorded\n';
    }

    // Create and download file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Shift_${shift.type}_Notes_${selectedDate}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleShift = (shiftId: string) => {
    setExpandedShift(expandedShift === shiftId ? null : shiftId);
  };

  return (
    <div className={`bg-white rounded-lg shadow-md border border-neutral-200 ${className}`}>
      <div className="p-4 border-b border-neutral-200">
        <h2 className="text-lg font-semibold text-neutral-800 flex items-center">
          <MessageSquare className="h-5 w-5 mr-2 text-primary-600" />
          Shift Notes & Status
        </h2>
        <p className="text-sm text-neutral-600 mt-1">
          {format(new Date(selectedDate), 'MMMM d, yyyy')}
        </p>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {shifts.map(shift => {
          const shiftData = getShiftData(shift);
          const isExpanded = expandedShift === shift.id;

          return (
            <div key={shift.id} className="border-b border-neutral-100 last:border-b-0">
              <button
                onClick={() => toggleShift(shift.id)}
                className="w-full p-4 text-left hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      shift.type === 'S1' ? 'bg-primary-500' :
                      shift.type === 'S2' ? 'bg-secondary-500' :
                      'bg-neutral-500'
                    }`} />
                    <div>
                      <div className="font-medium text-neutral-800">
                        Shift {shift.type}
                      </div>
                      <div className="text-sm text-neutral-600 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {shift.startTime} - {shift.endTime}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      {shiftData.startChecklistComplete ? (
                        <CheckCircle2 className="h-4 w-4 text-success-500" title="Start checklist complete" />
                      ) : (
                        <XCircle className="h-4 w-4 text-error-500" title="Start checklist pending" />
                      )}
                      {shiftData.endCleanupComplete ? (
                        <CheckCircle2 className="h-4 w-4 text-success-500" title="End cleanup complete" />
                      ) : (
                        <XCircle className="h-4 w-4 text-error-500" title="End cleanup pending" />
                      )}
                    </div>
                    
                    <div className="text-sm text-neutral-500">
                      {shiftData.notes.length} notes
                    </div>
                    
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-neutral-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-neutral-400" />
                    )}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-4">
                  {/* Workers */}
                  <div>
                    <h4 className="text-sm font-medium text-neutral-700 mb-2 flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      Workers ({shiftData.workers.length})
                    </h4>
                    {shiftData.workers.length > 0 ? (
                      <div className="grid grid-cols-1 gap-1">
                        {shiftData.workers.map(worker => (
                          <div key={worker.id} className="text-sm text-neutral-600 bg-neutral-50 px-2 py-1 rounded">
                            {worker.name} - {worker.role}
                            {worker.isManual && <span className="text-xs text-neutral-500 ml-1">(Manual)</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-neutral-500 italic">No workers assigned</div>
                    )}
                  </div>

                  {/* Checklist Status */}
                  <div>
                    <h4 className="text-sm font-medium text-neutral-700 mb-2">Checklist Status</h4>
                    <div className="space-y-1">
                      <div className="flex items-center text-sm">
                        {shiftData.startChecklistComplete ? (
                          <CheckCircle2 className="h-4 w-4 text-success-500 mr-2" />
                        ) : (
                          <XCircle className="h-4 w-4 text-error-500 mr-2" />
                        )}
                        <span className={shiftData.startChecklistComplete ? 'text-success-700' : 'text-error-700'}>
                          Start of Shift Checklist
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        {shiftData.endCleanupComplete ? (
                          <CheckCircle2 className="h-4 w-4 text-success-500 mr-2" />
                        ) : (
                          <XCircle className="h-4 w-4 text-error-500 mr-2" />
                        )}
                        <span className={shiftData.endCleanupComplete ? 'text-success-700' : 'text-error-700'}>
                          End of Shift Cleanup
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tasks Summary */}
                  <div>
                    <h4 className="text-sm font-medium text-neutral-700 mb-2">Tasks Summary</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Total: {shiftData.tasks.length}</div>
                      <div className="text-success-600">
                        Completed: {shiftData.tasks.filter(t => t.status === 'completed').length}
                      </div>
                      <div className="text-primary-600">
                        In Progress: {shiftData.tasks.filter(t => t.status === 'in_progress').length}
                      </div>
                      <div className="text-warning-600">
                        Pending: {shiftData.tasks.filter(t => t.status === 'pending').length}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-neutral-700">
                        Notes ({shiftData.notes.length})
                      </h4>
                      <button
                        onClick={() => exportShiftNotes(shift)}
                        className="text-xs text-primary-600 hover:text-primary-700 flex items-center"
                        title="Export shift notes"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Export
                      </button>
                    </div>
                    
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {shiftData.notes.map(note => (
                        <div key={note.id} className="bg-neutral-50 p-2 rounded text-xs">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-neutral-700">
                              [{note.taskWorkOrder}] {note.workerName}
                            </span>
                            <span className="text-neutral-500">
                              {format(new Date(note.timestamp), 'HH:mm')}
                            </span>
                          </div>
                          <p className="text-neutral-600">{note.noteText}</p>
                        </div>
                      ))}
                      
                      {shiftData.notes.length === 0 && (
                        <div className="text-sm text-neutral-500 italic text-center py-2">
                          No notes recorded for this shift
                        </div>
                      )}
                    </div>

                    {/* Add Note */}
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={newNote[shift.id] || ''}
                        onChange={(e) => setNewNote(prev => ({ ...prev, [shift.id]: e.target.value }))}
                        placeholder="Add a shift note..."
                        className="flex-1 px-2 py-1 text-sm border border-neutral-300 rounded"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAddNote(shift.id);
                          }
                        }}
                      />
                      <button
                        onClick={() => handleAddNote(shift.id)}
                        disabled={!newNote[shift.id]?.trim()}
                        className="px-2 py-1 bg-primary-600 text-white rounded text-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ShiftNotesPanel;