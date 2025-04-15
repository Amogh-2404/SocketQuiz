'use client';

import { useEffect, useRef } from 'react';
import NetworkStats from './NetworkStats';
import { useWebRTC } from '../context/WebRTCContext';
import { useGame } from '../context/GameContext';
import { forceReleaseAllMediaDevices } from '@/utils/browser-utils';

// Define a type for our WebRTC ref
type WebRTCRef = {
  cleanup: (() => void) | null;
  stopLocalStream: (() => void) | null;
  isReady: boolean;
};

// Define a type for our Game ref
type GameRef = {
  disconnect: (() => void) | null;
};

export default function ClientWrapper() {
  // Get values from context
  const webRTC = useWebRTC();
  const game = useGame();
  
  // Create refs to track component state
  const unmountingRef = useRef(false);
  const cleanupDoneRef = useRef(false);
  
  // Use single useEffect with empty dependency array to avoid re-running
  useEffect(() => {
    console.log("ClientWrapper mounted - setting up cleanup handlers");
    
    // Mark as not unmounting at mount time
    unmountingRef.current = false;
    cleanupDoneRef.current = false;
    
    // Define emergency cleanup function
    const emergencyCleanup = () => {
      // Don't run cleanup more than once
      if (cleanupDoneRef.current) {
        console.log("Cleanup already performed, skipping");
        return;
      }
      
      // Mark cleanup as done to prevent double execution
      cleanupDoneRef.current = true;
      console.log("🚨 Emergency cleanup triggered");
      
      // Safe sequence that won't cause state updates during unmount
      try {
        // Use browser utility first for immediate camera release
        forceReleaseAllMediaDevices();
        
        // Use a timeout chain to separate operations and prevent React state conflicts
        setTimeout(() => {
          try {
            // Try to stop local stream if available
            if (typeof webRTC.stopLocalStream === 'function') {
              webRTC.stopLocalStream();
            }
            
            // Clean up socket connection next
            setTimeout(() => {
              try {
                if (typeof game.disconnect === 'function') {
                  game.disconnect();
                }
                
                // Finally try cleanup
                setTimeout(() => {
                  try {
                    if (typeof webRTC.cleanup === 'function') {
                      webRTC.cleanup();
                    }
                  } catch (e) {
                    console.warn("Error in final cleanup:", e);
                  }
                }, 100);
              } catch (e) {
                console.warn("Error disconnecting:", e);
              }
            }, 100);
          } catch (e) {
            console.warn("Error stopping stream:", e);
          }
        }, 100);
      } catch (e) {
        console.error("Critical error during cleanup:", e);
      }
    };

    // Set up window unload handler
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      console.log("Window is about to unload");
      unmountingRef.current = true;
      emergencyCleanup();
      
      // Standard browser confirmation dialog requirements
      event.preventDefault();
      event.returnValue = "";
      return "";
    };

    // Set up visibility change handler - more conservative approach
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        console.log("Page hidden - monitoring for extended absence");
        
        // Only release camera after extended inactivity
        const visibilityTimer = setTimeout(() => {
          if (document.visibilityState === "hidden") {
            console.log("Page hidden for extended period - releasing camera");
            forceReleaseAllMediaDevices();
          }
        }, 5000);
        
        // Clear timer if visibility returns
        const visibilityReturn = () => {
          if (document.visibilityState === "visible") {
            clearTimeout(visibilityTimer);
            document.removeEventListener("visibilitychange", visibilityReturn);
          }
        };
        
        document.addEventListener("visibilitychange", visibilityReturn);
      }
    };
    
    // Handle page hide for mobile browsers
    const handlePageHide = () => {
      console.log("Page is being hidden/frozen");
      unmountingRef.current = true;
      emergencyCleanup();
    };

    // Add event listeners
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    // Return cleanup function that runs when component unmounts
    return () => {
      console.log("Component unmounting - cleaning up");
      unmountingRef.current = true;
      
      // Remove all event listeners
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      
      // Run cleanup operations
      emergencyCleanup();
    };
  }, []); // Empty dependency array - only run once at mount

  return <NetworkStats />;
} 