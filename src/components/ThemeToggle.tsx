import React from 'react';
import { Sun, Moon, RotateCcw } from 'lucide-react';
import { useShopStore } from '../store/useShopStore';
import { ThemeMode } from '../types';
import Tooltip from './Tooltip';

const ThemeToggle: React.FC = () => {
  const { themeMode, setThemeMode } = useShopStore();

  const themes = [
    { mode: ThemeMode.LIGHT, icon: Sun, label: 'Light Mode' },
    { mode: ThemeMode.DARK, icon: Moon, label: 'Dark Mode' },
    { mode: ThemeMode.INVERT, icon: RotateCcw, label: 'Invert Mode' }
  ];

  const handleThemeChange = () => {
    const currentIndex = themes.findIndex(theme => theme.mode === themeMode);
    const nextIndex = (currentIndex + 1) % themes.length;
    setThemeMode(themes[nextIndex].mode);
  };

  const currentTheme = themes.find(theme => theme.mode === themeMode) || themes[0];
  const CurrentIcon = currentTheme.icon;

  return (
    <Tooltip content={`Switch to ${themes[(themes.findIndex(t => t.mode === themeMode) + 1) % themes.length].label}`} position="bottom">
      <button
        onClick={handleThemeChange}
        className="p-2 bg-red-700 text-white rounded-md hover:bg-red-600 transition-colors flex items-center"
        title={currentTheme.label}
      >
        <CurrentIcon className="h-5 w-5" />
      </button>
    </Tooltip>
  );
};

export default ThemeToggle;