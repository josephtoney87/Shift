import React, { useState } from 'react';
import { Check, X, User, UserCheck } from 'lucide-react';
import { useShopStore } from '../store/useShopStore';

interface EndOfShiftCleanupProps {
  shiftId: string;
  selectedDate: string;
  onComplete?: () => void;
}

const EndOfShiftCleanup: React.FC<EndOfShiftCleanupProps> = ({ 
  shiftId, 
  selectedDate, 
  onComplete 
}) => {
  const { 
    workers,
    createEndOfShiftCleanup,
    acknowledgeEndCleanup,
    getEndCleanupAcknowledgments,
    isEndCleanupComplete
  } = useShopStore();
  
  const [formData, setFormData] = useState({
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

  const [cleanupSubmitted, setCleanupSubmitted] = useState(false);

  const shiftWorkers = workers.filter(w => w.shiftId === shiftId);
  const acknowledgedWorkers = getEndCleanupAcknowledgments(shiftId, selectedDate);
  const isComplete = isEndCleanupComplete(shiftId, selectedDate);

  const handleCheckboxChange = (category: 'preparationChecks' | 'cleaningChecks', name: string) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [name]: !prev[category][name as keyof typeof prev[category]]
      }
    }));
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      notes: e.target.value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createEndOfShiftCleanup({
      ...formData,
      shiftId,
      date: selectedDate,
      completedBy: 'current-worker',
    });

    setCleanupSubmitted(true);
  };

  const handleWorkerAcknowledge = (workerId: string) => {
    acknowledgeEndCleanup(shiftId, selectedDate, workerId);
  };

  const allPreparationChecksComplete = Object.values(formData.preparationChecks).every(Boolean);
  const allCleaningChecksComplete = Object.values(formData.cleaningChecks).every(Boolean);

  if (isComplete) {
    return (
      <div className="bg-success-50 border border-success-200 rounded-lg p-6 text-center">
        <UserCheck className="h-16 w-16 text-success-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-success-800 mb-2">
          End of Shift Cleanup Complete
        </h3>
        <p className="text-success-700 mb-4">
          All workers have acknowledged the end of shift cleanup.
        </p>
        <div className="bg-white rounded-lg p-4 border border-success-200">
          <h4 className="font-medium text-success-800 mb-2">Acknowledged Workers:</h4>
          <div className="flex flex-wrap gap-2 justify-center">
            {shiftWorkers.map(worker => (
              <div
                key={worker.id}
                className="flex items-center bg-success-100 text-success-800 px-3 py-1 rounded-full text-sm"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                {worker.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-auto">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">End of Shift Cleanup</h2>
          {onComplete && (
            <button
              onClick={onComplete}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>

        {!cleanupSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Preparation Checks */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Preparation</h3>
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
                      checked={formData.preparationChecks[key as keyof typeof formData.preparationChecks]}
                      onChange={() => handleCheckboxChange('preparationChecks', key)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Cleaning Checks */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Clean</h3>
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
                      checked={formData.cleaningChecks[key as keyof typeof formData.cleaningChecks]}
                      onChange={() => handleCheckboxChange('cleaningChecks', key)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={handleNotesChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!allPreparationChecksComplete || !allCleaningChecksComplete}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Check className="h-5 w-5 mr-2" />
                Complete Cleanup
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 text-center">
              <Check className="h-12 w-12 text-primary-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-primary-800 mb-2">
                Cleanup Submitted Successfully
              </h3>
              <p className="text-primary-700">
                Now workers need to acknowledge the cleanup to complete the process.
              </p>
            </div>

            {/* Worker Acknowledgment Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <UserCheck className="h-5 w-5 mr-2" />
                Worker Acknowledgment
              </h3>
              
              {shiftWorkers.length === 0 ? (
                <p className="text-gray-500 italic">No workers assigned to this shift.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-4">
                    Each worker must click their name to acknowledge they have reviewed this cleanup checklist.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {shiftWorkers.map(worker => {
                      const isAcknowledged = acknowledgedWorkers.includes(worker.id);
                      
                      return (
                        <button
                          key={worker.id}
                          onClick={() => handleWorkerAcknowledge(worker.id)}
                          disabled={isAcknowledged}
                          className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                            isAcknowledged
                              ? 'bg-success-50 border-success-200 text-success-800 cursor-not-allowed'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-primary-50 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center">
                            {isAcknowledged ? (
                              <UserCheck className="h-5 w-5 mr-3 text-success-600" />
                            ) : (
                              <User className="h-5 w-5 mr-3 text-gray-400" />
                            )}
                            <div className="text-left">
                              <div className="font-medium">{worker.name}</div>
                              <div className="text-sm text-gray-500">{worker.role}</div>
                            </div>
                          </div>
                          
                          {isAcknowledged ? (
                            <div className="text-sm font-medium text-success-600">
                              Acknowledged
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">
                              Click to acknowledge
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Progress */}
                  <div className="mt-4 bg-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Progress: {acknowledgedWorkers.length} of {shiftWorkers.length} acknowledged
                      </span>
                      <span className="text-sm text-gray-600">
                        {Math.round((acknowledgedWorkers.length / shiftWorkers.length) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(acknowledgedWorkers.length / shiftWorkers.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EndOfShiftCleanup;