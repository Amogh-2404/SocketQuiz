'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../context/GameContext';

const SplashScreen: React.FC = () => {
  const { connect } = useGame();
  const [playerName, setPlayerName] = React.useState('');
  const [modeSelection, setModeSelection] = React.useState<'normal' | 'conference'>('normal');

  const handlePlay = () => {
    if (playerName.trim()) {
      connect(playerName.trim(), modeSelection);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-screen p-4 relative"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 dark:from-blue-500/20 dark:to-indigo-500/20 rounded-full blur-3xl"></div>
      
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
        className="text-center mb-12 relative z-10"
      >
        <motion.h1 
          className="text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 dark:from-blue-400 dark:to-indigo-600 mb-6"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
        >
          PeerPlay Quiz
        </motion.h1>
        <motion.p 
          className="text-2xl text-gray-200 dark:text-gray-300 font-light"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Synchronized quiz fun with friends, enhanced by direct P2P video connection.
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, type: "spring", stiffness: 100 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="mb-8">
          <motion.input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-6 py-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 
                     text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 
                     dark:focus:ring-blue-500/50 transition-all duration-300"
            whileFocus={{ scale: 1.02 }}
          />
        </div>
        <div className="flex justify-center mb-4 space-x-4">
          <button onClick={() => setModeSelection('normal')} className={`px-4 py-2 rounded ${modeSelection === 'normal' ? 'bg-indigo-500 text-white' : 'bg-white/10 text-gray-200'}`}>Normal Mode</button>
          <button onClick={() => setModeSelection('conference')} className={`px-4 py-2 rounded ${modeSelection === 'conference' ? 'bg-indigo-500 text-white' : 'bg-white/10 text-gray-200'}`}>Conference Mode</button>
        </div>
        <motion.button
          onClick={handlePlay}
          disabled={!playerName.trim()}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300
                    ${playerName.trim() 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl' 
                      : 'bg-gray-500/50 text-gray-400 cursor-not-allowed'}`}
          whileHover={playerName.trim() ? { scale: 1.02 } : {}}
          whileTap={playerName.trim() ? { scale: 0.98 } : {}}
        >
          Join Game
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default SplashScreen; 