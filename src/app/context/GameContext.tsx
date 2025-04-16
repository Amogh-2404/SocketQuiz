'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
// Extend GameState type to include sessionId for video signaling
export interface GameState {
  sessionId: string;
  gameState: string;
  players: Player[];
  currentQuestion: Question | null;
  questionNumber: number;
  totalQuestions: number;
  timeLimit: number;
  timeRemaining: number;
  lobbyTimeRemaining: number;
  results: any[];
}

import { Player, Question, GameStateType } from '../types';

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
  sessionId: '',
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
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  const connect = (name: string) => {
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:5001');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join', { name });
      setGameState(prev => ({ ...prev, gameState: 'connecting' }));
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

    newSocket.on('disconnect', () => {
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
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setGameState(initialGameState);
      setPlayer(null);
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

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}; 