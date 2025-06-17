import React, { useState } from 'react';
import { Check, AlertTriangle, X } from 'lucide-react';
import { useShopStore } from '../store/useShopStore';

interface StartOfShiftChecklistProps {
  onComplete?: () => void;
}

const StartOfShiftChecklist: React.FC<StartOfShiftChecklistProps> = ({ onComplete }) => {
  const { createStartOfShiftChecklist } = useShopStore();
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
      shiftId: 'current-shift', // In production, get from context
      date: new Date().toISOString().split('T')[0],
      completedBy: 'current-worker', // In production, get from context
    });

    if (onComplete) {
      onComplete();
    }
  };

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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Work Order Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Work Order Number
              </label>
              <input
                type="text"
                name="workOrderNumber"
                value={formData.workOrderNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pallet Number
              </label>
              <input
                type="text"
                name="palletNumber"
                value={formData.palletNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Part Number
              </label>
              <input
                type="text"
                name="partNumber"
                value={formData.partNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CNC Program Number
              </label>
              <input
                type="text"
                name="programNumber"
                value={formData.programNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Starting Block Number
              </label>
              <input
                type="text"
                name="startingBlockNumber"
                value={formData.startingBlockNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tool Number
              </label>
              <input
                type="text"
                name="toolNumber"
                value={formData.toolNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.safetyChecks.workAreaReviewed}
                  onChange={() => handleCheckboxChange('workAreaReviewed')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Review work area for safety concerns</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.safetyChecks.measurementDevicesCalibrated}
                  onChange={() => handleCheckboxChange('measurementDevicesCalibrated')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Measurement devices calibration verified</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.safetyChecks.measurementDevicesClean}
                  onChange={() => handleCheckboxChange('measurementDevicesClean')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Measurement devices clean and zeroed</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.safetyChecks.ipcMeasurementUnderstood}
                  onChange={() => handleCheckboxChange('ipcMeasurementUnderstood')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">IPC measurement understanding confirmed</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.safetyChecks.materialIconGreen}
                  onChange={() => handleCheckboxChange('materialIconGreen')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Material icon is green</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.safetyChecks.previousRoutingStepsComplete}
                  onChange={() => handleCheckboxChange('previousRoutingStepsComplete')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Previous routing steps completed</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.safetyChecks.projectManagerNotesReviewed}
                  onChange={() => handleCheckboxChange('projectManagerNotesReviewed')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Project manager notes reviewed</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.safetyChecks.workOrderNotesReviewed}
                  onChange={() => handleCheckboxChange('workOrderNotesReviewed')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Work order notes reviewed</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.safetyChecks.setupOverviewReviewed}
                  onChange={() => handleCheckboxChange('setupOverviewReviewed')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Setup overview reviewed</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.safetyChecks.materialQuantityConfirmed}
                  onChange={() => handleCheckboxChange('materialQuantityConfirmed')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Material quantity confirmed</span>
              </label>
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
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center"
            >
              <Check className="h-5 w-5 mr-2" />
              Complete Checklist
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StartOfShiftChecklist;