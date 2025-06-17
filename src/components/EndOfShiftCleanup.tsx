import React, { useState } from 'react';
import { Check, X, Upload } from 'lucide-react';
import { useShopStore } from '../store/useShopStore';

interface EndOfShiftCleanupProps {
  onComplete?: () => void;
}

const EndOfShiftCleanup: React.FC<EndOfShiftCleanupProps> = ({ onComplete }) => {
  const { createEndOfShiftCleanup } = useShopStore();
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Preparation Checks */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Preparation</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.preparationChecks.wayLubeChecked}
                  onChange={() => handleCheckboxChange('preparationChecks', 'wayLubeChecked')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Way lube check, if less than half top it off</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.preparationChecks.coolantLevelChecked}
                  onChange={() => handleCheckboxChange('preparationChecks', 'coolantLevelChecked')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Coolant level check, if low, fill</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.preparationChecks.toolboxOrganized}
                  onChange={() => handleCheckboxChange('preparationChecks', 'toolboxOrganized')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">All toolbox tools put away in appropriate spots</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.preparationChecks.deburringToolsOrganized}
                  onChange={() => handleCheckboxChange('preparationChecks', 'deburringToolsOrganized')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Organize all deburring and measuring tools currently used</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.preparationChecks.torqueWrenchCondition}
                  onChange={() => handleCheckboxChange('preparationChecks', 'torqueWrenchCondition')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Torque wrench and hammer in good condition and hanging in their spot</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.preparationChecks.setupToolsStored}
                  onChange={() => handleCheckboxChange('preparationChecks', 'setupToolsStored')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">If in middle of setup, put away all finished items</span>
              </label>
            </div>
          </div>

          {/* Cleaning Checks */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Clean</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.cleaningChecks.dirtyRagsDisposed}
                  onChange={() => handleCheckboxChange('cleaningChecks', 'dirtyRagsDisposed')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Pick up all dirty rags and dispose properly</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.cleaningChecks.chipBarrelEmptied}
                  onChange={() => handleCheckboxChange('cleaningChecks', 'chipBarrelEmptied')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Empty and reposition chip barrel, ensure proper material separation</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.cleaningChecks.coolantDrainsCleaned}
                  onChange={() => handleCheckboxChange('cleaningChecks', 'coolantDrainsCleaned')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Clean coolant drains inside machine and empty auger</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.cleaningChecks.coolantScreenCleaned}
                  onChange={() => handleCheckboxChange('cleaningChecks', 'coolantScreenCleaned')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Clean screen underneath coolant drain in tank</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.cleaningChecks.floorMatCleaned}
                  onChange={() => handleCheckboxChange('cleaningChecks', 'floorMatCleaned')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Shake out floor mat and clean underneath</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.cleaningChecks.toolsStored}
                  onChange={() => handleCheckboxChange('cleaningChecks', 'toolsStored')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Put away all tool holders and tools not being used</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.cleaningChecks.areaSweptMopped}
                  onChange={() => handleCheckboxChange('cleaningChecks', 'areaSweptMopped')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Sweep and/or mop area</span>
              </label>
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
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center"
            >
              <Check className="h-5 w-5 mr-2" />
              Complete Cleanup
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EndOfShiftCleanup;