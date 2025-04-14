'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../context/GameContext';
import Confetti from './Confetti';

const ResultsScreen: React.FC = () => {
  const { gameState, player, disconnect } = useGame();
  const [showConfetti, setShowConfetti] = React.useState(false);

  React.useEffect(() => {
    const playerResult = gameState.results.find(r => r.playerId === player?.id);
    // Only show confetti for first place winner
    if (gameState.results.length > 0 && playerResult && playerResult.rank === 1) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [gameState.results, player?.id]);

  const playerResult = gameState.results.find(r => r.playerId === player?.id);
  const rank = playerResult?.rank || 0;

  const getPlayerName = (playerId: string) => {
    const foundPlayer = gameState.players.find(p => p.id === playerId);
    return foundPlayer?.name || 'Unknown Player';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-screen p-4 relative"
    >
      {showConfetti && <Confetti />}
      
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 dark:from-blue-500/20 dark:to-indigo-500/20 rounded-full blur-3xl"></div>
      
      <motion.div 
        className="w-full max-w-md bg-white/10 backdrop-blur-sm dark:bg-gray-800/50 rounded-xl shadow-2xl p-8 relative z-10"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        <div className="text-center mb-8">
          <motion.h2 
            className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 dark:from-blue-400 dark:to-indigo-600 mb-4"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 100 }}
          >
            Game Over!
          </motion.h2>
          <motion.p 
            className="text-2xl text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Your final score: <span className="font-bold text-purple-300">{player?.score || 0}</span>
          </motion.p>
        </div>

        {/* Medal Display */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.5 }}
          className="flex justify-center mb-8"
        >
          {rank === 1 && (
            <div className="text-8xl">🥇</div>
          )}
          {rank === 2 && (
            <div className="text-8xl">🥈</div>
          )}
          {rank === 3 && (
            <div className="text-8xl">🥉</div>
          )}
          {rank > 3 && (
            <div className="text-6xl">🏅</div>
          )}
        </motion.div>

        {/* Leaderboard */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <h3 className="text-xl font-semibold text-white mb-4">
            Final Rankings
          </h3>
          <div className="space-y-3">
            {gameState.results
              .sort((a, b) => a.rank - b.rank)
              .map((result, index) => (
                <motion.div
                  key={result.playerId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  className={`flex items-center justify-between p-4 rounded-xl backdrop-blur-sm border
                    ${result.playerId === player?.id
                      ? 'bg-white/20 border-purple-500'
                      : 'bg-white/5 border-white/10'
                    }`}
                >
                  <div className="flex items-center">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full 
                      ${result.rank === 1 ? 'bg-yellow-500' : 
                        result.rank === 2 ? 'bg-gray-300' : 
                        result.rank === 3 ? 'bg-amber-600' : 
                        'bg-white/20'} 
                      text-white font-bold`}>
                      {result.rank}
                    </span>
                    <span className="text-white ml-3 font-medium">
                      {getPlayerName(result.playerId)}
                      {result.playerId === player?.id && " (You)"}
                    </span>
                  </div>
                  <span className="font-bold text-purple-300">
                    {result.score}
                  </span>
                </motion.div>
              ))}
          </div>
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={disconnect}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
        >
          Play Again
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default ResultsScreen; 