'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../context/GameContext';
import Timer from './Timer';

const QuizScreen: React.FC = () => {
  const { gameState, player, submitAnswer } = useGame();
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  const currentQuestion = gameState.currentQuestion;
  const questionNumber = gameState.questionNumber;
  const totalQuestions = gameState.totalQuestions;
  const timeLimit = gameState.timeLimit;

  // Reset selected answer when question changes
  useEffect(() => {
    setSelectedAnswer(null);
    setTimeRemaining(timeLimit);
  }, [questionNumber, timeLimit]);

  // Countdown timer effect that syncs with server time
  useEffect(() => {
    if (!currentQuestion || currentQuestion.correctOption !== undefined) return;
    
    // Initial sync with server time
    setTimeRemaining(gameState.timeRemaining);
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        // Never go below 0
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [currentQuestion, gameState.timeRemaining]);

  const handleAnswerSelect = (answerIndex: number) => {
    if (selectedAnswer === null) {
      setSelectedAnswer(answerIndex);
      submitAnswer(answerIndex);
    }
  };

  if (!currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-2xl text-white"
        >
          Loading question...
        </motion.div>
      </div>
    );
  }

  const isAnswerRevealed = currentQuestion.correctOption !== undefined;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-screen p-4 relative"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 dark:from-blue-500/20 dark:to-indigo-500/20 rounded-full blur-3xl"></div>
      
      <motion.div 
        className="w-full max-w-2xl bg-white/10 backdrop-blur-sm dark:bg-gray-800/50 rounded-xl shadow-2xl p-8 relative z-10"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        {/* Question Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xl text-white font-medium">
              Question {questionNumber} of {totalQuestions}
            </span>
            {!isAnswerRevealed && (
              <div className="flex items-center">
                <span className="text-white mr-2">Time:</span>
                <Timer time={timeRemaining} timeLimit={timeLimit} />
              </div>
            )}
          </div>
          <div className="w-full bg-white/10 dark:bg-gray-700/30 rounded-full h-3 overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Question */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-white mb-2">
            {currentQuestion.question}
          </h2>
        </motion.div>

        {/* Answers */}
        <div className="grid grid-cols-1 gap-4">
          {currentQuestion.options.map((option, index) => {
            const isCorrect = isAnswerRevealed && index === currentQuestion.correctOption;
            const isWrong = isAnswerRevealed && selectedAnswer === index && index !== currentQuestion.correctOption;
            
            return (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                whileHover={selectedAnswer === null ? { scale: 1.02 } : {}}
                whileTap={selectedAnswer === null ? { scale: 0.98 } : {}}
                onClick={() => handleAnswerSelect(index)}
                disabled={selectedAnswer !== null}
                className={`p-5 rounded-xl text-left transition-all duration-300 backdrop-blur-sm border
                  ${selectedAnswer === null
                    ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    : selectedAnswer === index
                      ? isWrong 
                        ? 'bg-red-500/30 border-red-500 text-white'
                        : 'bg-green-500/30 border-green-500 text-white'
                      : isCorrect
                        ? 'bg-green-500/30 border-green-500 text-white'
                        : 'bg-white/5 border-white/10 text-gray-300'
                  }`}
              >
                <div className="flex items-center">
                  <span className={`w-8 h-8 flex items-center justify-center rounded-full 
                    ${isCorrect ? 'bg-green-500' : isWrong ? 'bg-red-500' : 'bg-white/20'} 
                    text-white font-medium mr-4`}>
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="font-medium text-lg">{option}</span>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Score Display */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
        >
          <span className="text-xl font-semibold text-white/90">
            Your Score: <span className="text-purple-300">{player?.score || 0}</span>
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default QuizScreen; 