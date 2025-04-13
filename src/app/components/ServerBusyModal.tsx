'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';
import Modal from './Modal';
import Button from './Button';
import { useGame } from '../context/GameContext';

const serverBusyVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.5 }
  }
};

const iconVariants: Variants = {
  hidden: { rotate: 0, scale: 0.8 },
  visible: { 
    rotate: 360, 
    scale: 1,
    transition: { 
      duration: 1.5, 
      repeat: Infinity, 
      repeatType: "loop", 
      ease: "easeInOut" 
    }
  }
};

const textVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.5, 
      delay: 0.2 
    }
  }
};

const ServerBusyModal: React.FC = () => {
  const { isServerBusy, goHome } = useGame();

  return (
    <Modal 
      isOpen={isServerBusy} 
      onClose={goHome}
      title="Server Busy"
      showCloseButton={false}
    >
      <div className="flex flex-col items-center text-center">
        <motion.div 
          className="w-20 h-20 mb-6 bg-red-500 rounded-full flex items-center justify-center"
          variants={iconVariants}
          initial="hidden"
          animate="visible"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-10 w-10 text-white" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        </motion.div>
        
        <motion.p 
          className="text-gray-600 dark:text-gray-300 mb-6"
          variants={textVariants}
          initial="hidden"
          animate="visible"
        >
          All quiz sessions are currently full. The maximum of 3 concurrent games has been reached. Please try again later.
        </motion.p>
        
        <Button onClick={goHome}>
          Return to Home
        </Button>
      </div>
    </Modal>
  );
};

export default ServerBusyModal; 