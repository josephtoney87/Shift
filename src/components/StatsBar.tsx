import React from 'react';
import { motion } from 'framer-motion';
import Tooltip from './Tooltip';

interface Stat {
  label: string;
  value: number;
  color: string;
}

interface StatsBarProps {
  stats: Stat[];
}

const StatsBar: React.FC<StatsBarProps> = ({ stats }) => {
  const getTooltipContent = (label: string) => {
    switch (label) {
      case 'Total Tasks':
        return 'Total number of tasks scheduled for the selected date';
      case 'Completed':
        return 'Number of tasks finished for the selected shift';
      case 'In Progress':
        return 'Tasks currently in progress during this shift';
      case 'Pending':
        return 'Number of tasks not started yet for the selected shift';
      case 'Carried Over':
        return 'Tasks that were moved from a previous shift';
      default:
        return `${label} tasks for the current date`;
    }
  };

  return (
    <div className="bg-white border-y border-neutral-200 shadow-sm">
      <div className="container mx-auto py-3 px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Tooltip
              key={stat.label}
              content={getTooltipContent(stat.label)}
              position="bottom"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex items-center space-x-3 cursor-help"
              >
                <div className={`${stat.color} w-12 h-12 rounded-full flex items-center justify-center text-white font-bold`}>
                  {stat.value}
                </div>
                <div>
                  <p className="text-sm text-neutral-500">{stat.label}</p>
                  <div className="w-full bg-neutral-200 rounded-full h-1.5 mt-1">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ 
                        width: stats.reduce((acc, curr) => acc + curr.value, 0) > 0
                          ? `${(stat.value / stats.reduce((acc, curr) => acc + curr.value, 0)) * 100}%`
                          : '0%'
                      }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                      className={`${stat.color} h-1.5 rounded-full`}
                    />
                  </div>
                </div>
              </motion.div>
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsBar;