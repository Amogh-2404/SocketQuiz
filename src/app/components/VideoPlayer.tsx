'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import initials from 'initials';

interface VideoPlayerProps {
  stream: MediaStream | null;
  username?: string;
  isLocal?: boolean;
  muted?: boolean;
  size?: 'small' | 'medium' | 'large';
}

// Fallback function to get user initials
const getInitials = (name: string = ''): string => {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2) || '?';
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  stream,
  username = 'User',
  isLocal = false,
  muted = false,
  size = 'medium'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [videoActive, setVideoActive] = useState(false);
  const [audioActive, setAudioActive] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mountedRef = useRef(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const trackCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playAttemptRef = useRef(0);
  // DEBUG: Log stream and video track status every render (after state is defined)
  const videoTracks = stream ? stream.getVideoTracks() : [];
  console.log('[VideoPlayer] render:', {
    username,
    isLocal,
    stream,
    videoActive,
    videoTracks: videoTracks.map(t => ({ id: t.id, readyState: t.readyState, muted: t.muted, enabled: t.enabled }))
  });
  
  // Track if component is mounted
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Clear any pending timeouts
      if (trackCheckTimeoutRef.current) {
        clearTimeout(trackCheckTimeoutRef.current);
      }
    };
  }, []);
  
  // Safe state setters that check if component is mounted
  const safeSetState = useCallback(<T,>(setter: React.Dispatch<React.SetStateAction<T>>) => {
    return (value: React.SetStateAction<T>) => {
      if (mountedRef.current) {
        setter(value);
      }
    };
  }, []);
  
  const safeSetStreamError = useMemo(() => safeSetState(setStreamError), [safeSetState]);
  const safeSetIsPlaying = useMemo(() => safeSetState(setIsPlaying), [safeSetState]);
  const safeSetVideoActive = useMemo(() => safeSetState(setVideoActive), [safeSetState]);
  const safeSetAudioActive = useMemo(() => safeSetState(setAudioActive), [safeSetState]);
  const safeSetAudioVolume = useMemo(() => safeSetState(setAudioVolume), [safeSetState]);
  
  // Check if tracks are active - only run when needed, not on every render
  const updateTrackStatus = useCallback(() => {
    if (!streamRef.current || !mountedRef.current) return;
    
    const stream = streamRef.current;
    
    // Only update if stream exists
    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();
    
    // Check if video track is active (enabled and live)
    const hasActiveVideo = videoTracks.length > 0 && 
                          videoTracks.some(track => track.enabled && track.readyState === 'live');
    
    // Check if audio track is active
    const hasActiveAudio = audioTracks.length > 0 && 
                          audioTracks.some(track => track.enabled && track.readyState === 'live');
    
    // Only update state if changed to reduce renders
    if (hasActiveVideo !== videoActive) {
      safeSetVideoActive(hasActiveVideo);
    }
    
    if (hasActiveAudio !== audioActive) {
      safeSetAudioActive(hasActiveAudio);
    }
    
    // No need to schedule repeated track checks - we'll do them on track events
  }, [videoActive, audioActive, safeSetVideoActive, safeSetAudioActive]);
  
  // Handle stream connection
  useEffect(() => {
    // Skip if no stream or already using this stream
    if (stream === streamRef.current) return;
    
    // Clean up previous stream resources
    if (streamRef.current && streamRef.current !== stream) {
      const oldStream = streamRef.current;
      
      // Clean up audio processing
      if (audioContextRef.current) {
        try {
          if (audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
          }
        } catch (e) {
          // Ignore audio context errors
        }
        audioContextRef.current = null;
      }
      
      // Clean up track listeners on old stream
      try {
        oldStream.getTracks().forEach(track => {
          track.onended = null;
          track.onmute = null;
          track.onunmute = null;
        });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    // Update the stream reference
    streamRef.current = stream;
    
    // Reset the states
    safeSetIsPlaying(false);
    safeSetStreamError(null);
    playAttemptRef.current = 0;
    
    // Directly check if streams have active tracks
    if (stream) {
      const hasActiveVideo = stream.getVideoTracks().some(track => 
        track.enabled && track.readyState === 'live');
      const hasActiveAudio = stream.getAudioTracks().some(track => 
        track.enabled && track.readyState === 'live');
      safeSetVideoActive(hasActiveVideo);
      safeSetAudioActive(hasActiveAudio);
    } else {
      safeSetVideoActive(false);
      safeSetAudioActive(false);
    }
    
    if (!stream) {
      return;
    }
    
    const video = videoRef.current;
    if (!video) return;
    
    // Track event handlers
    const onTrackEnded = () => updateTrackStatus();
    const onTrackMute = () => updateTrackStatus();
    const onTrackUnmute = () => updateTrackStatus();
    
    // Attach listeners to all new tracks
    stream.getTracks().forEach(track => {
      track.onended = onTrackEnded;
      track.onmute = onTrackMute;
      track.onunmute = onTrackUnmute;
    });
    
    // Setup stream connection with simpler approach
    try {
      // Clear any old source
      video.pause();
      video.srcObject = null;
      
      // Apply most important properties first
      video.muted = isLocal || muted;
      video.playsInline = true;
      video.autoplay = true;
      
      // Then set the stream
      video.srcObject = stream;
      
      // Define simplified play function
      const playVideo = async () => {
        try {
          // Increase attempt counter
          playAttemptRef.current++;
          
          await video.play();
          safeSetIsPlaying(true);
          updateTrackStatus();
        } catch (err: any) {
          console.warn(`Video play attempt ${playAttemptRef.current} failed:`, err.message);
          
          // For autoplay issues, use different strategies based on attempt count
          if (err.name === 'NotAllowedError') {
            if (playAttemptRef.current < 3) {
              // Set up delayed retry with exponential backoff
              setTimeout(() => {
                if (video.srcObject && mountedRef.current) {
                  playVideo();
                }
              }, Math.min(1000 * Math.pow(2, playAttemptRef.current - 1), 4000));
            } else {
              // On third try, wait for user interaction
              document.addEventListener('click', async () => {
                if (video.srcObject && mountedRef.current) {
                  try {
                    await video.play();
                    safeSetIsPlaying(true);
                    updateTrackStatus();
                  } catch (e) {
                    // Ignore errors when playing on user interaction
                  }
                }
              }, { once: true });
            }
          } else if (playAttemptRef.current < 5) {
            // For other errors, retry a few times
            setTimeout(() => {
              if (video.srcObject && mountedRef.current) {
                playVideo();
              }
            }, 1000);
          }
        }
      };
      
      // Play video after a short delay to ensure browser has processed srcObject
      setTimeout(playVideo, 100);
      
      // Set up video element event listeners
      video.onplaying = () => {
        safeSetIsPlaying(true);
        updateTrackStatus();
      };
      
      video.onpause = () => {
        safeSetIsPlaying(false);
      };
      
      video.onerror = () => {
        safeSetStreamError(`Video error: ${video.error?.message || 'Unknown error'}`);
        safeSetIsPlaying(false);
      };
    } catch (err: any) {
      safeSetStreamError(`Stream error: ${err.message}`);
    }
    
    // Cleanup function
    return () => {
      // Remove video element listeners
      if (video) {
        video.onloadedmetadata = null;
        video.onplaying = null;
        video.onpause = null;
        video.onerror = null;
      }
      
      // Clean up audio processing
      if (audioContextRef.current) {
        try {
          if (audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
          }
        } catch (e) {
          // Ignore errors during cleanup
        }
        audioContextRef.current = null;
      }
    };
  }, [stream, isLocal, muted, safeSetIsPlaying, safeSetStreamError, safeSetVideoActive, safeSetAudioActive, updateTrackStatus]);
  
  // Always force a new update of track status when component is mounted
  useEffect(() => {
    // Initial check
    if (streamRef.current) {
      updateTrackStatus();
    }
    
    // Set up periodic check for track status (every 2 seconds)
    const intervalId = setInterval(() => {
      if (streamRef.current && mountedRef.current) {
        updateTrackStatus();
      }
    }, 2000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [updateTrackStatus]);
  
  // Handle retry button click
  const handleRetry = useCallback(() => {
    if (!videoRef.current || !streamRef.current) return;
    
    const video = videoRef.current;
    const stream = streamRef.current;
    
    // Reset error state
    safeSetStreamError(null);
    
    // Attempt to reconnect stream
    try {
      // Disconnect
      video.pause();
      video.srcObject = null;
      
      // Give browser a moment to release resources
      setTimeout(() => {
        if (!mountedRef.current || !video || !stream) return;
        
        // Reconnect
        video.srcObject = stream;
        video.muted = isLocal || muted;
        
        // Attempt to play
        video.play().then(() => {
          safeSetIsPlaying(true);
          updateTrackStatus();
        }).catch(err => {
          console.warn('Retry play error:', err);
        });
      }, 300);
    } catch (err: any) {
      safeSetStreamError(`Retry failed: ${err.message}`);
    }
  }, [isLocal, muted, safeSetIsPlaying, safeSetStreamError, updateTrackStatus]);
  
  // Add a useEffect that specifically focuses on recovery attempts for video failures
  useEffect(() => {
    // Only attempt recovery if there's a stream but video isn't playing
    if (stream && !isPlaying && streamRef.current === stream) {
      // Set up a recovery attempt with exponential backoff
      const recoveryDelay = 1000;
      
      const recoveryTimeout = setTimeout(() => {
        if (!mountedRef.current) return;
        
        console.log('Attempting video recovery');
        const video = videoRef.current;
        if (!video) return;
        
        // Restart video element completely
        try {
          // First pause and reset any existing connection
          video.pause();
          
          // Clear stream connection
          const oldSrc = video.srcObject;
          video.srcObject = null;
          
          // Reset video element state
          video.muted = isLocal || muted;
          video.playsInline = true;
          video.autoplay = true; // Force autoplay for recovery
          
          // Reconnect stream after small delay to allow browser to reset
          setTimeout(() => {
            if (!mountedRef.current || !video) return;
            
            // Reconnect stream
            video.srcObject = stream;
            
            // Force play attempt
            video.play()
              .then(() => {
                safeSetIsPlaying(true);
                updateTrackStatus();
              })
              .catch((err) => {
                console.warn('Recovery play failed:', err);
                // Don't set error here to avoid feedback loop
              });
          }, 300);
        } catch (err) {
          console.warn('Video recovery attempt failed:', err);
        }
      }, recoveryDelay);
      
      return () => clearTimeout(recoveryTimeout);
    }
  }, [stream, isPlaying, isLocal, muted, safeSetIsPlaying, updateTrackStatus]);
  
  // Get size classes based on size prop
  const sizeClasses = {
    small: 'w-24 h-24',
    medium: 'w-40 h-40',
    large: 'w-64 h-64'
  };
  
  // Get user initials for avatar fallback
  const userInitials = typeof initials === 'function' 
    ? initials(username).substring(0, 2) 
    : getInitials(username);
  
  // Calculate if we should show audio indicator based on volume
  const shouldShowAudioIndicator = audioActive && audioVolume > 5 && !isLocal;
  
  // Force user interaction detection for autoplay issues
  useEffect(() => {
    const handleUserInteraction = () => {
      const video = videoRef.current;
      if (video && video.paused && video.srcObject && !isPlaying) {
        console.log('User interaction detected, attempting to play video');
        video.play().catch(err => {
          console.warn('Play attempt after user interaction failed:', err);
        });
      }
    };
    
    // Listen for various interactions
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [isPlaying]);
  
  // Clear video src and reload on certain errors
  useEffect(() => {
    if (streamError && videoRef.current) {
      // If we have an error, completely reset video element
      const video = videoRef.current;
      
      // Reset video element
      setTimeout(() => {
        if (mountedRef.current && streamRef.current) {
          try {
            // Clear and reset srcObject
            video.pause();
            video.srcObject = null;
            
            // Wait a moment before reconnecting
            setTimeout(() => {
              if (mountedRef.current && streamRef.current) {
                video.srcObject = streamRef.current;
                video.play().catch(() => {
                  // Ignore play errors here to avoid feedback loop
                });
              }
            }, 1000);
          } catch (e) {
            console.warn('Error during video element reset:', e);
          }
        }
      }, 2000);
    }
  }, [streamError]);
  
  return (
    <motion.div 
      className={`relative rounded-lg overflow-hidden ${sizeClasses[size]} bg-gray-800 shadow-lg`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Video element */}
      <video 
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal || muted}
        className={`w-full h-full object-cover ${!videoActive || !isPlaying ? 'hidden' : 'block'}`}
      />
      
      {/* Audio level indicator */}
      {shouldShowAudioIndicator && (
        <motion.div 
          className="absolute inset-0 border-4 border-green-500 rounded-md pointer-events-none"
          initial={{ opacity: 0.5, scale: 0.8 }}
          animate={{ 
            opacity: Math.min(0.8, audioVolume / 100), 
            scale: 1 + (audioVolume / 500)
          }}
          transition={{ duration: 0.1 }}
        />
      )}
      
      {/* Error message with retry button */}
      {streamError && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center bg-red-500 bg-opacity-70 text-white p-2"
          onClick={handleRetry}
        >
          <p className="text-xs text-center">{streamError}</p>
          <button 
            className="mt-2 px-2 py-1 bg-white text-red-500 text-xs rounded-md hover:bg-red-100"
            onClick={e => {
              e.stopPropagation();
              handleRetry();
            }}
          >
            Retry
          </button>
        </div>
      )}
      
      {/* Fallback avatar when no video */}
      {(
        !stream ||
        !stream.getVideoTracks().some(track => track.enabled && track.readyState === 'live') ||
        !isPlaying
      ) && !streamError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-700">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-600 text-white text-lg font-bold">
            {userInitials}
          </div>
          <p className="text-xs text-center text-white mt-2">
            {!stream ? 'No camera' : !stream.getVideoTracks().some(track => track.enabled && track.readyState === 'live') ? 'Camera off' : 'Video loading...'}
          </p>
        </div>
      )}
      
      {/* Username label */}
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1.5 text-center truncate">
        {username}{isLocal ? ' (You)' : ''}
      </div>
      
      {/* Status indicators */}
      <div className="absolute top-1 right-1 flex space-x-1">
        {stream && (
          <>
            {stream.getVideoTracks().length > 0 && (
              <div className={`h-3 w-3 rounded-full ${videoActive ? 'bg-green-500' : 'bg-red-500'}`} />
            )}
            {stream.getAudioTracks().length > 0 && (
              <div className={`h-3 w-3 rounded-full ${audioActive ? 'bg-green-500' : 'bg-red-500'}`} />
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default React.memo(VideoPlayer); 