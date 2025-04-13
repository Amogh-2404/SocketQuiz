'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';
import Button from './Button';
import Timer from './Timer';

const playerVariants = {
  initial: { 
    opacity: 0, 
    y: 20,
    scale: 0.8
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    scale: 0.8,
    transition: { duration: 0.2 }
  }
};

const LobbyScreen: React.FC = () => {
  const { players, lobbyTimeRemaining, setPlayerName, quit } = useGame();
  const [name, setName] = useState('');
  const [hasSetName, setHasSetName] = useState(false);

  const handleSubmitName = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setPlayerName(name.trim());
      setHasSetName(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-900 to-purple-900 p-4">
      <motion.div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-6">
          <motion.h2 
            className="text-2xl font-bold text-gray-900 dark:text-white mb-1"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            Game Lobby
          </motion.h2>
          <motion.p
            className="text-gray-600 dark:text-gray-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            Waiting for players to join...
          </motion.p>
        </div>

        <div className="flex justify-center mb-6">
          <Timer 
            seconds={lobbyTimeRemaining} 
            total={15} 
            size="lg"
          />
        </div>

        {!hasSetName && (
          <motion.form 
            onSubmit={handleSubmitName}
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <div className="mb-4">
              <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Your Name
              </label>
              <input
                type="text"
                id="playerName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter your name"
                maxLength={20}
              />
            </div>
            <Button type="submit" fullWidth disabled={!name.trim()}>
              Set Name
            </Button>
          </motion.form>
        )}

        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">
            Players ({players.length})
          </h3>
          
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 min-h-[120px]">
            <AnimatePresence>
              {players.map((player) => (
                <motion.div
                  key={player.id}
                  className="flex items-center p-2 mb-2 bg-white dark:bg-gray-800 rounded-md shadow-sm"
                  variants={playerVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-3">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {player.name}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="text-center text-gray-600 dark:text-gray-400 text-sm mb-6">
          Game will start automatically in <span className="font-bold">{lobbyTimeRemaining}</span> seconds
        </div>

        <Button variant="danger" onClick={quit} fullWidth>
          Quit Game
        </Button>
      </motion.div>
    </div>
  );
};

export default LobbyScreen; 