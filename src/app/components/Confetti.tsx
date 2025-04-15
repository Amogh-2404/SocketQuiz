'use client';

import React from 'react';
import { motion } from 'framer-motion';

const Confetti: React.FC = () => {
  const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
  const confettiPieces = Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    color: colors[Math.floor(Math.random() * colors.length)],
    x: Math.random() * 100,
    y: -10,
    rotation: Math.random() * 360,
    scale: Math.random() * 0.5 + 0.5,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {confettiPieces.map((piece) => (
        <motion.div
          key={piece.id}
          className="absolute w-2 h-2 rounded-full"
          style={{
            backgroundColor: piece.color,
            left: `${piece.x}%`,
            top: `${piece.y}%`,
          }}
          initial={{
            y: 0,
            opacity: 1,
            rotate: 0,
          }}
          animate={{
            y: '100vh',
            opacity: 0,
            rotate: piece.rotation,
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            ease: 'easeOut',
            repeat: 0,
          }}
        />
      ))}
    </div>
  );
};

export default Confetti; 