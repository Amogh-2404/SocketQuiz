/**
 * Browser-specific utility functions
 */

import { Socket } from 'socket.io-client';

/**
 * Safely disconnect a socket.io socket
 * 
 * This function handles all the edge cases of socket disconnection:
 * - Checks if the socket exists
 * - Checks if it's connected before disconnecting
 * - Uses try-catch to handle any disconnection errors
 * - Returns immediately when socket is null
 * 
 * @param socket The socket to disconnect
 * @param callback Optional callback to run after disconnection
 */
export const safeSocketDisconnect = (socket: Socket | null, callback?: () => void): void => {
  if (!socket) {
    // If there's no socket, just run the callback if provided
    if (callback) callback();
    return;
  }
  
  try {
    // Remove all listeners first
    if (typeof socket.offAny === 'function') {
      socket.offAny();
    }
    
    // Only disconnect if the socket is actually connected
    if (socket.connected) {
      // Disconnect with a callback if provided
      socket.disconnect();
    }
    
    // Run callback after disconnection is complete
    if (callback) {
      setTimeout(callback, 0);
    }
  } catch (error) {
    console.error('Error during socket disconnection:', error);
    // Still run the callback if there was an error
    if (callback) {
      setTimeout(callback, 0);
    }
  }
};

/**
 * Safe cleanup function for MediaStream
 * 
 * @param stream The MediaStream to clean up
 */
export const safeStreamCleanup = (stream: MediaStream | null): void => {
  if (!stream) return;
  
  try {
    // Stop all tracks in the stream
    stream.getTracks().forEach(track => {
      try {
        track.stop();
      } catch (err) {
        console.warn('Error stopping media track:', err);
      }
    });
  } catch (error) {
    console.error('Error cleaning up media stream:', error);
  }
};

/**
 * Attempt to reset browser media permissions
 * 
 * This helps in cases where the media permission gets stuck or is in an error state
 * Especially useful in Safari which can get into permission issue states
 */
export const resetMediaPermissions = async (): Promise<void> => {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    console.log('Cannot reset media permissions - no mediaDevices API');
    return;
  }
  
  // Detect browser type for specialized handling
  const isFirefox = navigator.userAgent.includes('Firefox');
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  // For Safari, add extra delay as it tends to have issue with rapid permission changes
  const permissionSettleTime = isSafari ? 300 : 100;
  
  // First, stop any existing streams that might be hanging
  if (typeof document !== 'undefined') {
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach(video => {
      if (video.srcObject && video.srcObject instanceof MediaStream) {
        try {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach(track => {
            try {
              track.stop();
            } catch (e) {
              // Ignore individual track stop errors
            }
          });
          // Clear the srcObject
          video.srcObject = null;
        } catch (e) {
          // Ignore video element errors during cleanup
        }
      }
    });
  }
  
  // Add small delay to allow browser to release previous permissions
  await new Promise(resolve => setTimeout(resolve, permissionSettleTime));
  
  // Attempt a series of increasingly permissive permission requests
  const permissionAttempts = [
    // First try audio only - least invasive
    async () => {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audioStream.getTracks().forEach(track => track.stop());
        return true;
      } catch (e) {
        return false;
      }
    },
    
    // Then try video only with constraints
    async () => {
      try {
        const constraints = {
          audio: false,
          video: { 
            width: { ideal: 320 },
            height: { ideal: 240 },
            frameRate: { ideal: 10 }
          }
        };
        const videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoStream.getTracks().forEach(track => track.stop());
        return true;
      } catch (e) {
        return false;
      }
    },
    
    // Finally try both audio and video with minimal constraints
    async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: true 
        });
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch (e) {
        return false;
      }
    }
  ];
  
  // Try each method with small delays between
  for (const attempt of permissionAttempts) {
    const success = await attempt();
    if (success) {
      console.log('Successfully reset media permissions');
      return;
    }
    // Add delay between attempts
    await new Promise(resolve => setTimeout(resolve, permissionSettleTime));
  }
  
  console.warn('All permission reset attempts failed');
  
  // Special handling for Firefox which sometimes needs a more aggressive approach
  if (isFirefox) {
    try {
      // Force enumeration which can sometimes reset permissions state in Firefox
      await navigator.mediaDevices.enumerateDevices();
    } catch (e) {
      // Ignore errors from enumeration
    }
  }
};

/**
 * Emergency camera release - a global function to force-stop all active media tracks
 * This is the most reliable way to ensure cameras are released
 */
export const forceReleaseAllMediaDevices = (): void => {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) return;

  try {
    // Get all media streams that might be active
    const mediaStreams: MediaStream[] = [];
    
    // Method 1: Use MediaDevices.getTracks if available
    if (navigator.mediaDevices && 'getTracks' in navigator.mediaDevices) {
      try {
        // @ts-ignore - This is a non-standard API but works in some browsers
        const tracks = navigator.mediaDevices.getTracks();
        if (tracks && tracks.length) {
          tracks.forEach((track: MediaStreamTrack) => {
            try {
              track.stop();
            } catch (e) {
              console.warn('Failed to stop track:', e);
            }
          });
        }
      } catch (e) {
        console.warn('getTracks method failed:', e);
      }
    }
    
    // Method 2: Use enumerateDevices to release camera based on deviceId
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        if (videoDevices.length > 0) {
          // For each video device, create a bogus stream and then immediately stop it
          // This tricks the browser into releasing any hanging references
          videoDevices.forEach(device => {
            navigator.mediaDevices.getUserMedia({
              video: { deviceId: device.deviceId }
            }).then(stream => {
              stream.getTracks().forEach(track => track.stop());
            }).catch(() => {
              // Ignore - this is just a forced cleanup
            });
          });
        }
      })
      .catch(err => {
        console.warn('Failed to enumerate devices:', err);
      });
      
    // Method 3: If we have access to active streams directly, stop them
    if (typeof document !== 'undefined') {
      // Find all video elements on the page
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach(video => {
        if (video.srcObject && video.srcObject instanceof MediaStream) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach(track => {
            try {
              track.stop();
              console.log('Stopped track from video element:', track.kind);
            } catch (e) {
              console.warn('Failed to stop track from video element:', e);
            }
          });
          // Clear the srcObject to help garbage collection
          try {
            video.srcObject = null;
          } catch (e) {
            console.warn('Failed to clear video srcObject:', e);
          }
        }
      });
    }
  } catch (error) {
    console.error('Emergency camera release failed:', error);
  }
};

// Automatically install the emergency release handler when this module loads
if (typeof window !== 'undefined') {
  // Add both beforeunload and visibilitychange handlers
  window.addEventListener('beforeunload', () => {
    forceReleaseAllMediaDevices();
  });
  
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      forceReleaseAllMediaDevices();
    }
  });
  
  // Also handle page navigation
  if ('onpagehide' in window) {
    window.addEventListener('pagehide', () => {
      forceReleaseAllMediaDevices();
    });
  }
} 