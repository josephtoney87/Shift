import React from 'react';
import { motion } from 'framer-motion';

interface Stat {
  label: string;
  value: number;
  color: string;
}

interface StatsBarProps {
  stats: Stat[];
}

const StatsBar: React.FC<StatsBarProps> = ({ stats }) => {
  return (
    <div className="bg-white border-y border-neutral-200 shadow-sm">
      <div className="container mx-auto py-3 px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex items-center space-x-3"
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
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsBar;