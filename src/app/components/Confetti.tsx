'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

type ConfettiPiece = {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
};

type ConfettiProps = {
  active: boolean;
  count?: number;
};

const COLORS = [
  '#FF5252', // Red
  '#FFAB40', // Orange
  '#FFFF00', // Yellow
  '#69F0AE', // Green
  '#40C4FF', // Blue
  '#E040FB', // Purple
  '#FFFFFF', // White
];

const Confetti: React.FC<ConfettiProps> = ({ active, count = 100 }) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (active) {
      const newPieces = Array.from({ length: count }).map((_, i) => ({
        id: i,
        x: Math.random() * 100, // position in viewport (percent)
        y: -10 - Math.random() * 10, // start above viewport
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 5 + Math.random() * 10, // random size between 5-15px
        rotation: Math.random() * 360, // random rotation 
      }));
      
      setPieces(newPieces);
    } else {
      setPieces([]);
    }
  }, [active, count]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((piece) => (
        <motion.div
          key={piece.id}
          initial={{ 
            x: `${piece.x}vw`, 
            y: `${piece.y}vh`, 
            rotate: piece.rotation
          }}
          animate={{ 
            y: '100vh',
            rotate: piece.rotation + 720, // extra rotation during fall
          }}
          transition={{ 
            duration: 3 + Math.random() * 3, // 3-6 seconds to fall
            ease: [0.1, 0.25, 0.3, 1], // custom ease
            delay: Math.random() * 0.5, // random delay up to 0.5s
          }}
          style={{
            position: 'absolute',
            backgroundColor: piece.color,
            width: piece.size,
            height: piece.size * (0.5 + Math.random() * 1), // rectangle shape
            borderRadius: Math.random() > 0.5 ? '50%' : '0%', // some round, some square
            transformOrigin: 'center center',
          }}
        />
      ))}
    </div>
  );
};

export default Confetti; 