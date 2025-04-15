'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../context/GameContext';
import Timer from './Timer';
import VideoGrid from './VideoGrid';
import { useWebRTC } from '../context/WebRTCContext';
import ErrorNotification from './ErrorNotification';

const LobbyScreen: React.FC = () => {
  const { gameState, player, setReady, disconnect } = useGame();
  const { startLocalStream, stopLocalStream, connectToPeer } = useWebRTC();
  const [lobbyTimeRemaining, setLobbyTimeRemaining] = React.useState(15);

  // Connect to webcam and microphone when entering lobby
  useEffect(() => {
    let mounted = true;
    // Only try to start stream if not already starting
    let didStart = false;
    if (!didStart) {
      didStart = true;
      startLocalStream(true, true).catch(err => {
        console.error('Failed to start local stream:', err);
        // If permission was denied, try audio only
        if (mounted && err.name === 'NotAllowedError') {
          startLocalStream(false, true).catch(err => {
            console.error('Failed to start audio-only stream:', err);
          });
        }
      });
    }
    // Removed stopLocalStream from unmount cleanup to prevent unnecessary video disconnects.
    // Video will now only be stopped when the user actually leaves the session.
    return () => {
      mounted = false;
      // stopLocalStream();
    };
  }, []); // Only run once on mount, not on every render or dependency change

  // Set initial lobby time when entering lobby
  useEffect(() => {
    if (gameState.gameState === 'lobby') {
      setLobbyTimeRemaining(gameState.lobbyTimeRemaining || 15); // Use server value or fallback to 15 seconds
    }
  }, [gameState.gameState]); // Only update when entering lobby, not on every timer tick

  // Update lobby timer from server
  useEffect(() => {
    if (gameState.gameState === 'lobby' && gameState.lobbyTimeRemaining !== undefined) {
      setLobbyTimeRemaining(gameState.lobbyTimeRemaining);
    }
  }, [gameState.lobbyTimeRemaining]); // Only update when timer changes

  // Connect players to each other when new players join
  useEffect(() => {
    // Connect to all other players in the session
    const otherPlayers = gameState.players?.filter(p => p.id !== player?.id) || [];
    otherPlayers.forEach(otherPlayer => {
      connectToPeer(otherPlayer.id);
    });
  }, [gameState.players, player?.id]); // Only run when player list changes

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-screen p-4 relative"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 dark:from-blue-500/20 dark:to-indigo-500/20 rounded-full blur-3xl"></div>
      
      <motion.div 
        className="w-full max-w-4xl bg-white/10 backdrop-blur-sm dark:bg-gray-800/50 rounded-xl shadow-2xl p-8 relative z-10"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 dark:from-blue-400 dark:to-indigo-600 mb-4">
            Game Lobby
          </h2>
          <Timer 
            remaining={lobbyTimeRemaining * 1000}
            timeLimit={15000}
          />
          <p className="text-gray-200 dark:text-gray-300 mt-2">
            Game will start automatically in {lobbyTimeRemaining} seconds
          </p>
        </div>
        
        {/* Video grid for all participants */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-200 dark:text-gray-300 mb-4">
            Participants
          </h3>
          <VideoGrid 
            players={gameState.players?.filter(p => p.id !== player?.id) || []} 
            showLocalVideo={true}
            size="medium"
          />
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-200 dark:text-gray-300 mb-4">
            Players ({gameState.players?.length || 0})
          </h3>
          <div className="space-y-3">
            {gameState.players?.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-4 bg-white/5 backdrop-blur-sm dark:bg-gray-700/50 rounded-lg border border-white/10"
              >
                <span className="text-gray-200 dark:text-white font-medium">
                  {p.name}
                  {p.isHost && ' 👑'}
                </span>
                <span className={`text-sm font-medium ${p.isReady ? 'text-green-400' : 'text-gray-400'}`}>
                  {p.isReady ? 'Ready' : 'Waiting...'}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex flex-col space-y-4">
          {!player?.isReady && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={setReady}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Ready Up
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              // First stop video stream
              stopLocalStream();
              // Add a small delay to ensure cleanup completes
              setTimeout(() => {
                disconnect();
              }, 100);
            }}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Quit
          </motion.button>
        </div>
      </motion.div>
      <ErrorNotification />
    </motion.div>
  );
};

export default LobbyScreen; 