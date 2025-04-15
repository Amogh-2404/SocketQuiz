'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, Player, Question, GameStateType } from '../types';
import { WebRTCProvider } from './WebRTCContext';
import { safeSocketDisconnect } from '@/utils/browser-utils';

// Interface for question event data
interface QuestionEventData {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  timeLimit: number;
  timeRemaining: number;
}

// Interface for timer update event data
interface TimerUpdateEventData {
  timeRemaining: number;
}

// Interface for lobby timer update event data
interface LobbyTimerUpdateEventData {
  lobbyTimeRemaining: number;
}

// Interface for question-ended event data
interface QuestionEndedEventData {
  question: Question & { correctOption: number };
}

// Interface for game-ended event data
interface GameEndedEventData {
  results: Array<{
    id: string;
    name: string;
    score: number;
    correctAnswers: number;
    rank: number;
  }>;
}

// Interface for network statistics
interface NetworkStats {
  latency: number;
  packetLoss: number;
}

const initialGameState: GameState = {
  gameState: 'idle',
  players: [],
  currentQuestion: null,
  questionNumber: 0,
  totalQuestions: 0,
  timeLimit: 0,
  timeRemaining: 0,
  lobbyTimeRemaining: 0,
  results: []
};

interface GameContextType {
  socket: Socket | null;
  gameState: GameState;
  player: Player | null;
  connect: (name: string) => void;
  disconnect: () => void;
  setReady: () => void;
  submitAnswer: (answer: number) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [player, setPlayer] = useState<Player | null>(null);

  useEffect(() => {
    return () => {
      // Use the safe disconnect utility when component unmounts
      safeSocketDisconnect(socket);
    };
  }, [socket]);

  const connect = (name: string) => {
    // Check if server is available before attempting socket connection
    const checkServerAvailability = async () => {
      try {
        // Make a simple GET request to check if server is running
        const response = await fetch('http://localhost:5002/health', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          mode: 'cors'
        });
        
        if (response.ok) {
          console.log('Server is available, proceeding with socket connection');
          initializeSocketConnection();
        } else {
          console.error('Server health check failed with status:', response.status);
          setGameState(prev => ({
            ...prev,
            gameState: 'error',
            errorMessage: 'Game server is not responding. Please try again later.'
          }));
        }
      } catch (error) {
        console.error('Server health check failed:', error);
        setGameState(prev => ({
          ...prev,
          gameState: 'error',
          errorMessage: 'Cannot connect to the game server. Please check that the server is running.'
        }));
      }
    };
    
    // Initialize socket connection with all the previous logic
    const initializeSocketConnection = () => {
      // Use the correct port (5002) directly without hostname detection
      const socketUrl = 'http://localhost:5002';
  
      console.log('Connecting to socket server at:', socketUrl);
  
      // Use the connection settings that worked in the test script
      const newSocket = io(socketUrl, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
        transports: ['polling', 'websocket'], // Try polling first, then websocket
        autoConnect: true, 
        forceNew: true,
        withCredentials: false
      });
      setSocket(newSocket);
  
      console.log('Attempting to connect to server...');
  
      // Add a timeout to catch socket creation failures
      const socketCreationTimeout = setTimeout(() => {
        console.log('Socket connection timed out during creation phase');
        if (!newSocket.connected) {
          setGameState(prev => ({
            ...prev,
            gameState: 'error',
            errorMessage: 'Failed to connect to the game server. Please check your network and try again.'
          }));
        }
      }, 5000);
      
      const pingInterval = setInterval(() => {
        if (newSocket.connected) {
          newSocket.emit('ping', { keepAlive: true });
        }
      }, 5000);
  
      // Set a timeout to detect if connection is established but game state isn't received
      const connectionTimeout = setTimeout(() => {
        if (newSocket.connected && gameState.gameState === 'connecting') {
          console.log('Connected but no game state received. Resending join request.');
          newSocket.emit('join', { name });
        }
      }, 3000);
  
      newSocket.on('connect', () => {
        console.log('Socket connected successfully with ID:', newSocket.id);
        setGameState(prev => ({ ...prev, gameState: 'connecting' }));
        
        // Send join request immediately - don't wait
        console.log('Sending join request for player:', name);
        newSocket.emit('join', { name });
      });
  
      // Handle welcome message from server to confirm connection
      newSocket.on('welcome', (data) => {
        console.log('Received welcome message from server:', data);
        // Server confirms our connection, socket is stable
      });
  
      // Handle join-ack message
      newSocket.on('join-ack', (data) => {
        console.log('Join acknowledgement received from server:', data);
        // This confirms the server received our join request
      });
  
      newSocket.on('disconnect', () => {
        console.log('Socket disconnected. Attempting to reconnect...');
        // Clear the connection timeout if it exists
        clearTimeout(connectionTimeout);
        
        // Try to reconnect after a short delay
        setTimeout(() => {
          if (newSocket.disconnected) {
            console.log('Trying to reconnect...');
            newSocket.connect();
          }
        }, 1000);
      });
  
      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        // Log transport type and attempt to diagnose the issue
        console.error('Failed transport type:', newSocket.io?.engine?.transport?.name);
        console.error('Connection URL:', socketUrl);
        
