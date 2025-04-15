'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface TimerProps {
  time?: number;      // Legacy prop - current remaining time in ms
  timeLimit?: number; // Total time in ms
  duration?: number;  // Legacy prop - same as timeLimit
  remaining?: number; // Current remaining time in ms
  onExpire?: () => void;
  onTick?: (remainingTime: number) => void; // Add prop for timer tick callback
  label?: string;
  colors?: {
    default: string;
    warning: string;
    danger: string;
  };
  warningThreshold?: number; // Percentage at which to show warning color
  dangerThreshold?: number;  // Percentage at which to show danger color
  size?: 'small' | 'medium' | 'large';
}

const Timer: React.FC<TimerProps> = ({
  time,
  timeLimit,
  duration,
  remaining,
  onExpire,
  onTick,
  label,
  colors = {
    default: '#4ade80', // green-400
    warning: '#fbbf24', // amber-400
    danger: '#f87171',  // red-400
  },
  warningThreshold = 50,
  dangerThreshold = 25,
  size = 'medium',
}) => {
  // Determine the total time and initial time based on the props provided
  const totalTime = useRef(timeLimit || duration || 60000); // Default to 60s if not provided
  
  // Determine the initial time - prefer 'remaining' over 'time' for clarity
  const initialTime = remaining !== undefined 
    ? remaining 
    : (time !== undefined ? time : totalTime.current);
  
  const [internalTime, setInternalTime] = useState(initialTime);

  // Log when Timer is mounted and when internalTime changes
  useEffect(() => {
    console.log('[Timer] Mounted with initialTime:', initialTime);
  }, []);
  useEffect(() => {
    console.log('[Timer] internalTime updated:', internalTime);
    if (internalTime === 0) {
      console.warn('[Timer] Timer reached zero!');
    }
  }, [internalTime]);
  const [isRunning, setIsRunning] = useState(true);
  const [color, setColor] = useState(colors.default);
  const lastTickTimeRef = useRef(Date.now());
  const animationFrameRef = useRef<number | null>(null);
  const mounted = useRef(true);
  const previousTimeRef = useRef(initialTime);
  const tickCallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastVisibilityChangeTimeRef = useRef(Date.now());
  
  // Force timer reset when remaining/time props change significantly
  useEffect(() => {
    // Be more sensitive with time changes to ensure proper updates
    const significantChange = Math.abs((remaining || time || 0) - internalTime) > 50;
    if (significantChange && (remaining !== undefined || time !== undefined)) {
      const newTime = remaining !== undefined ? remaining : (time !== undefined ? time : totalTime.current);
      // Only reset if newTime >= 1000ms or exactly 0 (question over)
      if (newTime >= 1000) {
        console.log(`Timer reset from ${internalTime}ms to ${newTime}ms`);
        setInternalTime(newTime);
        previousTimeRef.current = newTime;
        lastTickTimeRef.current = Date.now();
        lastVisibilityChangeTimeRef.current = Date.now();
        // If time is greater than 0, make sure the timer is running
        if (newTime > 0 && !isRunning) {
          setIsRunning(true);
        }
      } else if (newTime === 0) {
        // Question is over, set timer to zero
        setInternalTime(0);
        previousTimeRef.current = 0;
        setIsRunning(false);
        if (onExpire) onExpire();
        console.log('[Timer] Timer expired due to backend update (0ms)');
      } else if (newTime > 0 && newTime < 1000) {
        // Backend sent a value < 1s: treat as expired
        setInternalTime(0);
        previousTimeRef.current = 0;
        setIsRunning(false);
        if (onExpire) onExpire();
        console.log(`[Timer] Timer forced to expire due to backend update: ${newTime}ms`);
      } else {
        // Ignore updates that would set timer to negative
        console.log(`[Timer] Ignored backend update: tried to reset to ${newTime}ms`);
      }
    }
  }, [remaining, time, internalTime, isRunning]);
  
  // Keep totalTime ref updated
  useEffect(() => {
    totalTime.current = timeLimit || duration || 60000;
  }, [timeLimit, duration]);
  
  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();
      
      if (document.visibilityState === 'visible') {
        // When returning to visible state, calculate time that passed while hidden
        const timeElapsedWhileHidden = now - lastVisibilityChangeTimeRef.current;
        
        // Only apply if component is mounted and the timer is running
        if (mounted.current && isRunning) {
          setInternalTime(prevTime => {
            // Calculate new time value, ensuring we don't go below zero
            return Math.max(0, prevTime - timeElapsedWhileHidden);
          });
        }
      }
      
      // Always update the timestamp regardless of visibility state
      lastTickTimeRef.current = now;
      lastVisibilityChangeTimeRef.current = now;
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRunning]);
  
  // Reset mounted status on unmount
  useEffect(() => {
    return () => {
      mounted.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (tickCallbackTimeoutRef.current) {
        clearTimeout(tickCallbackTimeoutRef.current);
      }
    };
  }, []);
  
  // Main timer logic
  useEffect(() => {
    if (!isRunning) return;
    
    // Handle special case: if timer is already at 0, stop
    if (internalTime <= 0) {
      setIsRunning(false);
      if (onExpire) {
        onExpire();
      }
      return;
    }
    
    const tick = () => {
      // Skip ticks when document is hidden to save resources and prevent timing issues
      if (document.visibilityState !== 'visible') {
        if (mounted.current) {
          animationFrameRef.current = requestAnimationFrame(tick);
        }
        return;
      }
      
      // Get elapsed time since last tick
      const now = Date.now();
      const elapsed = now - lastTickTimeRef.current;
      
      // Avoid negative time jumps from system clock changes
      const effectiveElapsed = elapsed > 0 ? Math.min(elapsed, 250) : 16;
      lastTickTimeRef.current = now;
      
      // Update internal time
      setInternalTime(prevTime => {
        // Calculate new time value
        const newTime = Math.max(0, prevTime - effectiveElapsed);
        
        // Call onTick callback if provided
        // Only call when time changes significantly or reaches zero
        if (onTick && mounted.current && (previousTimeRef.current - newTime > 50 || newTime === 0)) {
          // Call immediately for more responsive updates
          previousTimeRef.current = newTime;
          onTick(newTime);
        }
        
        // Handle timer expiration
        if (newTime <= 0 && prevTime > 0) {
          // Call onExpire asynchronously
          if (onExpire) {
            setTimeout(onExpire, 0);
          }
          
          // Stop the timer
          setIsRunning(false);
        }
        
        return newTime;
      });
      
      // Continue animation if component is still mounted and timer is running
      if (mounted.current && isRunning) {
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    };
    
    // Start the animation
    animationFrameRef.current = requestAnimationFrame(tick);
    
    // Cleanup on unmount or when dependencies change
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRunning, onExpire, onTick]);
  
  // Determine color based on time remaining
  useEffect(() => {
    const percentRemaining = (internalTime / totalTime.current) * 100;
    
    let newColor;
    if (percentRemaining <= dangerThreshold) {
      newColor = colors.danger;
    } else if (percentRemaining <= warningThreshold) {
      newColor = colors.warning;
    } else {
      newColor = colors.default;
    }
    
    setColor(newColor);
  }, [internalTime, colors, warningThreshold, dangerThreshold]);
  
  // Format time for display
  const formattedTime = () => {
    const seconds = Math.ceil(internalTime / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return remainingSeconds.toString();
  };
  
  // Calculate progress percentage
  const progress = Math.max(0, Math.min(1, internalTime / totalTime.current));
  const circumference = 2 * Math.PI * 40; // Circle with radius 40
  const dashOffset = circumference * (1 - progress);
  
  // Determine size based on prop
  const sizeClasses = {
    small: 'w-16 h-16 text-sm',
    medium: 'w-24 h-24 text-lg',
    large: 'w-32 h-32 text-xl',
  };
  
  return (
    <div className={`flex flex-col items-center justify-center ${label ? 'space-y-2' : ''}`}>
      <div className={`relative flex items-center justify-center ${sizeClasses[size]}`}>
        {/* Background circle */}
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="transparent"
            stroke="#e5e7eb" // gray-200
            strokeWidth="8"
          />
          {/* Progress circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="40"
            fill="transparent"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 50 50)"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ 
              duration: 0.1, 
              ease: "linear"
            }}
          />
        </svg>
        {/* Time display */}
        <div className="absolute font-mono font-bold">{formattedTime()}</div>
      </div>
      {label && <div className="text-sm text-gray-600">{label}</div>}
    </div>
  );
};

export default Timer; 