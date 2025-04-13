'use client';

import React from 'react';
import { motion } from 'framer-motion';

type TimerProps = {
  seconds: number;
  total: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

const Timer: React.FC<TimerProps> = ({ 
  seconds, 
  total, 
  className = '',
  size = 'md'
}) => {
  // Calculate progress percentage
  const progress = Math.max(0, Math.min(100, (seconds / total) * 100));
  
  // Determine color based on remaining time
  let color = 'bg-green-500';
  if (progress < 25) {
    color = 'bg-red-500';
  } else if (progress < 50) {
    color = 'bg-orange-500';
  } else if (progress < 75) {
    color = 'bg-yellow-500';
  }
  
  const sizeClasses = {
    sm: 'w-16 h-16 text-lg',
    md: 'w-24 h-24 text-xl',
    lg: 'w-32 h-32 text-3xl'
  };

  return (
    <div className={`relative ${sizeClasses[size]} rounded-full ${className}`}>
      <div className="absolute inset-0 rounded-full bg-gray-200"></div>
      <motion.div 
        className={`absolute inset-0 rounded-full ${color} origin-center`}
        initial={{ rotate: 0 }}
        animate={{ 
          rotate: 360,
          background: color
        }}
        style={{ 
          clipPath: `polygon(50% 50%, 50% 0, ${progress > 75 ? '100% 0' : '50% 0'}, ${progress > 50 ? '100% 100%' : '50% 0'}, ${progress > 25 ? '0 100%' : '50% 0'}, ${progress > 0 ? '0 0' : '50% 0'}, 50% 0)` 
        }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 rounded-full bg-white dark:bg-gray-900 m-1"></div>
      <div className="absolute inset-0 flex items-center justify-center font-bold">
        <motion.span
          key={seconds}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {seconds}
        </motion.span>
      </div>
    </div>
  );
};

export default Timer; 