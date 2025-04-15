const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const NetworkMonitor = require('./networkMonitor');

const PORT = process.env.PORT || 5002;
let isServerRunning = false;
let sessionMergeInterval = null;

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Basic test endpoint
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', port: PORT });
});

// Add a reconnect endpoint to help clients reconnect
app.get('/reconnect-info', (req, res) => {
  res.json({
    serverRunning: true,
    activeSessions: sessions.size,
    availableSlots: MAX_SESSIONS - sessions.size,
    lobbyAvailable: Array.from(sessions.values()).some(s => s.status === 'lobby' && s.players.length < 4),
    serverTime: Date.now()
  });
});

// CORS preflight for all routes
app.options('*', cors());

const server = http.createServer(app);

// Simple socket.io setup
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  // Simplify socket.io config to prevent connection issues
  pingTimeout: 60000,
  pingInterval: 10000,
  transports: ['polling', 'websocket'], // Try polling first for compatibility
  allowUpgrades: true,
  connectTimeout: 30000,
  // Disable cookie to prevent auth issues
  cookie: false
});

// Initialize network monitor
let networkMonitor;
if (!global.networkMonitor) {
  networkMonitor = new NetworkMonitor();
  global.networkMonitor = networkMonitor;
} else {
  networkMonitor = global.networkMonitor;
}

// Session and game management
const MAX_SESSIONS = 3;
const LOBBY_TIMER = 15; // seconds
const BASE_QUESTION_TIMER = 15; // seconds
const MIN_QUESTION_TIMER = 10; // seconds
const MAX_QUESTION_TIMER = 20; // seconds
const QUESTIONS_PER_GAME = 10;

// Load questions from JSON file
const questionsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data/questions.json'), 'utf8')
);

// Game sessions storage
const sessions = new Map();
const sessionStates = new Map(); // For state persistence

// Helper function to generate a random session ID
const generateSessionId = () => {
  return Math.random().toString(36).substring(2, 10);
};

