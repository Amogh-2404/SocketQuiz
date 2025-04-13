const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors({
  origin: ['https://quiz.ramogh.com' ,'https://vercel.com/r-amoghs-projects/socket-quiz/87jDBfMrBN2JoebCgQM3y6QCYhfT', 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  credentials: true
}));

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Session and game management
const MAX_SESSIONS = 3;
const LOBBY_TIMER = 15; // seconds
const QUESTION_TIMER = 15; // seconds
const QUESTIONS_PER_GAME = 10;

// Load questions from JSON file
const questionsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data/questions.json'), 'utf8')
);

// Game sessions storage
const sessions = new Map();

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

// Socket connection handling
io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);
  let currentSessionId = null;

  // When a player wants to play
  socket.on('play', () => {
    // If player is already in a session, don't let them join another
    if (currentSessionId) {
      socket.emit('error', { message: 'You are already in a game session' });
      return;
    }

    // Look for an active session in the lobby phase
    let joinedExistingSession = false;
    let sessionId = null;

    for (const [id, session] of sessions.entries()) {
      if (session.status === 'lobby') {
        sessionId = id;
        currentSessionId = id;
        joinedExistingSession = true;

        // Add player to the session
        const player = {
          id: socket.id,
          name: `Player ${session.players.length + 1}`, // Default name
          score: 0,
          answers: []
        };
        session.players.push(player);
        
        // Join the socket to the session room
        socket.join(sessionId);

        // Update remaining lobby time if needed
        const currentTime = Date.now();
        const elapsedTimeInSeconds = Math.floor((currentTime - session.lobbyStartTime) / 1000);
        const remainingTime = Math.max(LOBBY_TIMER - elapsedTimeInSeconds, 0);
        
        // Emit session joined event
        socket.emit('joined', { 
          sessionId, 
          remainingLobbyTime: remainingTime,
          playerId: socket.id,
          players: session.players.map(p => ({ id: p.id, name: p.name }))
        });
        
        // Notify other players in the session
        socket.to(sessionId).emit('player-joined', { 
          player: { id: player.id, name: player.name },
          remainingLobbyTime: remainingTime,
          players: session.players.map(p => ({ id: p.id, name: p.name }))
        });
        
        break;
      }
    }

    // If no active lobby session was found, create a new one (if possible)
    if (!joinedExistingSession) {
      if (canCreateNewSession()) {
        sessionId = generateSessionId();
        currentSessionId = sessionId;
        
        // Create a new session
        const newSession = {
          id: sessionId,
          status: 'lobby',
          lobbyStartTime: Date.now(),
          questions: selectRandomQuestions(QUESTIONS_PER_GAME),
          currentQuestionIndex: -1,
          players: [{
            id: socket.id,
            name: 'Player 1', // Default name
            score: 0,
            answers: []
          }],
          questionTimer: null,
          lobbyTimer: null
        };
        
        sessions.set(sessionId, newSession);
        
        // Join the socket to the session room
        socket.join(sessionId);
        
        // Start the lobby timer for this session
        startLobbyTimer(sessionId);
        
        // Emit session created event
        socket.emit('joined', {
          sessionId,
          remainingLobbyTime: LOBBY_TIMER,
          playerId: socket.id,
          players: newSession.players.map(p => ({ id: p.id, name: p.name }))
        });
      } else {
        // Server is at max capacity
        socket.emit('server-busy');
      }
    }
  });

  // When a player sets their name
  socket.on('set-name', ({ name }) => {
    if (!currentSessionId || !sessions.has(currentSessionId)) {
      socket.emit('error', { message: 'You are not in an active session' });
      return;
    }

    const session = sessions.get(currentSessionId);
    const player = session.players.find(p => p.id === socket.id);
    
    if (player) {
      player.name = name;
      io.to(currentSessionId).emit('player-renamed', { playerId: socket.id, name });
    }
  });

  // When a player submits an answer
  socket.on('submit-answer', ({ questionId, optionIndex }) => {
    if (!currentSessionId || !sessions.has(currentSessionId)) {
      socket.emit('error', { message: 'You are not in an active session' });
      return;
    }

    const session = sessions.get(currentSessionId);
    
    if (session.status !== 'playing') {
      socket.emit('error', { message: 'Game is not in progress' });
      return;
    }

    const currentQuestion = session.questions[session.currentQuestionIndex];
    if (currentQuestion.id !== questionId) {
      socket.emit('error', { message: 'Invalid question ID' });
      return;
    }

    const player = session.players.find(p => p.id === socket.id);
    if (!player) {
      socket.emit('error', { message: 'Player not found in session' });
      return;
    }

    // Check if player has already answered
    const existingAnswerIndex = player.answers.findIndex(a => a.questionId === questionId);
    if (existingAnswerIndex >= 0) {
      socket.emit('error', { message: 'You have already answered this question' });
      return;
    }

    // Record the answer
    const isCorrect = optionIndex === currentQuestion.correctOption;
    const answerTime = Date.now();
    
    player.answers.push({
      questionId,
      optionIndex,
      isCorrect,
      time: answerTime
    });

    // Calculate score
    if (isCorrect) {
      player.score += 10;  // Basic score for correct answer
    }

    // Notify the player their answer was recorded
    socket.emit('answer-recorded', { questionId });

    // Check if all players have answered
    const allPlayersAnswered = session.players.every(p => 
      p.answers.some(a => a.questionId === questionId)
    );

    // If all players have answered, we could potentially move to the next question
    // early, but per requirements we wait for the full timer
  });

  // When a player quits
  socket.on('quit', () => {
    handlePlayerDisconnect();
  });

  // When a player disconnects
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    handlePlayerDisconnect();
  });

  // Function to handle player disconnection or quitting
  function handlePlayerDisconnect() {
    if (currentSessionId && sessions.has(currentSessionId)) {
      const session = sessions.get(currentSessionId);
      
      // Remove player from the session
      const playerIndex = session.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        session.players.splice(playerIndex, 1);
        
        // Notify remaining players
        socket.to(currentSessionId).emit('player-left', { playerId: socket.id });
        
        // If no players left, clean up the session
        if (session.players.length === 0) {
          // Clear any active timers
          if (session.lobbyTimer) {
            clearTimeout(session.lobbyTimer);
          }
          if (session.questionTimer) {
            clearTimeout(session.questionTimer);
          }
          
          // Remove the session
          sessions.delete(currentSessionId);
          console.log(`Session ${currentSessionId} removed as all players left`);
        }
      }
      
      // Leave the room
      socket.leave(currentSessionId);
      currentSessionId = null;
    }
  }
});

