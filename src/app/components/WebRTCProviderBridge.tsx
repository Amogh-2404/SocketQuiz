'use client';

import React from 'react';
import { useGame } from '../context/GameContext';
import { WebRTCProvider } from '../context/WebRTCContext';

interface Props {
  children: React.ReactNode;
}

const WebRTCProviderBridge: React.FC<Props> = ({ children }) => {
  const { socket, player } = useGame();
  const userId = player?.id || '';
  return (
    <WebRTCProvider socket={socket} userId={userId}>
      {children}
    </WebRTCProvider>
  );
};

export default WebRTCProviderBridge;
