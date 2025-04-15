// Simple test client for debugging socket.io connections
const { io } = require('socket.io-client');

console.log('Starting websocket connection test...');

const socket = io('http://localhost:5002', {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 20000,
  transports: ['polling', 'websocket'],
  autoConnect: true,
  forceNew: true,
  withCredentials: false
});

socket.on('connect', () => {
  console.log('Successfully connected! Socket ID:', socket.id);
  // Try sending a basic message
  socket.emit('join', { name: 'TestUser' });
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
  console.log('Transport used:', socket.io.engine?.transport?.name);
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('welcome', (data) => {
  console.log('Received welcome message:', data);
});

socket.on('join-ack', (data) => {
  console.log('Join acknowledged:', data);
  
  // Test complete - disconnect after 3 seconds
  setTimeout(() => {
    console.log('Test complete, disconnecting...');
    socket.disconnect();
    process.exit(0);
  }, 3000);
});

// Exit after 10 seconds if no connection
setTimeout(() => {
  console.log('Timeout - no connection established within 10 seconds');
  process.exit(1);
}, 10000); 