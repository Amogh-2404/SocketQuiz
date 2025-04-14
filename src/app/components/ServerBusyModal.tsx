'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';

const ServerBusyModal: React.FC = () => {
  const { gameState } = useGame();
  
  const isServerBusy = gameState.gameState === 'error' && gameState.errorMessage === 'SERVER_BUSY';
  
  return (
    <AnimatePresence>
      {isServerBusy && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 
                      w-full max-w-md bg-gradient-to-br from-purple-900 to-indigo-900 
                      rounded-2xl shadow-2xl overflow-hidden p-1"
          >
            <div className="relative bg-black/20 backdrop-blur-sm rounded-xl p-8">
              {/* Decorative elements */}
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl"></div>
              </div>
              
              <div className="relative z-10">
                {/* Pulsing server icon */}
                <div className="flex justify-center mb-6">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      opacity: [1, 0.8, 1] 
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                    className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center"
                  >
                    <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </motion.div>
                </div>
                
                <h2 className="text-2xl font-bold text-white text-center mb-3">Server Busy</h2>
                
                <p className="text-white/80 text-center mb-6">
                  All quiz sessions are currently full. The maximum limit of 3 concurrent games has been reached. 
                  Please try again in a few minutes when other players have completed their games.
                </p>
                
                <div className="flex justify-center">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 
                              text-white font-medium rounded-lg shadow-lg"
                    onClick={() => window.location.reload()}
                  >
                    Try Again
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ServerBusyModal; 