        setGameState(prev => ({ 
          ...prev, 
          gameState: 'error',
          errorMessage: 'Connection error: ' + (error.message || 'Unknown error') + '. Please check your network.'
        }));
        
        // Try switching to polling only if repeatedly failing with websocket
        if (newSocket.io?.engine?.transport?.name === 'websocket') {
          console.log('Switching to polling transport only');
          // Force disconnect and reconnect with polling only
          newSocket.disconnect();
          // Update the options directly
          newSocket.io.opts.transports = ['polling'];
          setTimeout(() => {
            newSocket.connect();
          }, 1000);
        }
      });
      
      // Add new error handler for engine errors
      if (newSocket.io?.engine) {
        newSocket.io.engine.on('error', (error) => {
          console.error('Socket.io engine error:', error);
        });
      }
  
      newSocket.on('reconnect', (attemptNumber) => {
        console.log(`Socket reconnected after ${attemptNumber} attempts`);
        // When reconnected, try to join again
        newSocket.emit('join', { name });
      });
  
      newSocket.on('gameState', (newState: GameState) => {
        console.log('Received gameState event:', newState);
        setGameState(newState);
        
        // Update player state when game state is received
        const currentPlayer = newState.players.find(p => p.id === newSocket.id);
        if (currentPlayer) {
          setPlayer(currentPlayer);
        }
      });
  
      newSocket.on('question', (data: QuestionEventData) => {
        console.log('Received question event:', data);
        setGameState(prev => ({
          ...prev,
          gameState: 'playing',
          currentQuestion: data.question,
          questionNumber: data.questionNumber,
          totalQuestions: data.totalQuestions,
          timeLimit: data.timeLimit,
          timeRemaining: data.timeRemaining
        }));
      });
  
      newSocket.on('timer-update', (data: TimerUpdateEventData) => {
        console.log('Received timer update:', data);
        setGameState(prev => ({
          ...prev,
          timeRemaining: data.timeRemaining
        }));
      });
      
      newSocket.on('lobby-timer-update', (data: LobbyTimerUpdateEventData) => {
        console.log('Received lobby timer update:', data);
        setGameState(prev => ({
          ...prev,
          lobbyTimeRemaining: data.lobbyTimeRemaining
        }));
      });
  
      newSocket.on('question-ended', (data: QuestionEndedEventData) => {
        console.log('Received question-ended event:', data);
        setGameState(prev => ({
          ...prev,
          currentQuestion: {
            ...prev.currentQuestion!,
            correctOption: data.question.correctOption
          }
        }));
      });
  
      newSocket.on('game-ended', (data: GameEndedEventData) => {
        console.log('Received game-ended event:', data);
        setGameState(prev => ({
          ...prev,
          gameState: 'results',
          // Convert the server result format to match our client format
          results: data.results.map(result => ({
            playerId: result.id,
            score: result.score,
            rank: result.rank
          }))
        }));
      });
  
      newSocket.on('pong', (data: NetworkStats) => {
        setGameState(prev => ({
          ...prev,
          networkLatency: data.latency,
          packetLoss: data.packetLoss
        }));
      });
  
      newSocket.on('playerUpdate', (updatedPlayer: Player) => {
        setPlayer(updatedPlayer);
      });
  
      newSocket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`Reconnection attempt ${attemptNumber}...`);
      });
  
      newSocket.on('reconnect_failed', () => {
        console.log('Failed to reconnect after all attempts');
        clearInterval(pingInterval);
        setGameState(initialGameState);
        setPlayer(null);
      });
  
      newSocket.on('error', (error: string) => {
        console.error('Socket error:', error);
        setGameState(prev => ({ 
          ...prev, 
          gameState: 'error',
          errorMessage: error
        }));
      });
  
      return () => {
        clearInterval(pingInterval);
        clearTimeout(connectionTimeout);
        clearTimeout(socketCreationTimeout);
      };
    };
    
    // Start by checking if server is available
    checkServerAvailability();
  };

  const disconnect = () => {
    if (socket) {
      // Use the safe disconnect utility with a callback to update state
      safeSocketDisconnect(socket, () => {
        setSocket(null);
        setGameState(initialGameState);
        setPlayer(null);
      });
    }
  };

  const setReady = () => {
    if (socket) {
      socket.emit('ready');
    }
  };

  const submitAnswer = (answer: number) => {
    if (socket) {
      socket.emit('submitAnswer', { answer });
    }
  };

  const value: GameContextType = {
    socket,
    gameState,
    player,
    connect,
    disconnect,
    setReady,
    submitAnswer,
  };

  return (
    <GameContext.Provider value={value}>
      <WebRTCProvider socket={socket} userId={player?.id || ''}>
        {children}
      </WebRTCProvider>
    </GameContext.Provider>
  );
}; 