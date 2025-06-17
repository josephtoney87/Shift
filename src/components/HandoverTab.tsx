import React from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { ClipboardList, AlertTriangle } from 'lucide-react';
import { useShopStore } from '../store/useShopStore';
import HandoverReport from './HandoverReport';

const HandoverTab: React.FC = () => {
  const { 
    shifts, 
    shiftReports, 
    workers,
    tasks,
    taskTimeLogs,
    selectedDate,
    generateHandoverReport,
    acknowledgeHandoverReport
  } = useShopStore();

  // Get today's handover reports
  const todayReports = shiftReports
    .filter(report => report.date === selectedDate && report.handoverReport)
    .map(report => ({
      ...report,
      shift: shifts.find(s => s.id === report.shiftId)!
    }))
    .sort((a, b) => {
      const timeA = a.shift.startTime;
      const timeB = b.shift.startTime;
      return timeA.localeCompare(timeB);
    });

  const handleGenerateReport = (shiftId: string) => {
    generateHandoverReport(shiftId, selectedDate);
  };

  const handleAcknowledge = (reportId: string) => {
    // Assume first worker for demo purposes
    // In a real app, use logged-in worker
    const workerId = workers[0].id;
    acknowledgeHandoverReport(reportId, workerId);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-neutral-800">
          Shift Handover Reports
        </h2>
        <div className="text-sm text-neutral-500">
          {format(new Date(selectedDate), 'MMMM d, yyyy')}
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-6">
        {shifts.map((shift) => {
          const report = todayReports.find(r => r.shiftId === shift.id);
          
          return (
            <motion.div
              key={shift.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              {/* Shift Header */}
              <div className="bg-neutral-800 text-white p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">Shift {shift.type}</h3>
                    <div className="text-sm text-neutral-300">
                      {shift.startTime} - {shift.endTime}
                    </div>
                  </div>
                  {!report?.handoverReport && (
                    <button
                      onClick={() => handleGenerateReport(shift.id)}
                      className="px-4 py-2 bg-white text-neutral-800 rounded-md hover:bg-neutral-100 flex items-center"
                    >
                      <ClipboardList className="h-5 w-5 mr-2" />
                      Generate Report
                    </button>
                  )}
                </div>
              </div>

              {/* Report Content */}
              {report?.handoverReport ? (
                <HandoverReport
                  report={report.handoverReport}
                  onAcknowledge={
                    !report.handoverReport.acknowledgedBy
                      ? () => handleAcknowledge(report.id)
                      : undefined
                  }
                />
              ) : (
                <div className="p-8 text-center">
                  <AlertTriangle className="h-12 w-12 text-warning-500 mx-auto mb-4" />
                  <p className="text-neutral-600">
                    No handover report has been generated for this shift yet.
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default HandoverTab;