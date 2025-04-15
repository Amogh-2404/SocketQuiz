'use client';

import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import VideoPlayer from './VideoPlayer';
import { useWebRTC } from '@/app/context/WebRTCContext';
import { motion, AnimatePresence } from 'framer-motion';
import initials from 'initials';

interface VideoGridProps {
  players: { id: string; name: string }[];
  highlightedPlayerId?: string;
  showLocalVideo?: boolean;
  size?: 'small' | 'medium' | 'large';
}

// Add a local getInitials function as fallback
const getInitials = (name: string): string => {
  if (!name) return '?';
  
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

const VideoGrid: React.FC<VideoGridProps> = ({
  players,
  highlightedPlayerId,
  showLocalVideo = true,
  size = 'medium'
}) => {
  const { localStream, peerStreams, startLocalStream, browserSupport, restartStreams, streamStarting } = useWebRTC();
  const [retryCount, setRetryCount] = useState(0);
  const [lastRetryAttempt, setLastRetryAttempt] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  
  // Only attempt to start local stream on mount if not already starting
  // Only attempt to start local stream on mount (once) if not already starting
  useEffect(() => {
    if (!showLocalVideo) return;
    let mounted = true;
    startLocalStream(true, true).catch(err => {
      if (mounted) {
        console.error('Failed to start local stream:', err);
      }
    });
    return () => {
      mounted = false;
    };
    // Only run on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Remove all automatic retry/recovery logic. Only allow manual recovery by user (e.g., via Restart Media button).
  // (No auto-recovery useEffect present)

  
  // Reset retry count when stream becomes available
  useEffect(() => {
    if (localStream) {
      setRetryCount(0);
    }
  }, [localStream]);
  
  // Generate grid layout based on the number of participants
  const gridLayout = useMemo(() => {
    // Count actual participants that have streams or are about to have streams
    const totalCount = players.length + (showLocalVideo ? 1 : 0);
    
    if (totalCount <= 1) return 'grid-cols-1';
    if (totalCount <= 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalCount <= 4) return 'grid-cols-2';
    if (totalCount <= 6) return 'grid-cols-2 md:grid-cols-3';
    if (totalCount <= 9) return 'grid-cols-3';
    return 'grid-cols-3 md:grid-cols-4';
  }, [players.length, showLocalVideo]);
  
  // Adjust video size based on number of participants
  const videoSize = useMemo(() => {
    const totalCount = players.length + (showLocalVideo ? 1 : 0);
    
    if (totalCount <= 2) return 'large';
    if (totalCount <= 4) return size;
    if (totalCount <= 9) return size === 'large' ? 'medium' : 'small';
    return 'small';
  }, [players.length, showLocalVideo, size]);
  
  // Get all participating players with their streams
  const participants = useMemo(() => {
    const remoteParticipants = players.map(player => {
      // Get stream if available
      const stream = peerStreams.get(player.id);
      
      return {
        id: player.id,
        name: player.name,
        stream: stream || null,
        isLocal: false,
        isHighlighted: player.id === highlightedPlayerId
      };
    });
    
    // Add local participant if needed
    if (showLocalVideo) {
      return [
        {
          id: 'local',
          name: 'You',
          stream: localStream,
          isLocal: true,
          isHighlighted: 'local' === highlightedPlayerId
        },
        ...remoteParticipants
      ];
    }
    
    return remoteParticipants;
  }, [localStream, players, peerStreams, highlightedPlayerId, showLocalVideo]);
  
  // Handler to force restart streams with button click
  const handleRestartStreams = useCallback(() => {
    setLastRetryAttempt(Date.now());
    restartStreams();
  }, [restartStreams]);
  
  // Memo the animation variants to prevent recreating on each render
  const gridVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.3,
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { scale: 1, opacity: 1, transition: { duration: 0.3 } }
  };
  
  return (
    <div className="relative">
      {(!localStream && showLocalVideo) && (
        <button 
          onClick={handleRestartStreams}
          className="absolute -top-10 right-0 bg-blue-600 text-white px-2 py-1 rounded-md text-xs z-10"
        >
          Restart Video
        </button>
      )}
      
      <motion.div 
        ref={gridRef}
        className={`grid ${gridLayout} gap-3 w-full justify-center p-2`}
        variants={gridVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence mode="sync">
          {participants.map(participant => (
            <motion.div
              key={participant.id}
              className={`flex justify-center items-center overflow-hidden rounded-lg ${
                participant.isHighlighted ? 'ring-4 ring-yellow-400 z-10' : ''
              }`}
              variants={itemVariants}
              layout
              layoutId={`video-${participant.id}`}
            >
              <VideoPlayer
                stream={participant.stream}
                username={participant.name}
                isLocal={participant.isLocal}
                muted={participant.isLocal}
                size={videoSize}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default React.memo(VideoGrid); 