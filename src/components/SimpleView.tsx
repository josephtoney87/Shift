import React from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Circle, MessageSquare } from 'lucide-react';
import { useShopStore } from '../store/useShopStore';
import { TaskStatus } from '../types';

interface SimpleViewProps {
  onClose: () => void;
}

const SimpleView: React.FC<SimpleViewProps> = ({ onClose }) => {
  const { shifts, tasks, workers, selectedDate, taskNotes } = useShopStore();

  const shiftSummaries = shifts.map(shift => {
    const shiftTasks = tasks.filter(task => 
      task.shiftId === shift.id && 
      task.createdAt.startsWith(selectedDate)
    ).map(task => ({
      ...task,
      notes: taskNotes.filter(note => note.taskId === task.id)
    }));

    const shiftWorkers = workers.filter(worker => 
      worker.shiftId === shift.id
    );

    return {
      shift,
      tasks: shiftTasks,
      stats: {
        total: shiftTasks.length,
        completed: shiftTasks.filter(t => t.status === TaskStatus.COMPLETED).length,
        inProgress: shiftTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
        pending: shiftTasks.filter(t => t.status === TaskStatus.PENDING).length
      },
      workers: shiftWorkers
    };
  });

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {format(new Date(selectedDate), 'MMMM d, yyyy')}
          </h1>
          <button
            onClick={onClose}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Full View
          </button>
        </div>

        <div className="space-y-8">
          {shiftSummaries.map(({ shift, stats, workers, tasks }) => (
            <div key={shift.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-semibold mb-1">
                    Shift {shift.type}
                  </h2>
                  <p className="text-gray-500">
                    {shift.startTime} - {shift.endTime}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {stats.total}
                    </div>
                    <div className="text-sm text-gray-500">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-success-600">
                      {stats.completed}
                    </div>
                    <div className="text-sm text-gray-500">Done</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600">
                      {stats.inProgress}
                    </div>
                    <div className="text-sm text-gray-500">Active</div>
                  </div>
                </div>
              </div>

              {/* Tasks Section */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">
                  Tasks ({tasks.length})
                </h3>
                <div className="space-y-3">
                  {tasks.map(task => (
                    <div
                      key={task.id}
                      className="bg-gray-50 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium">
                            {task.workOrderNumber}
                          </div>
                          <div className="text-sm text-gray-600">
                            {task.description}
                          </div>
                        </div>
                        <div className={`text-sm font-medium px-2 py-1 rounded-full ${
                          task.status === TaskStatus.COMPLETED
                            ? 'bg-success-100 text-success-700'
                            : task.status === TaskStatus.IN_PROGRESS
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-neutral-100 text-neutral-700'
                        }`}>
                          {task.status}
                        </div>
                      </div>
                      {task.notes.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="flex items-center text-sm text-gray-500 mb-1">
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Notes ({task.notes.length})
                          </div>
                          <div className="space-y-1">
                            {task.notes.map(note => (
                              <div
                                key={note.id}
                                className="text-sm text-gray-600 pl-5"
                              >
                                • {note.noteText}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <div className="text-gray-500 text-sm text-center py-4">
                      No tasks scheduled for this shift
                    </div>
                  )}
                </div>
              </div>

              {/* Workers Section */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3">
                  Workers ({workers.length})
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {workers.map(worker => (
                    <div
                      key={worker.id}
                      className="flex items-center p-3 bg-gray-50 rounded-md"
                    >
                      <Circle className="h-2 w-2 text-success-500 mr-2" />
                      <div>
                        <div className="font-medium">{worker.name}</div>
                        <div className="text-sm text-gray-500">{worker.role}</div>
                      </div>
                    </div>
                  ))}
                  {workers.length === 0 && (
                    <div className="text-gray-500 text-sm">
                      No workers assigned to this shift
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimpleView;