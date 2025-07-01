import React, { useEffect } from 'react';
import ShiftDashboard from './components/ShiftDashboard';
import { useAutoSync } from './hooks/useAutoSync';
import { syncManager } from './services/syncManager';
import { deviceManager } from './services/deviceManager';

function App() {
  // Initialize auto-sync system
  useAutoSync();

  useEffect(() => {
    // Initialize all services
    console.log('🚀 Initializing CNC Shop Management Application...');
    
    // Setup cleanup on app unmount
    return () => {
      syncManager.cleanup();
      deviceManager.cleanup();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-200 dark:bg-gray-900 transition-colors duration-200">
      <ShiftDashboard />
    </div>
  );
}

export default App;