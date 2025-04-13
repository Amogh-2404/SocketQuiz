'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';
import Button from './Button';
import Timer from './Timer';

const QuizScreen: React.FC = () => {
  const { 
    currentQuestion, 
    questionNumber, 
    totalQuestions, 
    timeRemaining, 
    timeLimit,
    selectedOption,
    submitAnswer,
    quit
  } = useGame();

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-900 to-purple-900 p-4">
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-bold mb-4">Loading next question...</h2>
          <div className="flex justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
            />
          </div>
        </motion.div>
      </div>
    );
  }

  // Check if the current question has a correctOption (meaning the question time is over)
  const isQuestionEnded = currentQuestion.correctOption !== undefined;
  const hasAnswered = selectedOption !== null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-900 to-purple-900 p-4">
      <motion.div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-3 py-1 rounded-full text-sm font-medium">
            Question {questionNumber} of {totalQuestions}
          </div>
          
          <Timer seconds={timeRemaining} total={timeLimit} />
        </div>
        
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {currentQuestion.question}
          </h2>
        </motion.div>
        
        <div className="space-y-3 mb-8">
          <AnimatePresence mode='wait'>
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedOption === index;
              const isCorrect = isQuestionEnded && index === currentQuestion.correctOption;
              const isIncorrect = isQuestionEnded && isSelected && !isCorrect;
              
              let bgColor = "bg-white dark:bg-gray-700";
              let borderColor = "border-gray-200 dark:border-gray-600";
              
              if (isQuestionEnded) {
                if (isCorrect) {
                  bgColor = "bg-green-100 dark:bg-green-800";
                  borderColor = "border-green-500 dark:border-green-400";
                } else if (isIncorrect) {
                  bgColor = "bg-red-100 dark:bg-red-800";
                  borderColor = "border-red-500 dark:border-red-400";
                }
              } else if (isSelected) {
                bgColor = "bg-blue-100 dark:bg-blue-800";
                borderColor = "border-blue-500 dark:border-blue-400";
              }
              
              return (
                <motion.button
                  key={index}
                  className={`w-full p-4 border-2 ${borderColor} ${bgColor} rounded-lg transition-colors relative overflow-hidden`}
                  onClick={() => !hasAnswered && !isQuestionEnded && submitAnswer(index)}
                  disabled={hasAnswered || isQuestionEnded}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + index * 0.1 }}
                  whileHover={!hasAnswered && !isQuestionEnded ? { scale: 1.02 } : {}}
                  whileTap={!hasAnswered && !isQuestionEnded ? { scale: 0.98 } : {}}
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center mr-3 font-medium">
                      {String.fromCharCode(65 + index)} {/* A, B, C, D */}
                    </div>
                    <span className="text-left text-gray-800 dark:text-gray-100">{option}</span>
                  </div>
                  
                  {isSelected && (
                    <motion.div
                      className="absolute inset-y-0 right-4 flex items-center"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </motion.div>
                  )}
                  
                  {isQuestionEnded && isCorrect && (
                    <motion.div
                      className="absolute inset-y-0 right-4 flex items-center"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-300" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </motion.div>
                  )}
                  
                  {isQuestionEnded && isIncorrect && (
                    <motion.div
                      className="absolute inset-y-0 right-4 flex items-center"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600 dark:text-red-300" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
        
        <div className="flex justify-between items-center">
          <Button variant="danger" onClick={quit}>
            Quit Game
          </Button>
          
          {isQuestionEnded && (
            <div className="text-gray-600 dark:text-gray-300 text-sm">
              Waiting for next question...
            </div>
          )}
          
          {!isQuestionEnded && hasAnswered && (
            <div className="text-gray-600 dark:text-gray-300 text-sm">
              Waiting for timer to complete...
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default QuizScreen; 