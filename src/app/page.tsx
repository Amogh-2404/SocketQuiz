'use client';

import React, { useState, useEffect } from 'react';
import { useGame } from './context/GameContext';
import SplashScreen from './components/SplashScreen';
import LobbyScreen from './components/LobbyScreen';
import QuizScreen from './components/QuizScreen';
import ResultsScreen from './components/ResultsScreen';
import ServerBusyModal from './components/ServerBusyModal';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const { gameState, errorMessage } = useGame();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Initialize dark mode based on user preference
  useEffect(() => {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
    
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <div className="min-h-screen transition-colors duration-300 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-blue-900">
      {/* Dark Mode Toggle */}
      <motion.button
        className="fixed top-4 right-4 z-50 p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleDarkMode}
        aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDarkMode ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </motion.button>

      {/* Error Message Display */}
      <AnimatePresence>
        {errorMessage && gameState !== 'error' && (
          <motion.div 
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md shadow-md"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
          >
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Game Screens */}
      <AnimatePresence mode="wait">
        {gameState === 'idle' || gameState === 'connecting' ? (
          <SplashScreen key="splash" />
        ) : gameState === 'lobby' ? (
          <LobbyScreen key="lobby" />
        ) : gameState === 'playing' ? (
          <QuizScreen key="quiz" />
        ) : gameState === 'results' ? (
          <ResultsScreen key="results" />
        ) : null}
      </AnimatePresence>

      {/* Server Busy Modal */}
      <ServerBusyModal />
    </div>
  );
}