// Function to start the lobby timer for a session
function startLobbyTimer(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;
  
  // Clear any existing timer
  if (session.lobbyTimer) {
    clearTimeout(session.lobbyTimer);
  }
  
  // Set new timer
  session.lobbyTimer = setTimeout(() => {
    // Start the game if we still have the session and at least one player
    if (sessions.has(sessionId) && sessions.get(sessionId).players.length > 0) {
      startGame(sessionId);
    }
  }, LOBBY_TIMER * 1000);
  
  // Log
  console.log(`Lobby timer started for session ${sessionId}. Game will start in ${LOBBY_TIMER} seconds.`);
}

// Function to start the game
function startGame(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;
  
  console.log(`Starting game for session ${sessionId} with ${session.players.length} players`);
  
  // Update session status
  session.status = 'playing';
  
  // Notify all players
  io.to(sessionId).emit('game-starting');
  
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
    timeLimit: QUESTION_TIMER
  });
  
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
    
    io.to(sessionId).emit('question-ended', { 
      question: questionWithAnswer
    });
    
    // Wait 3 seconds before moving to the next question
    setTimeout(() => {
      nextQuestion(sessionId);
    }, 3000);
    
  }, QUESTION_TIMER * 1000);
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

// Start the server
const PORT = process.env.PORT || 5001;
let isServerRunning = false;

const startServer = (port) => {
  try {
    server.listen(port);
  } catch (error) {
    handleServerError(error, port);
  }
};

const handleServerError = (error, port) => {
  if (error.code === 'EADDRINUSE') {
    console.log(`Port ${port} is already in use, trying ${port + 1}...`);
    startServer(port + 1);
  } else {
    console.error('Error starting server:', error);
  }
};

server.on('error', (error) => {
  if (!isServerRunning) {
    handleServerError(error, PORT);
  } else {
    console.error('Server error:', error);
  }
});

server.on('listening', () => {
  isServerRunning = true;
  const address = server.address();
  console.log(`Server running on port ${address.port}`);
});

startServer(PORT); 