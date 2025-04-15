'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../context/GameContext';

interface NetworkStatsProps {}

const NetworkStats: React.FC<NetworkStatsProps> = () => {
  const { socket, gameState } = useGame();
  const [latency, setLatency] = useState<number>(0);
  const [packetLoss, setPacketLoss] = useState<number>(0);
  const [lastPingTime, setLastPingTime] = useState<number>(Date.now());
  const [showDetails, setShowDetails] = useState<boolean>(false);

  useEffect(() => {
    if (!socket) return;

    const pingInterval = setInterval(() => {
      setLastPingTime(Date.now());
      socket.emit('ping');
    }, 2000);

    socket.on('pong', (data: { latency: number, packetLoss: number }) => {
      const currentLatency = Date.now() - lastPingTime;
      setLatency(currentLatency);
      setPacketLoss(data.packetLoss);
    });

    return () => {
      clearInterval(pingInterval);
      socket.off('pong');
    };
  }, [socket, lastPingTime]);

  const getNetworkHealthColor = () => {
    if (latency < 100) return 'bg-green-500';
    if (latency < 300) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getNetworkHealthText = () => {
    if (latency < 100) return 'Good';
    if (latency < 300) return 'Fair';
    return 'Poor';
  };

  if (!socket || gameState.gameState === 'idle') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 right-4 z-50"
    >
      <motion.div
        whileHover={{ scale: showDetails ? 1 : 1.05 }}
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-full p-2 cursor-pointer shadow-lg"
      >
        <div className={`w-4 h-4 rounded-full ${getNetworkHealthColor()}`}></div>
        
        {showDetails && (
          <div className="ml-3 text-white text-sm">
            <div className="font-medium">Network: {getNetworkHealthText()}</div>
            <div className="text-xs opacity-80">Latency: {latency}ms</div>
            {packetLoss > 0 && (
              <div className="text-xs opacity-80">Packet Loss: {packetLoss.toFixed(1)}%</div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default NetworkStats; 