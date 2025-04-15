'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../context/GameContext';

const SplashScreen: React.FC = () => {
  const { connect, gameState, socket } = useGame();
  const [playerName, setPlayerName] = useState('');
  const [connectAttempts, setConnectAttempts] = useState(0);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('idle');
  const isConnecting = gameState.gameState === 'connecting';

  // Reset error if state changes to lobby
  useEffect(() => {
    if (gameState.gameState === 'lobby') {
      setConnectError(null);
      setConnectionStatus('connected');
    }
  }, [gameState.gameState]);

  // Handle enter key press for joining
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && playerName.trim() && !isConnecting) {
      handlePlay();
    }
  };

  const handlePlay = () => {
    if (playerName.trim()) {
      setConnectAttempts(prev => prev + 1);
      setConnectError(null);
      setConnectionStatus('connecting');
      connect(playerName.trim());
      
      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        if (gameState.gameState === 'connecting' || gameState.gameState === 'idle') {
          setConnectError('Connection timeout. Please try again.');
          setConnectionStatus('timeout');
        }
      }, 10000); // 10 second timeout
      
      return () => clearTimeout(connectionTimeout);
    }
  };

  // Effect to retry connection if we're stuck in connecting state
  useEffect(() => {
    let retryTimeout: NodeJS.Timeout | null = null;
    
    if (isConnecting && connectAttempts > 0) {
      setConnectionStatus('connecting');
      
      retryTimeout = setTimeout(() => {
        // If we're still connecting after 5 seconds, retry
        if (gameState.gameState === 'connecting') {
          console.log('Still connecting after 5 seconds, trying again...');
          setConnectionStatus('retrying');
          connect(playerName.trim());
        }
      }, 5000);
    }
    
    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [isConnecting, connectAttempts, gameState.gameState, connect, playerName]);

  // If error message is in gameState, display it
  useEffect(() => {
    if (gameState.errorMessage) {
      setConnectError(gameState.errorMessage);
      setConnectionStatus('error');
    }
  }, [gameState.errorMessage]);

  // Connection status message
  const getConnectionStatusMessage = () => {
    if (!socket) return 'Waiting for server...';
    if (connectionStatus === 'connected') return 'Connected to server';
    if (connectionStatus === 'connecting') return 'Connecting to game server...';
    if (connectionStatus === 'retrying') return 'Retrying connection...';
    if (connectionStatus === 'timeout') return 'Connection timed out';
    if (connectionStatus === 'error') return 'Connection error';
    return 'Server available';
  };

  // Connection status color
  const getStatusColor = () => {
    if (!socket) return 'text-gray-400';
    if (connectionStatus === 'connected') return 'text-green-400';
    if (connectionStatus === 'connecting') return 'text-yellow-400';
    if (connectionStatus === 'retrying') return 'text-orange-400';
    if (connectionStatus === 'timeout' || connectionStatus === 'error') return 'text-red-400';
    return 'text-green-400';
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
          Dynamic Quiz Show
        </motion.h1>
        <motion.p 
          className="text-2xl text-gray-200 dark:text-gray-300 font-light"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Test your knowledge in real-time with players worldwide!
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
            onKeyPress={handleKeyPress}
            placeholder="Enter your name"
            className="w-full px-6 py-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 
                     text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 
                     dark:focus:ring-blue-500/50 transition-all duration-300"
            whileFocus={{ scale: 1.02 }}
            disabled={isConnecting}
          />
        </div>
        
        {connectError && (
          <div className="mb-4 text-red-400 text-center font-semibold">
            {connectError}
          </div>
        )}
        
        <motion.button
          onClick={handlePlay}
          disabled={!playerName.trim() || isConnecting}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300
                    ${playerName.trim() && !isConnecting
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl' 
                      : 'bg-gray-500/50 text-gray-400 cursor-not-allowed'}`}
          whileHover={playerName.trim() && !isConnecting ? { scale: 1.02 } : {}}
          whileTap={playerName.trim() && !isConnecting ? { scale: 0.98 } : {}}
        >
          {isConnecting ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Connecting...
            </span>
          ) : (
            'Join Game'
          )}
        </motion.button>
        
        {/* Connection status indicator */}
        <div className="mt-4 text-center text-sm">
          <span className={getStatusColor()}>
            {getConnectionStatusMessage()}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SplashScreen; 