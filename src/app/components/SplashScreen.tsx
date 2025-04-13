'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Button from './Button';
import { useGame } from '../context/GameContext';

// Animation variants
const titleVariants = {
  hidden: { opacity: 0, y: -50 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.5, 
      delay: 0.2 
    }
  }
};

const subtitleVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.5, 
      delay: 0.4 
    }
  }
};

const buttonVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.5, 
      delay: 0.6 
    }
  }
};

const SplashScreen: React.FC = () => {
  const { play, isConnected } = useGame();
  const containerRef = useRef<HTMLDivElement>(null);
  const [stars, setStars] = useState<Array<{id: number, x: string, y: string, opacity: number, scale: number, width: number}>>([]);
  
  // Generate stars on client-side only to prevent hydration mismatch
  useEffect(() => {
    const generatedStars = Array.from({ length: 100 }).map((_, i) => ({
      id: i,
      x: `${Math.random() * 100}%`,
      y: `${Math.random() * 100}%`,
      opacity: Math.random() * 0.8,
      scale: Math.random(),
      width: Math.max(1, Math.random() * 4),
    }));
    setStars(generatedStars);
  }, []);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const backgroundScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 0.5], [0, -50]);

  return (
    <div 
      ref={containerRef}
      className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden"
      style={{ position: 'relative' }}
    >
      {/* Parallax Background */}
      <motion.div 
        className="absolute inset-0 w-full h-full z-0 bg-gradient-to-b from-blue-900 to-purple-900"
        style={{ 
          y: backgroundY,
          scale: backgroundScale,
        }}
      >
        {/* Animated stars - client-side rendered to prevent hydration mismatch */}
        {stars.map((star) => (
          <motion.div
            key={star.id}
            className="absolute bg-white rounded-full"
            initial={{ 
              x: star.x, 
              y: star.y,
              opacity: star.opacity,
              scale: star.scale,
            }}
            animate={{ 
              opacity: [null, Math.random() * 0.5, Math.random()],
              scale: [null, Math.random() + 0.3, Math.random()],
            }}
            transition={{ 
              duration: 1 + Math.random() * 5,
              repeat: Infinity,
              repeatType: "reverse"
            }}
            style={{ 
              width: `${star.width}px`,
              height: `${star.width}px`,
            }}
          />
        ))}
      </motion.div>

      {/* Content */}
      <motion.div 
        className="relative z-10 text-center p-8 max-w-2xl"
        style={{ opacity: contentOpacity, y: contentY }}
      >
        <motion.h1 
          className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight"
          variants={titleVariants}
          initial="hidden"
          animate="visible"
        >
          Dynamic Multiplayer <span className="text-yellow-400">Quiz Show</span>
        </motion.h1>
        
        <motion.p 
          className="text-xl text-blue-200 mb-8"
          variants={subtitleVariants}
          initial="hidden"
          animate="visible"
        >
          Test your knowledge against other players in real-time with beautifully animated quizzes!
        </motion.p>
        
        <motion.div
          variants={buttonVariants}
          initial="hidden"
          animate="visible"
        >
          <Button 
            onClick={play} 
            disabled={!isConnected}
            className="px-8 py-4 text-xl shadow-lg"
          >
            Play Now
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SplashScreen; 