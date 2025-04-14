const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:5001';

async function testServer() {
  console.log('Starting server tests...');
  
  // Test 1: Basic Connection
  console.log('\nTest 1: Basic Connection');
  const socket1 = io(SERVER_URL);
  await new Promise(resolve => socket1.on('connect', resolve));
  console.log('✓ Connected to server');
  
  // Test 2: Create Session
  console.log('\nTest 2: Create Session');
  socket1.emit('play');
  const sessionData = await new Promise(resolve => socket1.on('joined', resolve));
  console.log('✓ Session created:', sessionData.sessionId);
  
  // Test 3: Network Monitoring
  console.log('\nTest 3: Network Monitoring');
  const networkStats = await new Promise(resolve => socket1.on('network-stats', resolve));
  console.log('✓ Network stats received:', networkStats);
  
  // Test 4: Set Player Name
  console.log('\nTest 4: Set Player Name');
  socket1.emit('set-name', { name: 'Test Player' });
  const nameUpdate = await new Promise(resolve => socket1.on('player-renamed', resolve));
  console.log('✓ Player name set:', nameUpdate);
  
  // Test 5: Session State Persistence
  console.log('\nTest 5: Session State Persistence');
  socket1.disconnect();
  await new Promise(resolve => setTimeout(resolve, 1000));
  socket1.connect();
  socket1.emit('reconnect-attempt', { sessionId: sessionData.sessionId });
  const reconnectData = await new Promise(resolve => socket1.on('reconnected', resolve));
  console.log('✓ Session state recovered:', reconnectData);
  
  // Test 6: Cleanup
  console.log('\nTest 6: Cleanup');
  socket1.emit('quit');
  socket1.disconnect();
  console.log('✓ Cleanup completed');
  
  console.log('\nAll tests completed successfully!');
  process.exit(0);
}

testServer().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}); 