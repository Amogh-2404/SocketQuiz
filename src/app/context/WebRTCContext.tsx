'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { safeStreamCleanup } from '@/utils/browser-utils';

// Create a safe import for the WebRTC manager
let WebRTCManager: any = null;

// Only load WebRTC on the client side
if (typeof window !== 'undefined') {
  import('@/utils/webrtc').then(module => {
    WebRTCManager = module.default;
  }).catch(err => {
    console.error('Failed to load WebRTC module:', err);
  });
}

// Helper function to check browser compatibility - ONLY used on client side
const checkWebRTCSupport = (): { supported: boolean; reason?: string } => {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'Not in browser environment' };
  }
  
  try {
    // Check for basic WebRTC support
    if (!window.RTCPeerConnection) {
      return { supported: false, reason: 'RTCPeerConnection not supported' };
    }
    
    // Check for media devices API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { supported: false, reason: 'Media devices API not supported' };
    }
    
    return { supported: true };
  } catch (err) {
    return { supported: false, reason: 'Error checking WebRTC support' };
  }
};

interface WebRTCContextProps {
  webrtcManager: any | null;
  localStream: MediaStream | null;
  peerStreams: Map<string, MediaStream>;
  connectedPeers: string[];
  isReady: boolean;
  streamError: string | null;
  isWebRTCSupported: boolean;
  browserSupport: { supported: boolean; reason?: string };
  startLocalStream: (video?: boolean, audio?: boolean) => Promise<MediaStream | null>;
  stopLocalStream: () => void;
  connectToPeer: (peerId: string) => void;
  cleanup: () => void;
  restartStreams: () => void;
  enableCompatibilityMode: () => void;
}

const defaultContextValue: WebRTCContextProps = {
  webrtcManager: null,
  localStream: null,
  peerStreams: new Map(),
  connectedPeers: [],
  isReady: false,
  streamError: null,
  isWebRTCSupported: false,
  browserSupport: { supported: false },
  startLocalStream: async () => null,
  stopLocalStream: () => {},
  connectToPeer: () => {},
  cleanup: () => {},
  restartStreams: () => {},
  enableCompatibilityMode: () => {}
};

interface WebRTCContextExtendedProps extends WebRTCContextProps {
  streamStarting: boolean;
}

const WebRTCContext = createContext<WebRTCContextExtendedProps>({
  ...defaultContextValue,
  streamStarting: false,
});

interface WebRTCProviderProps {
  children: ReactNode;
  socket: Socket | null;
  userId: string;
}

