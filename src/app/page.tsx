'use client';

// Add a console message at the top level to help with debugging
console.log('==========================================');
console.log('QuizSocket App Loading');
console.log('If you\'re having issues with blank video boxes:');
console.log('1. Make sure your camera/mic permissions are enabled');
console.log('2. Try clicking the restart button in the top-right');
console.log('3. Check browser console for any error messages');
console.log('==========================================');

import React from 'react';
import { useGame } from './context/GameContext';
import SplashScreen from './components/SplashScreen';
import LobbyScreen from './components/LobbyScreen';
import QuizScreen from './components/QuizScreen';
import ResultsScreen from './components/ResultsScreen';
import ServerBusyModal from './components/ServerBusyModal';
import NetworkStats from './components/NetworkStats';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const { gameState } = useGame();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 transition-all duration-500">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
      
      <AnimatePresence mode="wait">
        <motion.div
          key={gameState.gameState}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="relative z-10"
        >
          {gameState.gameState === 'idle' || gameState.gameState === 'connecting' ? (
            <SplashScreen key="splash" />
          ) : gameState.gameState === 'lobby' ? (
            <LobbyScreen key="lobby" />
          ) : gameState.gameState === 'playing' ? (
            <QuizScreen key="quiz" />
          ) : gameState.gameState === 'results' ? (
            <ResultsScreen key="results" />
          ) : null}
        </motion.div>
      </AnimatePresence>

      <ServerBusyModal />
      <NetworkStats />
    </div>
  );
}
