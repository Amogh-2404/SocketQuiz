'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface TimerProps {
  time: number;
  timeLimit?: number;
}

const Timer: React.FC<TimerProps> = ({ time, timeLimit = 15 }) => {
  // Calculate progress percentage (0-100)
  const progress = (time / timeLimit) * 100;
  
  // Determine color based on time remaining
  const getColor = () => {
    if (progress > 60) return 'bg-green-500';
    if (progress > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  return (
    <div className="flex items-center">
      <div className="w-16 h-16 relative mr-3">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            className="fill-none stroke-white/20"
            cx="50"
            cy="50"
            r="40"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <motion.circle
            className={`fill-none ${getColor()}`}
            cx="50"
            cy="50"
            r="40"
            strokeWidth="8"
            strokeDasharray="251.2"
            strokeDashoffset={251.2 - (251.2 * progress) / 100}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            initial={{ strokeDashoffset: 251.2 }}
            animate={{ strokeDashoffset: 251.2 - (251.2 * progress) / 100 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </svg>
        <motion.div
          className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-white font-bold text-xl"
          key={time}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {time}
        </motion.div>
      </div>
      
      <motion.div
        className={`h-2 w-32 rounded-full overflow-hidden bg-white/20 hidden md:block`}
      >
        <motion.div
          className={`h-full ${getColor()}`}
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </motion.div>
    </div>
  );
};

export default Timer; 