'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../context/GameContext';
import Button from './Button';
import Confetti from './Confetti';

const Medal: React.FC<{ rank: number }> = ({ rank }) => {
  // Medal colors based on rank
  const colors = {
    1: { bg: 'bg-yellow-500', text: 'text-yellow-900', border: 'border-yellow-600' },
    2: { bg: 'bg-gray-300', text: 'text-gray-800', border: 'border-gray-400' },
    3: { bg: 'bg-amber-600', text: 'text-amber-900', border: 'border-amber-700' },
  };
  
  const color = colors[rank as keyof typeof colors] || { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' };
  
  return (
    <motion.div
      className={`${color.bg} ${color.text} h-10 w-10 md:h-12 md:w-12 rounded-full border-2 ${color.border} flex items-center justify-center font-bold`}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ 
        type: 'spring',
        stiffness: 260,
        damping: 20,
        delay: 0.3 + (rank * 0.1)
      }}
    >
      {rank}
    </motion.div>
  );
};

const ResultRow: React.FC<{ 
  result: { id: string; name: string; score: number; rank: number; correctAnswers: number }; 
  isCurrentPlayer: boolean;
  delay: number;
}> = ({ result, isCurrentPlayer, delay }) => {
  return (
    <motion.div 
      className={`flex items-center p-4 rounded-lg mb-3 ${
        isCurrentPlayer ? 'bg-blue-100 dark:bg-blue-900' : 'bg-white dark:bg-gray-800'
      }`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Medal rank={result.rank} />
      
      <div className="ml-4 flex-grow">
        <div className="flex justify-between">
          <span className={`font-medium ${isCurrentPlayer ? 'text-blue-800 dark:text-blue-200' : 'text-gray-900 dark:text-white'}`}>
            {result.name} {isCurrentPlayer && <span className="text-xs">(You)</span>}
          </span>
          <span className="font-bold text-lg text-purple-600 dark:text-purple-300">
            {result.score} pts
          </span>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {result.correctAnswers} correct answer{result.correctAnswers !== 1 ? 's' : ''}
        </div>
      </div>
    </motion.div>
  );
};

const ResultsScreen: React.FC = () => {
  const { results, playerId, goHome } = useGame();
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Sort results by rank
  const sortedResults = [...results].sort((a, b) => a.rank - b.rank);
  
  // Find current player's rank
  const currentPlayerResult = results.find(result => result.id === playerId);
  const isWinner = currentPlayerResult?.rank === 1;
  
  useEffect(() => {
    // Show confetti animation for the winner
    if (isWinner) {
      setShowConfetti(true);
      
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isWinner]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-900 to-purple-900 p-4">
      <Confetti active={showConfetti} />
      
      <motion.div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <motion.h2 
            className="text-3xl font-bold text-gray-900 dark:text-white mb-1"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            Final Results
          </motion.h2>
          <motion.p
            className="text-gray-600 dark:text-gray-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            {isWinner ? 'Congratulations! You won! 🎉' : 'Game completed!'}
          </motion.p>
        </div>
        
        {sortedResults.length > 0 && (
          <div className="mb-8">
            {sortedResults.map((result, index) => (
              <ResultRow 
                key={result.id} 
                result={result} 
                isCurrentPlayer={result.id === playerId}
                delay={0.3 + (index * 0.1)}
              />
            ))}
          </div>
        )}
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <Button onClick={goHome} variant="primary" fullWidth>
            Back to Home
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ResultsScreen; 