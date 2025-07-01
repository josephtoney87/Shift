import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';
import Tooltip from './Tooltip';

const DarkModeToggle: React.FC = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <Tooltip content={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'} position="bottom">
      <button
        onClick={toggleDarkMode}
        className="p-2 rounded-lg transition-colors duration-200 hover:bg-white/10 dark:hover:bg-black/10"
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDarkMode ? (
          <Sun className="h-5 w-5 text-yellow-400" />
        ) : (
          <Moon className="h-5 w-5 text-gray-300" />
        )}
      </button>
    </Tooltip>
  );
};

export default DarkModeToggle;