import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';
import { useShopStore } from '../store/useShopStore';

interface WorkOrderValidatorProps {
  workOrderNumber: string;
  onValidation: (isValid: boolean, existingTask?: any) => void;
  className?: string;
}

const WorkOrderValidator: React.FC<WorkOrderValidatorProps> = ({
  workOrderNumber,
  onValidation,
  className = ''
}) => {
  const [validationState, setValidationState] = useState<'idle' | 'checking' | 'valid' | 'duplicate' | 'invalid'>('idle');
  const [existingTask, setExistingTask] = useState<any>(null);
  const { tasks, getExpandedTask } = useShopStore();

  useEffect(() => {
    if (!workOrderNumber || workOrderNumber.length < 3) {
      setValidationState('idle');
      onValidation(false);
      return;
    }

    setValidationState('checking');

    // Simulate API delay for better UX
    const timer = setTimeout(() => {
      const existing = tasks.find(task => 
        task.workOrderNumber.toLowerCase() === workOrderNumber.toLowerCase()
      );

      if (existing) {
        const expandedTask = getExpandedTask(existing.id);
        setExistingTask(expandedTask);
        setValidationState('duplicate');
        onValidation(false, expandedTask);
      } else {
        setExistingTask(null);
        setValidationState('valid');
        onValidation(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [workOrderNumber, tasks, getExpandedTask, onValidation]);

  if (validationState === 'idle') return null;

  return (
    <div className={`mt-2 ${className}`}>
      {validationState === 'checking' && (
        <div className="flex items-center text-sm text-neutral-600">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-500 border-t-transparent mr-2"></div>
          Checking work order...
        </div>
      )}

      {validationState === 'valid' && (
        <div className="flex items-center text-sm text-success-600">
          <CheckCircle className="h-4 w-4 mr-2" />
          Work order is available
        </div>
      )}

      {validationState === 'duplicate' && existingTask && (
        <div className="bg-warning-50 border border-warning-200 rounded-md p-3">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-warning-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-warning-800">
                Work Order Already Exists
              </div>
              <div className="text-sm text-warning-700 mt-1">
                This work order is already in the system:
              </div>
              <div className="mt-2 bg-white rounded border border-warning-200 p-2">
                <div className="text-sm">
                  <div className="font-medium">{existingTask.workOrderNumber}</div>
                  <div className="text-neutral-600">{existingTask.description}</div>
                  <div className="text-xs text-neutral-500 mt-1">
                    Status: {existingTask.status} • Created: {new Date(existingTask.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="text-xs text-warning-600 mt-2">
                Please use a different work order number or update the existing one.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkOrderValidator;