import React, { useState } from 'react';
import { Check, AlertTriangle, X, UserCheck, User } from 'lucide-react';
import { useShopStore } from '../store/useShopStore';

interface StartOfShiftChecklistProps {
  shiftId: string;
  selectedDate: string;
  onComplete?: () => void;
}

const StartOfShiftChecklist: React.FC<StartOfShiftChecklistProps> = ({ 
  shiftId, 
  selectedDate, 
  onComplete 
}) => {
  const { 
    workers,
    createStartOfShiftChecklist,
    acknowledgeStartChecklist,
    getStartChecklistAcknowledgments,
    isStartChecklistComplete
  } = useShopStore();
  
  const [formData, setFormData] = useState({
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

  const [checklistSubmitted, setChecklistSubmitted] = useState(false);

  const shiftWorkers = workers.filter(w => w.shiftId === shiftId);
  const acknowledgedWorkers = getStartChecklistAcknowledgments(shiftId, selectedDate);
  const isComplete = isStartChecklistComplete(shiftId, selectedDate);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      safetyChecks: {
        ...prev.safetyChecks,
        [name]: !prev.safetyChecks[name as keyof typeof prev.safetyChecks]
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Split tools into arrays
    const toolsRequiringAttention = formData.toolsRequiringAttention
      .split(',')
      .map(tool => tool.trim())
      .filter(Boolean);
      
    const immediateAttentionTools = formData.immediateAttentionTools
      .split(',')
      .map(tool => tool.trim())
      .filter(Boolean);

    createStartOfShiftChecklist({
      ...formData,
      toolsRequiringAttention,
      immediateAttentionTools,
      shiftId,
      date: selectedDate,
      completedBy: 'current-worker',
    });

    setChecklistSubmitted(true);
  };

  const handleWorkerAcknowledge = (workerId: string) => {
    acknowledgeStartChecklist(shiftId, selectedDate, workerId);
  };

  const allSafetyChecksComplete = Object.values(formData.safetyChecks).every(Boolean);
  const allFieldsComplete = formData.workOrderNumber && formData.palletNumber && 
    formData.partNumber && formData.programNumber && formData.startingBlockNumber && 
    formData.toolNumber;

  if (isComplete) {
    return (
      <div className="bg-success-50 border border-success-200 rounded-lg p-6 text-center">
        <UserCheck className="h-16 w-16 text-success-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-success-800 mb-2">
          Start of Shift Checklist Complete
        </h3>
        <p className="text-success-700 mb-4">
          All workers have acknowledged the start of shift checklist.
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
          <h2 className="text-2xl font-bold text-gray-800">Start of Shift Checklist</h2>
          {onComplete && (
            <button
              onClick={onComplete}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>

        {!checklistSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Work Order Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work Order Number *
                </label>
                <input
                  type="text"
                  name="workOrderNumber"
                  value={formData.workOrderNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pallet Number *
                </label>
                <input
                  type="text"
                  name="palletNumber"
                  value={formData.palletNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Part Number *
                </label>
                <input
                  type="text"
                  name="partNumber"
                  value={formData.partNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CNC Program Number *
                </label>
                <input
                  type="text"
                  name="programNumber"
                  value={formData.programNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Starting Block Number *
                </label>
                <input
                  type="text"
                  name="startingBlockNumber"
                  value={formData.startingBlockNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tool Number *
                </label>
                <input
                  type="text"
                  name="toolNumber"
                  value={formData.toolNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
            </div>

            {/* Tool Attention */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tools Requiring Attention (comma-separated)
                </label>
                <input
                  type="text"
                  name="toolsRequiringAttention"
                  value={formData.toolsRequiringAttention}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Tool 1, Tool 2, Tool 3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tools Needing Immediate Attention (comma-separated)
                </label>
                <input
                  type="text"
                  name="immediateAttentionTools"
                  value={formData.immediateAttentionTools}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Tool 1, Tool 2, Tool 3"
                />
              </div>
            </div>

            {/* Safety Checks */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Safety Checks</h3>
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
                      checked={formData.safetyChecks[key as keyof typeof formData.safetyChecks]}
                      onChange={() => handleCheckboxChange(key)}
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
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!allFieldsComplete || !allSafetyChecksComplete}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Check className="h-5 w-5 mr-2" />
                Complete Checklist
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 text-center">
              <Check className="h-12 w-12 text-primary-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-primary-800 mb-2">
                Checklist Submitted Successfully
              </h3>
              <p className="text-primary-700">
                Now workers need to acknowledge the checklist to complete the process.
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
                    Each worker must click their name to acknowledge they have reviewed this checklist.
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

export default StartOfShiftChecklist;