'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export default function TestClient() {
  const [status, setStatus] = useState('Disconnected');
  const [socketId, setSocketId] = useState('');

  useEffect(() => {
    const socket = io('http://localhost:5001', {
      transports: ['polling', 'websocket']
    });

    socket.on('connect', () => {
      console.log('Connected to server');
      setStatus('Connected');
      setSocketId(socket.id || '');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setStatus('Disconnected');
      setSocketId('');
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setStatus(`Error: ${error.message}`);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Socket.IO Test Client</h1>
      <div>Status: {status}</div>
      {socketId && <div>Socket ID: {socketId}</div>}
    </div>
  );
} 