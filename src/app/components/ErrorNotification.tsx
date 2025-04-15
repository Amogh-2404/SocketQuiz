'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebRTC } from '../context/WebRTCContext';

interface ErrorNotificationProps {
  message?: string;
  autoHide?: boolean;
  duration?: number;
}

export default function ErrorNotification({ 
  message, 
  autoHide = true,
  duration = 5000 
}: ErrorNotificationProps) {
  const { streamError, restartStreams, enableCompatibilityMode } = useWebRTC();
  const [visible, setVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState(message || streamError);
  
  // Show notification when we get a stream error or message prop
  useEffect(() => {
    if (message || streamError) {
      setErrorMsg(message || streamError);
      setVisible(true);
      
      // Auto-hide after duration if enabled
      if (autoHide) {
        const timer = setTimeout(() => {
          setVisible(false);
        }, duration);
        
        return () => clearTimeout(timer);
      }
    } else {
      setVisible(false);
    }
  }, [message, streamError, autoHide, duration]);
  
  // Get helpful suggestions based on error message
  const getHelpfulSuggestion = () => {
    if (!errorMsg) return null;
    
    if (errorMsg.includes('permission') || errorMsg.includes('denied')) {
      return 'Please check your browser permissions for camera and microphone access.';
    }
    
    if (errorMsg.includes('aborted') || errorMsg.includes('Play error')) {
      return 'The media stream was interrupted. This might be due to camera permissions or another app using your camera.';
    }
    
    if (errorMsg.includes('cannot read') || errorMsg.includes('undefined') || errorMsg.includes('null')) {
      return 'There was a program error. Refreshing the page might help.';
    }
    
    return 'Try refreshing the page or enabling compatibility mode if the issue persists.';
  };
  
  if (!visible) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        className="fixed top-4 right-4 bg-red-500 text-white p-3 rounded-md shadow-lg z-50 max-w-md"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col">
          <div className="flex items-start">
            <span className="mr-2">⚠️</span>
            <div>
              <h3 className="font-bold">Error</h3>
              <p className="text-sm mb-2">{errorMsg}</p>
              <p className="text-xs italic">{getHelpfulSuggestion()}</p>
            </div>
            <button 
              onClick={() => setVisible(false)}
              className="ml-2 text-white opacity-70 hover:opacity-100"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          
          <div className="flex mt-2 space-x-2">
            <button
              onClick={restartStreams}
              className="bg-white text-red-500 px-2 py-1 text-sm rounded"
            >
              Restart Media
            </button>
            <button
              onClick={enableCompatibilityMode}
              className="bg-yellow-400 text-gray-900 px-2 py-1 text-sm rounded"
            >
              Try Compatibility Mode
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
} 