// Helper function to select random questions from the question bank
const selectRandomQuestions = (count) => {
  const shuffled = [...questionsData].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Helper function to check if we can create a new session
const canCreateNewSession = () => {
  return sessions.size < MAX_SESSIONS;
};

// Function to calculate adaptive question timer based on network conditions
const calculateAdaptiveTimer = (sessionId) => {
  const session = sessions.get(sessionId);
  if (!session) return BASE_QUESTION_TIMER;

  // Get network stats for all players in the session
  const networkStats = session.players.map(player => 
    networkMonitor.getStats(player.id)
  );

  // Calculate average latency
  const avgLatency = networkStats.reduce((sum, stats) => 
    sum + (stats?.averageLatency || 0), 0
  ) / networkStats.length;

  // Adjust timer based on latency
  if (avgLatency <= 100) return MIN_QUESTION_TIMER;
  if (avgLatency >= 500) return MAX_QUESTION_TIMER;
  
  // Linear interpolation between min and max based on latency
  const timer = MIN_QUESTION_TIMER + 
    ((avgLatency - 100) / 400) * (MAX_QUESTION_TIMER - MIN_QUESTION_TIMER);
  
  return Math.round(timer);
};

// Helper function to validate session data
const validateSession = (session) => {
  if (!session) return false;
  
  const requiredFields = ['id', 'status', 'players', 'questions'];
  for (const field of requiredFields) {
    if (!(field in session)) {
      console.error(`Missing required field in session: ${field}`);
      return false;
    }
  }
  
  if (!Array.isArray(session.players) || !Array.isArray(session.questions)) {
    console.error('Invalid session data structure');
    return false;
  }
  
  return true;
};

// Helper function to validate player data
const validatePlayer = (player) => {
  if (!player) return false;
  
  const requiredFields = ['id', 'name', 'score', 'answers'];
  for (const field of requiredFields) {
    if (!(field in player)) {
      console.error(`Missing required field in player: ${field}`);
      return false;
    }
  }
  
  if (!Array.isArray(player.answers)) {
    console.error('Invalid player data structure');
    return false;
  }
  
  return true;
};

// Modify the saveSessionState function to include validation
const saveSessionState = (sessionId) => {
  try {
    const session = sessions.get(sessionId);
    if (!session) {
      console.error(`Session ${sessionId} not found for state saving`);
      return;
    }

    if (!validateSession(session)) {
      console.error(`Invalid session data for ${sessionId}`);
      return;
    }

    // Validate all players
    for (const player of session.players) {
      if (!validatePlayer(player)) {
        console.error(`Invalid player data in session ${sessionId}`);
        return;
      }
    }

    sessionStates.set(sessionId, {
      ...session,
      players: session.players.map(player => ({
        ...player,
        answers: [...player.answers]
      })),
      questions: [...session.questions]
    });
  } catch (error) {
    console.error(`Error saving session state for ${sessionId}:`, error);
  }
};

// Modify the recoverSessionState function to include validation
const recoverSessionState = (sessionId) => {
  try {
    const savedState = sessionStates.get(sessionId);
    if (!savedState) {
      console.error(`No saved state found for session ${sessionId}`);
      return null;
    }

    if (!validateSession(savedState)) {
      console.error(`Invalid saved state for session ${sessionId}`);
      return null;
    }

    // Validate all players
    for (const player of savedState.players) {
      if (!validatePlayer(player)) {
        console.error(`Invalid player data in saved state for session ${sessionId}`);
        return null;
      }
    }

    const recoveredSession = {
      ...savedState,
      players: savedState.players.map(player => ({
        ...player,
        answers: [...player.answers]
      })),
      questions: [...savedState.questions]
    };

    sessions.set(sessionId, recoveredSession);
    return recoveredSession;
  } catch (error) {
    console.error(`Error recovering session state for ${sessionId}:`, error);
    return null;
  }
};

// Helper function to merge sessions
const mergeSessions = (sessionId1, sessionId2) => {
  const session1 = sessions.get(sessionId1);
  const session2 = sessions.get(sessionId2);
  
  if (!session1 || !session2) return false;
  
  // Only merge if both sessions are in lobby state
  if (session1.status !== 'lobby' || session2.status !== 'lobby') return false;
  
  // Merge players from session2 into session1
  session1.players = [...session1.players, ...session2.players];
  
  // Update the lobby timer to the longer remaining time
  const time1 = Math.max(0, LOBBY_TIMER - Math.floor((Date.now() - session1.lobbyStartTime) / 1000));
  const time2 = Math.max(0, LOBBY_TIMER - Math.floor((Date.now() - session2.lobbyStartTime) / 1000));
  session1.lobbyStartTime = Date.now() - (Math.max(time1, time2) * 1000);
  
  // Notify all players in both sessions about the merge
  io.to(sessionId1).emit('session-merged', {
    newSessionId: sessionId1,
    players: session1.players.map(p => ({ id: p.id, name: p.name }))
  });
  
  io.to(sessionId2).emit('session-merged', {
    newSessionId: sessionId1,
    players: session1.players.map(p => ({ id: p.id, name: p.name }))
  });
  
  // Move all sockets from session2 to session1
  io.in(sessionId2).socketsJoin(sessionId1);
  
  // Clean up session2
  sessions.delete(sessionId2);
  sessionStates.delete(sessionId2);
  
  return true;
};

// Function to start the lobby timer for a session
function startLobbyTimer(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;
  
  // Clear any existing timer
  if (session.lobbyTimer) {
    clearTimeout(session.lobbyTimer);
  }
  
  // Set lobby start time
  session.lobbyStartTime = Date.now();
  
  // Set new timer
  session.lobbyTimer = setTimeout(() => {
    // Start the game if we still have the session and at least one player
    if (sessions.has(sessionId) && sessions.get(sessionId).players.length > 0) {
      startGame(sessionId);
    }
  }, LOBBY_TIMER * 1000);
  
  // Setup lobby timer sync interval
  if (session.lobbyTimerInterval) {
    clearInterval(session.lobbyTimerInterval);
  }
  
  session.lobbyTimerInterval = setInterval(() => {
    const timeRemaining = Math.max(0, LOBBY_TIMER - Math.floor((Date.now() - session.lobbyStartTime) / 1000));
    
    // Send lobby timer update to all clients
    io.to(sessionId).emit('lobby-timer-update', {
      lobbyTimeRemaining: timeRemaining
    });
    
    // If timer reaches 0, clear the interval
    if (timeRemaining <= 0) {
      clearInterval(session.lobbyTimerInterval);
    }
  }, 1000);
  
  // Log
  console.log(`Lobby timer started for session ${sessionId}. Game will start in ${LOBBY_TIMER} seconds.`);
}

// Function to start the game
function startGame(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;
  
  console.log(`Starting game for session ${sessionId} with ${session.players.length} players`);
  
  // Clear any lobby timer intervals
  if (session.lobbyTimerInterval) {
    clearInterval(session.lobbyTimerInterval);
    session.lobbyTimerInterval = null;
  }
  
  // Update session status
  session.status = 'playing';
  
  // Notify all players
  io.to(sessionId).emit('gameState', {
    gameState: 'playing',
    players: session.players,
    currentQuestion: null,
    questionNumber: 0,
    totalQuestions: QUESTIONS_PER_GAME,
    timeLimit: 0,
    timeRemaining: 0,
    lobbyTimeRemaining: 0,
    results: []
  });
  
  // Start the first question
  session.currentQuestionIndex = -1;
  nextQuestion(sessionId);
}

// Function to move to the next question or end the game
function nextQuestion(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;
  
  session.currentQuestionIndex++;
  
  // Check if we've reached the end of questions
  if (session.currentQuestionIndex >= session.questions.length) {
    endGame(sessionId);
    return;
  }
  
  const currentQuestion = session.questions[session.currentQuestionIndex];
  const questionTimeLimit = calculateAdaptiveTimer(sessionId);
  
  // Set question start and end times
  session.questionStartTime = Date.now();
  session.questionEndTime = Date.now() + (questionTimeLimit * 1000);
  
  // Send the question to all players (without the correct answer)
  const questionForPlayers = {
    id: currentQuestion.id,
    question: currentQuestion.question,
    options: currentQuestion.options
  };
  
  io.to(sessionId).emit('question', { 
    question: questionForPlayers,
    questionNumber: session.currentQuestionIndex + 1,
    totalQuestions: session.questions.length,
    timeLimit: questionTimeLimit,
    timeRemaining: questionTimeLimit
  });
  
  // Setup timer sync interval - send updates every second to keep clients in sync
  if (session.timerInterval) {
    clearInterval(session.timerInterval);
  }
  
  session.timerInterval = setInterval(() => {
    const timeRemaining = Math.max(0, Math.ceil((session.questionEndTime - Date.now()) / 1000));
    
    // Send timer update to all clients
    io.to(sessionId).emit('timer-update', {
      timeRemaining: timeRemaining
    });
    
    // If timer reaches 0, clear the interval
    if (timeRemaining <= 0) {
      clearInterval(session.timerInterval);
    }
  }, 1000);
  
  // Start the question timer
  if (session.questionTimer) {
    clearTimeout(session.questionTimer);
  }
  
  session.questionTimer = setTimeout(() => {
    // Time's up for this question, show the answer
    const questionWithAnswer = {
      ...currentQuestion,
      correctOption: currentQuestion.correctOption
    };
    
    // Clear the timer sync interval
    if (session.timerInterval) {
      clearInterval(session.timerInterval);
      session.timerInterval = null;
    }
    
    io.to(sessionId).emit('question-ended', { 
      question: questionWithAnswer
    });
    
    // Wait 3 seconds before moving to the next question
    setTimeout(() => {
      nextQuestion(sessionId);
    }, 3000);
    
  }, questionTimeLimit * 1000);
}

// Function to end the game and show results
function endGame(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;
  
  console.log(`Game ended for session ${sessionId}`);
  
  // Update session status
  session.status = 'ended';
  
  // Calculate final scores and ranks
  const playerResults = session.players
    .map(player => ({
      id: player.id,
      name: player.name,
      score: player.score,
      correctAnswers: player.answers.filter(a => a.isCorrect).length
    }))
    .sort((a, b) => b.score - a.score);
  
  // Assign ranks (handling ties)
  let currentRank = 1;
  let previousScore = -1;
  let playersWithCurrentRank = 0;
  
  playerResults.forEach((player, index) => {
    if (player.score < previousScore) {
      currentRank += playersWithCurrentRank;
      playersWithCurrentRank = 1;
    } else if (player.score === previousScore) {
      playersWithCurrentRank++;
    } else {
      playersWithCurrentRank = 1;
    }
    
    player.rank = currentRank;
    previousScore = player.score;
  });
  
  // Send results to all players
  io.to(sessionId).emit('game-ended', { results: playerResults });
  
  // Schedule session cleanup after 30 seconds to allow players to view results
  setTimeout(() => {
    if (sessions.has(sessionId)) {
      sessions.delete(sessionId);
      console.log(`Session ${sessionId} removed after game ended`);
    }
  }, 30000);
}

// Add event logging for debugging
io.engine.on('connection_error', (err) => {
  console.error('Connection error:', err.code, err.message, err.context);
});

// WebRTC signaling
io.on('connection', (socket) => {
  // Safety check in case setTimeout method isn't available on socket.conn
  if (socket.conn && typeof socket.conn.setTimeout === 'function') {
    socket.conn.setTimeout(60000); // Set a longer timeout for this socket
  }
  
  console.log('New client connected:', socket.id, 'Transport:', socket.conn?.transport?.name || 'unknown');
  
  // Send an immediate welcome message to confirm connection
  socket.emit('welcome', {
    socketId: socket.id,
    time: Date.now(),
    activeConnections: io.engine.clientsCount
  });
  
  // Handle WebRTC signaling
  socket.on('webrtc-signal', (data) => {
    const { to, from, signal } = data;
    io.to(to).emit('webrtc-signal', { from, signal });
  });
  
  // Inform peers when a socket disconnects
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    socket.broadcast.emit('peer-disconnected', socket.id);
    
    try {
      networkMonitor.stopMonitoring(socket.id);
    } catch (err) {
      console.error('Error stopping network monitoring:', err.message);
    }
    
    // Don't immediately remove player from session on disconnect
    // Instead, wait a short period to allow for reconnection
    let disconnectTimeout = setTimeout(() => {
      for (const [sessionId, session] of sessions) {
        const playerIndex = session.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          session.players.splice(playerIndex, 1);
          
          // If no players left, remove the session
          if (session.players.length === 0) {
            sessions.delete(sessionId);
            if (session.lobbyTimer) {
              clearTimeout(session.lobbyTimer);
            }
          } else {
            // Update remaining players
            io.to(sessionId).emit('gameState', {
              gameState: session.status,
              players: session.players,
              currentQuestion: session.currentQuestionIndex >= 0 ? session.questions[session.currentQuestionIndex] : null,
              questionNumber: session.currentQuestionIndex + 1,
              totalQuestions: QUESTIONS_PER_GAME,
              timeLimit: session.currentQuestionIndex >= 0 ? calculateAdaptiveTimer(sessionId) : 0,
              timeRemaining: session.currentQuestionIndex >= 0 ? session.questionEndTime - Date.now() : 0,
              lobbyTimeRemaining: Math.max(0, LOBBY_TIMER - Math.floor((Date.now() - session.lobbyStartTime) / 1000)),
              results: []
            });
          }
          break;
        }
      }
    }, 5000); // Wait 5 seconds before removing player
    
    // Store the timeout in a Map so it can be cleared on reconnect
    if (!global.disconnectTimeouts) {
      global.disconnectTimeouts = new Map();
    }
    global.disconnectTimeouts.set(socket.id, disconnectTimeout);
  });
  
  networkMonitor.startMonitoring(socket);

  // Network monitoring - handle pings
  socket.on('ping', (data) => {
    // Simple ping response - don't log to avoid console spam
    if (data && data.timestamp) {
      // This is a NetworkMonitor ping, respond with pong
      socket.emit('pong', { timestamp: data.timestamp });
      // Call handlePong directly to update stats
      networkMonitor.handlePong(socket, { timestamp: data.timestamp });
    } else if (data && data.keepAlive) {
      // This is a keep-alive ping from the client
      socket.emit('pong', { keepAlive: true, serverTime: Date.now() });
    } else {
      // This is a regular ping request from client
      const stats = networkMonitor.getStats(socket.id);
      socket.emit('pong', {
        latency: stats?.averageLatency || 0,
        packetLoss: stats?.packetLoss || 0,
        serverTime: Date.now()
      });
    }
  });

  // Handle player joining
  socket.on('join', ({ name }) => {
    console.log(`Player ${name} (${socket.id}) joining game`);
    
    // Check if player is already in a session
    let existingSessionId = null;
    for (const [sessionId, session] of sessions) {
      if (session.players.some(p => p.id === socket.id)) {
        existingSessionId = sessionId;
        console.log(`Player ${name} already in session ${sessionId}, skipping join`);
        
        // Just re-emit the current game state
        io.to(sessionId).emit('gameState', {
          gameState: session.status,
          players: session.players,
          currentQuestion: session.currentQuestionIndex >= 0 ? session.questions[session.currentQuestionIndex] : null,
          questionNumber: session.currentQuestionIndex + 1,
          totalQuestions: QUESTIONS_PER_GAME,
          timeLimit: session.currentQuestionIndex >= 0 ? calculateAdaptiveTimer(sessionId) : 0,
          timeRemaining: session.currentQuestionIndex >= 0 ? session.questionEndTime - Date.now() : 0,
          lobbyTimeRemaining: Math.max(0, LOBBY_TIMER - Math.floor((Date.now() - session.lobbyStartTime) / 1000)),
          results: []
        });
        return;
      }
    }
    
    // Check if we've reached the maximum number of sessions
    if (sessions.size >= MAX_SESSIONS && !canPlayerJoinExistingSession()) {
      socket.emit('error', 'SERVER_BUSY');
      return;
    }
    
    // Find an available session or create a new one
    let targetSession = null;
    for (const [sessionId, session] of sessions) {
      if (session.status === 'lobby' && session.players.length < 4) {
        targetSession = session;
        break;
      }
    }

    if (!targetSession && canCreateNewSession()) {
      const sessionId = generateSessionId();
      targetSession = {
        id: sessionId,
        status: 'lobby',
        players: [],
        questions: selectRandomQuestions(QUESTIONS_PER_GAME),
        currentQuestionIndex: -1,
        lobbyStartTime: Date.now()
      };
      sessions.set(sessionId, targetSession);
      console.log(`Created new session: ${sessionId}`);
    }

    if (targetSession) {
      try {
        // Add player to session
        const player = {
          id: socket.id,
          name,
          score: 0,
          answers: [],
          isReady: false,
          isHost: targetSession.players.length === 0
        };
        targetSession.players.push(player);

        // Join socket room
        socket.join(targetSession.id);
        console.log(`Socket ${socket.id} joined room ${targetSession.id}`);

        // Start lobby timer if this is the first player
        if (targetSession.players.length === 1) {
          startLobbyTimer(targetSession.id);
        }

        // Send an acknowledgement immediately to keep connection alive
        socket.emit('join-ack', { sessionId: targetSession.id });

        // Send game state immediately - don't delay
        console.log(`Sending game state to ${socket.id} in session ${targetSession.id}`);
        // Send game state to all players in the session
        io.to(targetSession.id).emit('gameState', {
          gameState: 'lobby',
          players: targetSession.players,
          currentQuestion: null,
          questionNumber: 0,
          totalQuestions: QUESTIONS_PER_GAME,
          timeLimit: 0,
          timeRemaining: 0,
          lobbyTimeRemaining: Math.max(0, LOBBY_TIMER - Math.floor((Date.now() - targetSession.lobbyStartTime) / 1000)),
          results: []
        });
      } catch (error) {
        console.error('Error handling join:', error);
        socket.emit('error', 'SERVER_ERROR');
      }
    } else {
      socket.emit('error', 'SERVER_BUSY');
    }
  });

  // Helper function to check if player can join an existing session
  function canPlayerJoinExistingSession() {
    for (const [sessionId, session] of sessions) {
      if (session.status === 'lobby' && session.players.length < 4) {
        return true;
      }
    }
    return false;
  }

  // Handle player ready state
  socket.on('ready', () => {
    // Find the session the player is in
    for (const [sessionId, session] of sessions) {
      const player = session.players.find(p => p.id === socket.id);
      if (player) {
        player.isReady = true;
        
        // Check if all players are ready
        const allReady = session.players.every(p => p.isReady);
        if (allReady && session.players.length > 1) {
          startGame(sessionId);
        }

        // Update all players
        io.to(sessionId).emit('gameState', {
          gameState: 'lobby',
          players: session.players,
          currentQuestion: null,
          questionNumber: 0,
          totalQuestions: QUESTIONS_PER_GAME,
          timeLimit: 0,
          timeRemaining: 0,
          lobbyTimeRemaining: Math.max(0, LOBBY_TIMER - Math.floor((Date.now() - session.lobbyStartTime) / 1000)),
          results: []
        });
        break;
      }
    }
  });

  // Handle answer submission
  socket.on('submitAnswer', ({ answer }) => {
    let playerSession = null;
    let playerObject = null;

    // Find the session this player belongs to
    for (const [sessionId, session] of sessions) {
      const player = session.players.find(p => p.id === socket.id);
      if (player) {
        playerSession = session;
        playerObject = player;
        break;
      }
    }

    if (!playerSession || !playerObject) {
      console.log(`Player ${socket.id} not found in any session for answer submission`);
      return;
    }

    console.log(`Player ${playerObject.name} submitted answer ${answer} for question ${playerSession.currentQuestionIndex + 1}`);

    // Get the current question
    const currentQuestion = playerSession.questions[playerSession.currentQuestionIndex];
    if (!currentQuestion) {
      console.log(`No current question found in session`);
      return;
    }

    // Record the answer
    const isCorrect = answer === currentQuestion.correctOption;
    playerObject.answers.push({
      questionIndex: playerSession.currentQuestionIndex,
      answer,
      isCorrect
    });

    // Update player score if correct
    if (isCorrect) {
      playerObject.score += 10;
    }

    // Send updated player data
    socket.emit('playerUpdate', playerObject);
  });

  // Handle game start request from host
  socket.on('startGame', () => {
    for (const [sessionId, session] of sessions) {
      const player = session.players.find(p => p.id === socket.id);
      if (player && player.isHost) {
        startGame(sessionId);
        break;
      }
    }
  });
});

// Error handling
server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is already in use, trying ${PORT + 1}...`);
    server.listen(PORT + 1);
  }
});

// Cleanup on shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Cleaning up...');
  if (sessionMergeInterval) {
    clearInterval(sessionMergeInterval);
  }
  sessions.clear();
  sessionStates.clear();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  isServerRunning = true;
}); 