export const WebRTCProvider: React.FC<WebRTCProviderProps> = ({ 
  children, 
  socket,
  userId
}) => {
  const [webrtcManager, setWebRTCManager] = useState<any | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peerStreams, setPeerStreams] = useState<Map<string, MediaStream>>(new Map());
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamAttempts, setStreamAttempts] = useState(0);
  const [streamStarting, setStreamStarting] = useState(false);
  const [browserSupport, setBrowserSupport] = useState<{ supported: boolean; reason?: string }>(
    { supported: false, reason: 'Initializing...' }
  );

  // Add stream health tracking with useRef to persist across renders
  const streamHealthRef = useRef<{
    isRecovering: boolean;
    lastHealthyTimestamp: number;
    tracksEnded: boolean;
  }>({
    isRecovering: false,
    lastHealthyTimestamp: 0,
    tracksEnded: false
  });

  // Track recovery attempts separately from stream attempts
  const recoveryAttemptsRef = useRef<number>(0);
  
  // Define maximum recovery attempts
  const MAX_RECOVERY_ATTEMPTS = 3;

  // Add exponential backoff for recovery timing
  const getRecoveryDelay = (attempts: number): number => {
    return Math.min(1000 * Math.pow(2, attempts), 8000); // 1s, 2s, 4s, 8s max
  };

  // Initialize WebRTC manager when socket is available - client side only
  useEffect(() => {
    // Skip if not in browser
    if (typeof window === 'undefined') return;
    
    // Set browser support
    const support = checkWebRTCSupport();
    setBrowserSupport(support);
    
    if (!socket || !userId) return;
    
    if (!support.supported) {
      console.error('WebRTC not supported:', support.reason);
      setStreamError(`WebRTC not supported: ${support.reason}`);
      return;
    }

    // Ensure WebRTCManager is loaded
    if (!WebRTCManager) {
      console.log('WebRTCManager not loaded yet, waiting...');
      setStreamError('WebRTC module is still loading, please wait...');
      
      // Try again in a second
      const interval = setInterval(() => {
        if (WebRTCManager) {
          clearInterval(interval);
          initializeManager();
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
    
    initializeManager();
    
    function initializeManager() {
      try {
        console.log('Initializing WebRTC manager for user:', userId);
        const manager = new WebRTCManager(socket, userId);
        setWebRTCManager(manager);
        setIsReady(true);
        setStreamError(null);

        // Set up event handlers
        manager.onPeerConnect((peerId: string) => {
          console.log(`Peer connected: ${peerId}`);
          setConnectedPeers(prev => [...prev, peerId]);
        });

        manager.onPeerDisconnect((peerId: string) => {
          console.log(`Peer disconnected: ${peerId}`);
          setPeerStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.delete(peerId);
            return newStreams;
          });
          setConnectedPeers(prev => prev.filter(id => id !== peerId));
        });

        manager.onStream((peerId: string, stream: MediaStream) => {
          console.log(`Stream received from peer: ${peerId}`, {
            streamId: stream.id,
            videoTracks: stream.getVideoTracks().length,
            audioTracks: stream.getAudioTracks().length
          });
          
          setPeerStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.set(peerId, stream);
            return newStreams;
          });
        });
      } catch (err) {
        console.error('Error initializing WebRTC manager:', err);
        setStreamError(`Failed to initialize WebRTC: ${err}`);
      }
    }

    return () => {
      if (webrtcManager) {
        console.log('Cleaning up WebRTC manager');
        webrtcManager.cleanup();
      }
    };
  }, [socket, userId]);

  // Remove all auto-restart effects to prevent infinite loops.
  // Only allow manual stream recovery via UI (e.g., 'Restart Media' button in ErrorNotification).
  // If manual recovery is not already present, ensure user has a way to trigger restartStreams().

  // Reset streamStarting when stream becomes available
  useEffect(() => {
    if (localStream) {
      setStreamStarting(false);
    }
  }, [localStream]);

  // Add a cooldown timer to prevent excessive stream restarts
  const lastStreamAttemptRef = useRef<number>(0);
  const STREAM_RESTART_COOLDOWN = 5000; // 5 seconds cooldown
  
  // Function to handle tracks ending
  // No automatic recovery. Only allow manual restart via user action (e.g., Restart Media button).
  const handleTrackEnded = useCallback(() => {
    console.log('Media track ended unexpectedly');
    streamHealthRef.current.tracksEnded = true;
    setStreamError('Media stream disconnected. Please restart manually.');
  }, []);
  
  // Function to start local media stream with cooldown protection
  const startLocalStream = async (video: boolean = true, audio: boolean = true) => {
    if (streamStarting) {
      console.log('Stream start already in progress.');
      return localStream;
    }
    setStreamStarting(true);
    if (!webrtcManager) {
      console.error('WebRTC manager not initialized');
      setStreamError('WebRTC manager not initialized');
      return null;
    }

    // Check if browser supports WebRTC
    if (!browserSupport.supported) {
      setStreamError(`WebRTC not supported: ${browserSupport.reason}`);
      return null;
    }
    
    // Prevent excessive restarts using cooldown
    const now = Date.now();
    if (now - lastStreamAttemptRef.current < STREAM_RESTART_COOLDOWN) {
      console.log('Stream restart attempted too soon, on cooldown');
      return localStream; // Return existing stream instead of creating a new one
    }
    lastStreamAttemptRef.current = now;

    try {
      console.log(`Starting local stream. Video: ${video}, Audio: ${audio}`);
      setStreamError(null);
      const stream = await webrtcManager.startLocalStream(video, audio);
      
      if (stream) {
        console.log('Local stream started successfully', {
          streamId: stream.id,
          videoTracks: stream.getVideoTracks().length,
          audioTracks: stream.getAudioTracks().length
        });
        
        // Only update state if the stream is valid and has active tracks
        const hasValidTracks = 
          (stream.getVideoTracks().length === 0 || 
           stream.getVideoTracks().some((track: MediaStreamTrack) => track.readyState === 'live')) &&
          (stream.getAudioTracks().length === 0 || 
           stream.getAudioTracks().some((track: MediaStreamTrack) => track.readyState === 'live'));
        
        if (hasValidTracks) {
          // First ensure any tracks in current stream are properly stopped
          if (localStream) {
            safeStreamCleanup(localStream);
          }
          
          // Add event listeners to tracks for monitoring
          stream.getTracks().forEach((track: MediaStreamTrack) => {
            track.addEventListener('ended', handleTrackEnded);
          });
          
          // Reset stream health tracking
          streamHealthRef.current = {
            isRecovering: false,
            lastHealthyTimestamp: Date.now(),
            tracksEnded: false
          };
          
          // Set the new stream
          setLocalStream(stream);
          
          // Reset stream attempts when successful
          setStreamAttempts(0);
          recoveryAttemptsRef.current = 0;
          
          return stream;
        } else {
          console.warn('Stream has no valid tracks');
          throw new Error('Stream has no valid tracks');
        }
      } else {
        throw new Error('No stream returned from startLocalStream');
      }
      setStreamStarting(false);
    } catch (error: any) {
      console.error('Failed to get local media stream:', error);
      
      // More detailed error handling
      if (error.name === 'NotAllowedError') {
        setStreamError('Camera/microphone access denied. Please check permissions.');
      } else if (error.name === 'NotFoundError') {
        setStreamError('Camera/microphone not found. Please check device connections.');
      } else if (error.name === 'NotReadableError') {
        setStreamError('Camera/microphone is already in use by another application.');
      } else if (error.name === 'OverconstrainedError') {
        setStreamError('Camera constraints cannot be satisfied. Trying lower quality.');
        // Try again with lower constraints if this is our first attempt
        if (video && streamAttempts < 1) {
          setStreamAttempts(prev => prev + 1);
          return startLocalStream(true, audio);
        }
      } else {
        setStreamError(`Media error: ${error.message}`);
      }
      
      // Try again with just audio if video fails and this was our first attempt with video
      if (video && !audio && streamAttempts < 2) {
        console.log('Retrying with audio only...');
        setStreamAttempts(prev => prev + 1);
        return startLocalStream(false, true);
      }
      
      setStreamStarting(false);
      throw error;
    }
    setStreamStarting(false);
  };

  // Function to stop local media stream
  const stopLocalStream = () => {
    setStreamStarting(false); // Reset flag on manual stop
    if (webrtcManager) {
      console.log('Stopping local stream');
      try {
        webrtcManager.stopLocalStream();
        
        // Perform additional cleanup
        if (localStream) {
          // Remove event listeners from tracks
          localStream.getTracks().forEach((track: MediaStreamTrack) => {
            track.removeEventListener('ended', handleTrackEnded);
          });
          
          // Force stop all tracks to ensure complete cleanup
          safeStreamCleanup(localStream);
        }
        
        setLocalStream(null);
      } catch (error) {
        console.error('Error stopping local stream:', error);
        // Still update state
        setLocalStream(null);
      }
    }
  };

  // Function to connect to a peer
  const connectToPeer = (peerId: string) => {
    if (webrtcManager) {
      console.log(`Connecting to peer: ${peerId}`);
      webrtcManager.connectToPeer(peerId);
    } else {
      console.error('Cannot connect to peer: WebRTC manager not initialized');
    }
  };

  // Add a more comprehensive restart function
  const restartStreams = async () => {
    console.log('Restarting all streams');
    
    // Prevent restarts if already in recovery or cooldown
    if (streamHealthRef.current.isRecovering) {
      console.log('Already recovering stream, skipping additional restart');
      return;
    }
    
    const now = Date.now();
    if (now - lastStreamAttemptRef.current < STREAM_RESTART_COOLDOWN) {
      console.log('Stream restart on cooldown, try again later');
      return;
    }
    
    streamHealthRef.current.isRecovering = true;
    lastStreamAttemptRef.current = now;
    
    try {
      // First stop existing streams
      if (webrtcManager) {
        webrtcManager.stopLocalStream();
      }
      
      if (localStream) {
        // Force stop all tracks
        safeStreamCleanup(localStream);
        
        // Clear the local stream state
        setLocalStream(null);
      }
      
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Start a new local stream
      const newStream = await startLocalStream(true, true);
      
      if (newStream) {
        console.log('Successfully restarted local stream');
        
        // Force reconnect to all peers only if needed
        const currentPeers = [...connectedPeers];
        if (currentPeers.length > 0 && webrtcManager) {
          console.log('Reconnecting to existing peers:', currentPeers);
          
          currentPeers.forEach(peerId => {
            try {
              webrtcManager.connectToPeer(peerId);
            } catch (err) {
              console.warn(`Failed to reconnect to peer ${peerId}:`, err);
            }
          });
        }
        
        // Reset recovery state
        streamHealthRef.current.isRecovering = false;
        streamHealthRef.current.lastHealthyTimestamp = Date.now();
        streamHealthRef.current.tracksEnded = false;
      }
    } catch (err) {
      console.error('Failed to restart streams:', err);
      setStreamError(`Failed to restart streams: ${err}`);
      
      // Reset recovery state even on failure
      streamHealthRef.current.isRecovering = false;
      
      // Try one more time with compatibility mode if regular mode failed
      if (!useCompatibilityMode.current) {
        console.log('Trying again with compatibility mode...');
        enableCompatibilityMode();
        
        try {
          await startLocalStream(true, true);
        } catch (compatErr) {
          console.error('Failed even with compatibility mode:', compatErr);
        }
      }
    }
  };
  
  // Track if compatibility mode is enabled (convert to useRef to avoid re-renders)
  const useCompatibilityMode = useRef(false);
  
  // Enable compatibility mode function
  const enableCompatibilityMode = () => {
    if (!webrtcManager) return;
    console.log('Enabling WebRTC compatibility mode');
    
    // Set the flag
    useCompatibilityMode.current = true;
    
    // Apply compatibility mode in the WebRTC manager
    try {
      webrtcManager.enableCompatibilityMode();
    } catch (err) {
      console.error('Failed to enable compatibility mode:', err);
    }
  };

  // Function to clean up all connections
  const cleanup = () => {
    if (webrtcManager) {
      console.log('Cleaning up WebRTC connections');
      try {
        webrtcManager.cleanup();
        
        // Ensure all streams are properly cleaned up
        if (localStream) {
          safeStreamCleanup(localStream);
        }
        
        // Clear all peer streams
        peerStreams.forEach(stream => {
          safeStreamCleanup(stream);
        });
        
        // Update state regardless of success
        setPeerStreams(new Map());
        setConnectedPeers([]);
        setLocalStream(null);
        setStreamError(null);
        setStreamAttempts(0);
        recoveryAttemptsRef.current = 0;
        streamHealthRef.current = {
          isRecovering: false,
          lastHealthyTimestamp: 0,
          tracksEnded: false
        };
      } catch (error) {
        console.error('Error cleaning up WebRTC connections:', error);
        // Still update state
        setPeerStreams(new Map());
        setConnectedPeers([]);
        setLocalStream(null); 
        setStreamError(null);
        setStreamAttempts(0);
      }
    }
  };

  // Ensure cleanup happens when the component unmounts
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Auto-recovery mechanism to restart streams when error is detected
  useEffect(() => {
    if (!webrtcManager || !streamError) return;
    
    let recoveryTimeout: NodeJS.Timeout | null = null;
    
    // Only attempt auto-recovery if we have a specific error that might be recoverable
    // and if we're not already in the middle of recovery attempts
    const isRecoverableError = 
      ((streamError.includes('Play error') || 
       streamError.includes('aborted') ||
       streamError.includes('interrupted') ||
       streamError.includes('failed to load') ||
       streamError.includes('no active tracks') ||
       streamError.includes('No stream')) &&
      recoveryAttemptsRef.current < MAX_RECOVERY_ATTEMPTS && 
      !streamHealthRef.current.isRecovering);
    
    if (isRecoverableError) {
      console.log(`Attempting auto-recovery for stream error: ${streamError} (Attempt ${recoveryAttemptsRef.current + 1}/${MAX_RECOVERY_ATTEMPTS})`);
      
      // Set a delay before trying to recover - with increasing backoff
      const recoveryDelay = getRecoveryDelay(recoveryAttemptsRef.current);
      
      streamHealthRef.current.isRecovering = true;
      
      recoveryTimeout = setTimeout(() => {
        // Increment recovery attempts
        recoveryAttemptsRef.current += 1;
        
        // Clear error before attempting restart
        setStreamError(null);
        
        // Restart with a slight delay
        setTimeout(() => {
          restartStreams().catch(err => {
            console.error('Recovery attempt failed:', err);
            streamHealthRef.current.isRecovering = false;
          });
        }, 500);
      }, recoveryDelay);
    }
    
    return () => {
      if (recoveryTimeout) {
        clearTimeout(recoveryTimeout);
      }
    };
  }, [streamError, webrtcManager]);
  
  // Add periodic connection check to detect stalled connections
  useEffect(() => {
    if (!webrtcManager || !isReady) return;
    
    // Check connection status periodically
    const connectionCheck = setInterval(() => {
      // Only check if we should have peers but don't have streams
      if (connectedPeers.length > 0 && peerStreams.size === 0) {
        console.log('Peer connections appear stalled - peers connected but no streams');
        
        // Only restart if we haven't attempted too many times
        if (streamAttempts < 2) {
          setStreamAttempts(prev => prev + 1);
          
          // Try to restart with a slight delay
          setTimeout(() => {
            restartStreams().catch(err => {
              console.error('Restart attempt for stalled connections failed:', err);
            });
          }, 1000);
        }
      }
    }, 15000); // Check every 15 seconds
    
    return () => clearInterval(connectionCheck);
  }, [webrtcManager, isReady, connectedPeers.length, peerStreams.size, streamAttempts]);
  
  // Additional handler to keep local stream active and restart if it gets disconnected
  useEffect(() => {
    if (!webrtcManager || !isReady) return;
    
    // Check if local stream should be active but isn't
    const localStreamCheck = setInterval(() => {
      // Only attempt restart if we have connected peers but no local stream
      const shouldHaveLocalStream = connectedPeers.length > 0;
      
      if (shouldHaveLocalStream && !localStream && streamAttempts < 3) {
        console.log('Local stream missing but should be active, attempting to restart');
        
        setStreamAttempts(prev => prev + 1);
        
        startLocalStream().catch(err => {
          console.error('Failed to restart local stream:', err);
        });
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(localStreamCheck);
  }, [webrtcManager, isReady, localStream, connectedPeers.length, streamAttempts, startLocalStream]);

  return (
    <WebRTCContext.Provider
      value={{
        webrtcManager,
        localStream,
        peerStreams,
        connectedPeers,
        isReady,
        streamError,
        isWebRTCSupported: browserSupport.supported,
        browserSupport,
        startLocalStream,
        stopLocalStream,
        connectToPeer,
        cleanup,
        restartStreams,
        enableCompatibilityMode,
        streamStarting
      } }
    >
      {children}
    </WebRTCContext.Provider>
  );
};

export const useWebRTC = () => useContext(WebRTCContext); 