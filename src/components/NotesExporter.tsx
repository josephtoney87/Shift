import React from 'react';
import { Download, FileText, Calendar } from 'lucide-react';
import { useShopStore } from '../store/useShopStore';
import { format, parseISO } from 'date-fns';

interface NotesExporterProps {
  date?: string;
  shiftId?: string;
  taskId?: string;
  className?: string;
}

const NotesExporter: React.FC<NotesExporterProps> = ({
  date,
  shiftId,
  taskId,
  className = ''
}) => {
  const { tasks, taskNotes, workers, shifts, parts, getExpandedTask } = useShopStore();

  const generateNotesReport = () => {
    let filteredTasks = tasks;
    let reportTitle = 'All Notes Report';

    // Filter tasks based on criteria
    if (date) {
      filteredTasks = tasks.filter(task => task.createdAt.startsWith(date));
      reportTitle = `Notes Report - ${format(parseISO(date), 'MMMM d, yyyy')}`;
    }
    
    if (shiftId) {
      filteredTasks = filteredTasks.filter(task => task.shiftId === shiftId);
      const shift = shifts.find(s => s.id === shiftId);
      reportTitle += ` - Shift ${shift?.type || 'Unknown'}`;
    }

    if (taskId) {
      filteredTasks = filteredTasks.filter(task => task.id === taskId);
      const task = filteredTasks[0];
      if (task) {
        reportTitle = `Notes Report - ${task.workOrderNumber}`;
      }
    }

    // Collect all notes for filtered tasks
    const notesData = filteredTasks.map(task => {
      const expandedTask = getExpandedTask(task.id);
      const taskNotesFiltered = taskNotes.filter(note => note.taskId === task.id);
      
      return {
        task: expandedTask,
        notes: taskNotesFiltered.map(note => ({
          ...note,
          workerName: workers.find(w => w.id === note.workerId)?.name || 'Unknown Worker'
        }))
      };
    }).filter(item => item.notes.length > 0);

    return { notesData, reportTitle };
  };

  const exportToText = () => {
    const { notesData, reportTitle } = generateNotesReport();
    
    if (notesData.length === 0) {
      alert('No notes found for the selected criteria.');
      return;
    }

    let content = `${reportTitle}\n`;
    content += `Generated: ${format(new Date(), 'MMMM d, yyyy HH:mm')}\n`;
    content += '='.repeat(60) + '\n\n';

    notesData.forEach(({ task, notes }) => {
      if (!task) return;
      
      content += `Work Order: ${task.workOrderNumber}\n`;
      content += `Description: ${task.description}\n`;
      content += `Status: ${task.status}\n`;
      content += `Created: ${format(parseISO(task.createdAt), 'MMMM d, yyyy HH:mm')}\n`;
      content += '-'.repeat(40) + '\n';
      
      notes.forEach((note, index) => {
        content += `Note ${index + 1}:\n`;
        content += `  By: ${note.workerName}\n`;
        content += `  Time: ${format(parseISO(note.timestamp), 'MMMM d, yyyy HH:mm')}\n`;
        content += `  Content: ${note.noteText}\n\n`;
      });
      
      content += '\n';
    });

    // Create and download file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    const { notesData, reportTitle } = generateNotesReport();
    
    if (notesData.length === 0) {
      alert('No notes found for the selected criteria.');
      return;
    }

    let csvContent = 'Work Order,Description,Status,Task Created,Note By,Note Time,Note Content\n';

    notesData.forEach(({ task, notes }) => {
      if (!task) return;
      
      notes.forEach(note => {
        const row = [
          `"${task.workOrderNumber}"`,
          `"${task.description.replace(/"/g, '""')}"`,
          `"${task.status}"`,
          `"${format(parseISO(task.createdAt), 'yyyy-MM-dd HH:mm')}"`,
          `"${note.workerName}"`,
          `"${format(parseISO(note.timestamp), 'yyyy-MM-dd HH:mm')}"`,
          `"${note.noteText.replace(/"/g, '""')}"`
        ].join(',');
        
        csvContent += row + '\n';
      });
    });

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const { notesData } = generateNotesReport();
  const hasNotes = notesData.length > 0;

  if (!hasNotes) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <button
        onClick={exportToText}
        className="flex items-center px-3 py-2 bg-neutral-600 text-white rounded-md hover:bg-neutral-700 text-sm"
        title="Export notes as text file"
      >
        <FileText className="h-4 w-4 mr-1" />
        Export TXT
      </button>
      <button
        onClick={exportToCSV}
        className="flex items-center px-3 py-2 bg-success-600 text-white rounded-md hover:bg-success-700 text-sm"
        title="Export notes as CSV file"
      >
        <Download className="h-4 w-4 mr-1" />
        Export CSV
      </button>
    </div>
  );
};

export default NotesExporter;