'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

// Define types
type Player = {
  id: string;
  name: string;
  score?: number;
  correctAnswers?: number;
  rank?: number;
};

type Question = {
  id: number;
  question: string;
  options: string[];
  correctOption?: number;
};

type GameResult = {
  id: string;
  name: string;
  score: number;
  correctAnswers: number;
  rank: number;
};

type GameContextType = {
  socket: Socket | null;
  isConnected: boolean;
  gameState: 'idle' | 'connecting' | 'lobby' | 'playing' | 'results' | 'error';
  playerId: string | null;
  players: Player[];
  currentQuestion: Question | null;
  questionNumber: number;
  totalQuestions: number;
  timeLimit: number;
  timeRemaining: number;
  lobbyTimeRemaining: number;
  selectedOption: number | null;
  results: GameResult[];
  errorMessage: string;
  isServerBusy: boolean;
  play: () => void;
  quit: () => void;
  setPlayerName: (name: string) => void;
  submitAnswer: (optionIndex: number) => void;
  goHome: () => void;
};

// Create context with default values
const GameContext = createContext<GameContextType>({
  socket: null,
  isConnected: false,
  gameState: 'idle',
  playerId: null,
  players: [],
  currentQuestion: null,
  questionNumber: 0,
  totalQuestions: 10,
  timeLimit: 15,
  timeRemaining: 0,
  lobbyTimeRemaining: 0,
  selectedOption: null,
  results: [],
  errorMessage: '',
  isServerBusy: false,
  play: () => {},
  quit: () => {},
  setPlayerName: () => {},
  submitAnswer: () => {},
  goHome: () => {},
});

// Socket server URL - typically would be from env variables
const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:5002';

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameContextType['gameState']>('idle');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [timeLimit, setTimeLimit] = useState(15);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [lobbyTimeRemaining, setLobbyTimeRemaining] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [results, setResults] = useState<GameResult[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isServerBusy, setIsServerBusy] = useState(false);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(socketUrl);
    
    newSocket.on('connect', () => {
      setIsConnected(true);
      setSocket(newSocket);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', () => {
      setErrorMessage('Failed to connect to the server. Please try again later.');
      setGameState('error');
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Handle server errors
    socket.on('error', ({ message }) => {
      setErrorMessage(message);
    });

    // Handle server busy response
    socket.on('server-busy', () => {
      setIsServerBusy(true);
      setGameState('error');
      setErrorMessage('Server is busy. Please try again later.');
    });

    // Handle joining a session
    socket.on('joined', ({ sessionId, remainingLobbyTime, playerId, players }) => {
      setGameState('lobby');
      setPlayerId(playerId);
      setPlayers(players);
      setLobbyTimeRemaining(remainingLobbyTime);
      setIsServerBusy(false);
      setErrorMessage('');
    });

    // Handle player joining the session
    socket.on('player-joined', ({ player, remainingLobbyTime, players }) => {
      setPlayers(players);
      setLobbyTimeRemaining(remainingLobbyTime);
    });

    // Handle player leaving
    socket.on('player-left', ({ playerId }) => {
      setPlayers(prev => prev.filter(p => p.id !== playerId));
    });

    // Handle player rename
    socket.on('player-renamed', ({ playerId, name }) => {
      setPlayers(prev => 
        prev.map(player => 
          player.id === playerId ? { ...player, name } : player
        )
      );
    });

    // Handle game start
    socket.on('game-starting', () => {
      setGameState('playing');
      setSelectedOption(null);
      setCurrentQuestion(null);
    });

    // Handle receiving a question
    socket.on('question', ({ question, questionNumber, totalQuestions, timeLimit }) => {
      setCurrentQuestion(question);
      setQuestionNumber(questionNumber);
      setTotalQuestions(totalQuestions);
      setTimeLimit(timeLimit);
      setTimeRemaining(timeLimit);
      setSelectedOption(null);
    });

    // Handle question ending
    socket.on('question-ended', ({ question }) => {
      setCurrentQuestion(question);
    });

    // Handle answer recorded
    socket.on('answer-recorded', () => {
      // Feedback might be needed here depending on UI
    });

    // Handle game ended with results
    socket.on('game-ended', ({ results }) => {
      setGameState('results');
      setResults(results);
    });

    return () => {
      socket.off('error');
      socket.off('server-busy');
      socket.off('joined');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('player-renamed');
      socket.off('game-starting');
      socket.off('question');
      socket.off('question-ended');
      socket.off('answer-recorded');
      socket.off('game-ended');
    };
  }, [socket]);

  // Countdown timer for lobby
  useEffect(() => {
    if (gameState !== 'lobby' || lobbyTimeRemaining <= 0) return;

    const interval = setInterval(() => {
      setLobbyTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, lobbyTimeRemaining]);

  // Countdown timer for question
  useEffect(() => {
    if (gameState !== 'playing' || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, timeRemaining]);

  // Game functions
  const play = () => {
    if (!socket || !isConnected) {
      console.log("Attempting to connect to server...");
      // Try to reconnect if not connected
      const newSocket = io(socketUrl, {
        reconnectionAttempts: 3,
        timeout: 10000
      });
      
      newSocket.on('connect', () => {
        setSocket(newSocket);
        setIsConnected(true);
        setGameState('connecting');
        setIsServerBusy(false);
        setErrorMessage('');
        newSocket.emit('play');
      });
      
      newSocket.on('connect_error', (err) => {
        console.error("Connection error:", err);
        setErrorMessage('Failed to connect to the server. Please check if the server is running.');
        setGameState('error');
      });
      
      return;
    }
    
    setGameState('connecting');
    setIsServerBusy(false);
    setErrorMessage('');
    socket.emit('play');
  };

  const quit = () => {
    if (!socket || !isConnected) return;
    
    socket.emit('quit');
    setGameState('idle');
    setPlayerId(null);
    setPlayers([]);
    setCurrentQuestion(null);
    setQuestionNumber(0);
    setSelectedOption(null);
    setResults([]);
  };

  const setPlayerName = (name: string) => {
    if (!socket || !isConnected || gameState !== 'lobby') return;
    
    socket.emit('set-name', { name });
  };

  const submitAnswer = (optionIndex: number) => {
    if (!socket || !isConnected || !currentQuestion || gameState !== 'playing') return;
    
    setSelectedOption(optionIndex);
    socket.emit('submit-answer', { 
      questionId: currentQuestion.id, 
      optionIndex 
    });
  };

  const goHome = () => {
    setGameState('idle');
    setPlayerId(null);
    setPlayers([]);
    setCurrentQuestion(null);
    setQuestionNumber(0);
    setSelectedOption(null);
    setResults([]);
  };

  const value = {
    socket,
    isConnected,
    gameState,
    playerId,
    players,
    currentQuestion,
    questionNumber,
    totalQuestions,
    timeLimit,
    timeRemaining,
    lobbyTimeRemaining,
    selectedOption,
    results,
    errorMessage,
    isServerBusy,
    play,
    quit,
    setPlayerName,
    submitAnswer,
    goHome,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => useContext(GameContext); 