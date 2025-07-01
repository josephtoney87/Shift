import React, { useEffect } from 'react';
import ShiftDashboard from './components/ShiftDashboard';
import { useAutoSync } from './hooks/useAutoSync';
import { syncManager } from './services/syncManager';
import { deviceManager } from './services/deviceManager';
import { useShopStore } from './store/useShopStore';
import { ThemeMode } from './types';

function App() {
  const { themeMode } = useShopStore();
  
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

  const getThemeClasses = () => {
    switch (themeMode) {
      case ThemeMode.DARK:
        return 'min-h-screen bg-gray-900 text-white';
      case ThemeMode.INVERT:
        return 'min-h-screen bg-gray-400';
      case ThemeMode.LIGHT:
      default:
        return 'min-h-screen bg-gray-200';
    }
  };

  return (
    <div className={getThemeClasses()}>
      <ShiftDashboard />
    </div>
  );
}

export default App;