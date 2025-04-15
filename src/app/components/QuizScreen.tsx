'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { useWebRTC } from '../context/WebRTCContext';
import Timer from './Timer';
import VideoGrid from './VideoGrid';
import ErrorNotification from './ErrorNotification';

const QuizScreen: React.FC = () => {
  const { gameState, player, submitAnswer, disconnect } = useGame();
  const { 
    startLocalStream, 
    stopLocalStream, 
    streamError, 
    restartStreams, 
    browserSupport,
    isWebRTCSupported,
    enableCompatibilityMode,
    localStream,
    streamStarting
  } = useWebRTC();

  // Always up-to-date ref for localStream
  const localStreamRef = useRef(localStream);
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [streamErrorShown, setStreamErrorShown] = useState(false);
  const [mediaErrorDetails, setMediaErrorDetails] = useState<string | null>(null);
  const [webrtcInitFailed, setWebrtcInitFailed] = useState(false);

  const currentQuestion = gameState.currentQuestion;
  const questionNumber = gameState.questionNumber;
  const totalQuestions = gameState.totalQuestions;
  const timeLimit = gameState.timeLimit;

  // Reset selected answer and timer when question or backend timer changes
  useEffect(() => {
    setSelectedAnswer(null);
    let effectiveTimeLimit = (timeLimit && timeLimit > 0) ? timeLimit : 10;
    if (!currentQuestion) {
      effectiveTimeLimit = 0;
    }
    if (effectiveTimeLimit > 0 && effectiveTimeLimit < 1) {
      effectiveTimeLimit = 1;
    }
    // Prefer backend-provided timeRemaining if available and valid
    let backendTime = gameState.timeRemaining && gameState.timeRemaining > 0 ? gameState.timeRemaining : effectiveTimeLimit * 1000;
    // Always reset timer on new question or backend timer update
    setTimeRemaining(backendTime);
    console.log('[QuizScreen] Timer reset:', { questionNumber, timeLimit, effectiveTimeLimit, backendTime });
  }, [questionNumber, timeLimit, currentQuestion, gameState.timeRemaining]);

  // Add a retry mechanism for failed media access
  const retryMediaAccess = useCallback(async () => {
    try {
      // First stop any existing stream
      stopLocalStream();
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Try with reduced quality first
      await startLocalStream(true, true);
      setMediaErrorDetails(null);
    } catch (err: any) {
      console.error('Retry media access failed:', err);
      
      // Try with audio only as last resort
      try {
        await startLocalStream(false, true);
        setMediaErrorDetails('Video access failed. Using audio only.');
      } catch (audioErr) {
        setMediaErrorDetails(`Media access failed: ${err.message}`);
      }
    }
  }, [startLocalStream, stopLocalStream]);

  // Handle video streams based on game state
  useEffect(() => {
    let mounted = true;
    
    // If WebRTC is not supported, don't attempt to get stream
    if (!isWebRTCSupported) {
      setMediaErrorDetails(`Your browser doesn't fully support WebRTC: ${browserSupport.reason}`);
      return;
    }
    
    // Only initialize stream once - add a check to prevent repeated initialization
    const initStream = async () => {
      try {
        await startLocalStream(true, true);
      } catch (err: any) {
        console.error('Failed to start local stream:', err);
        
        if (err.message === 'WebRTC manager not initialized' && mounted) {
          setWebrtcInitFailed(true);
          // Don't retry immediately, set a longer timeout
          setTimeout(() => {
            if (mounted) {
              initStream();
            }
          }, 3000);
          return;
        }
        
        // Update error details with more specific information
        if (err.name === 'NotAllowedError') {
          setMediaErrorDetails('Camera/microphone access denied. Please check your browser permissions.');
        } else if (err.name === 'NotFoundError') {
          setMediaErrorDetails('Camera/microphone not found. Please check your device connections.');
        } else if (err.name === 'NotReadableError' || err.name === 'AbortError') {
          setMediaErrorDetails('Could not access your camera/microphone. It may be in use by another application.');
        } else {
          setMediaErrorDetails(`Media error: ${err.message}`);
        }
        
        // If permission was denied, try audio only - but only once
        if (mounted && err.name === 'NotAllowedError') {
          try {
            await startLocalStream(false, true);
          } catch (e) {
            setMediaErrorDetails('Both camera and microphone access was denied. Quiz can continue without video.');
          }
        }
      }
    };
    
    // Start initialization - only call once
    initStream();
    
    return () => {
      mounted = false;
    };
  }, [startLocalStream, isWebRTCSupported, browserSupport.reason]); // Only run this effect once when component mounts
  
  // Show error notification if stream fails
  useEffect(() => {
    const errorToShow = streamError || mediaErrorDetails;
    
    if (errorToShow && !streamErrorShown) {
      setStreamErrorShown(true);
      
      // Auto-hide error after 5 seconds
      const timer = setTimeout(() => {
        setStreamErrorShown(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [streamError, mediaErrorDetails, streamErrorShown]);
  
  // Removed stopLocalStream from unmount cleanup to prevent unnecessary video disconnects.
  // Video will now only be stopped when the user actually leaves the session (handleQuit).
  // useEffect(() => {
  //   return () => {
  //     stopLocalStream();
  //   };
  // }, [stopLocalStream]);
  
  // Use a flag to prevent multiple rapid restart attempts
  const restartPending = useRef(false);

  // Add a button to restart video when there's an error
  const handleRestartVideo = () => {
    if (restartPending.current) return;
    restartPending.current = true;
    try {
      console.log('[RestartVideo] Button clicked. localStreamRef:', localStreamRef.current);
      setTimeout(async () => {
        try {
          // Check if localStream is present but inactive (tracks ended or muted)
          let needsFullRestart = false;
          if (localStreamRef.current) {
            const videoTracks = localStreamRef.current.getVideoTracks();
            needsFullRestart = videoTracks.length === 0 || videoTracks.some(track => track.readyState !== 'live' || track.muted);
            console.log('[RestartVideo] videoTracks:', videoTracks, 'needsFullRestart:', needsFullRestart);
          } else {
            needsFullRestart = true;
            console.log('[RestartVideo] No localStream, forcing reacquire.');
          }
          // Always force reacquire to ensure placeholder is fixed
          console.log('[RestartVideo] Forcibly reacquiring camera/mic...');
          console.log('[RestartVideo] Calling startLocalStream(true, true)');
          try {
            await startLocalStream(true, true);
            console.log('[RestartVideo] startLocalStream success');
          } catch (err) {
            console.error('[RestartVideo] startLocalStream failed:', err);
          }
          restartPending.current = false;
        } catch (err) {
          console.error('[RestartVideo] Restart failed:', err);
          // If restart fails, try the more aggressive approach
          try {
            console.log('[RestartVideo] Trying retryMediaAccess...');
            await retryMediaAccess();
            console.log('[RestartVideo] retryMediaAccess success');
          } catch (e) {
            console.error('[RestartVideo] retryMediaAccess failed:', e);
          } finally {
            restartPending.current = false;
          }
        }
      }, 1000);
    } catch (err) {
      console.error('[RestartVideo] Outer catch:', err);
      restartPending.current = false;
    }
  };


  // Auto-recover video stream on tab visibility change
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          if (!isWebRTCSupported) return;
          // Only restart if localStream is missing (using ref)
          if (!localStreamRef.current) {
            console.log('[QuizScreen] Tab became visible, localStream missing, attempting restartStreams');
            await restartStreams();
          } else {
            console.log('[QuizScreen] Tab became visible, localStream present, no restart needed');
          }
        } catch (err) {
          // Fallback to more aggressive recovery if needed
          try {
            console.warn('[QuizScreen] restartStreams failed, attempting retryMediaAccess');
            await retryMediaAccess();
          } catch (e) {
            // Optionally set error state here
            console.error('[QuizScreen] Both restartStreams and retryMediaAccess failed', e);
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Only run on mount/unmount

  // Function to enable compatibility mode
  const handleEnableCompatibilityMode = () => {
    enableCompatibilityMode();
    // Show feedback
    setStreamErrorShown(true);
    setMediaErrorDetails('Compatibility mode enabled. Trying to restart video...');
    setTimeout(() => setStreamErrorShown(false), 3000);
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (selectedAnswer === null) {
      setSelectedAnswer(answerIndex);
      submitAnswer(answerIndex);
    }
  };

  const handleQuit = () => {
    if (confirm("Are you sure you want to quit the quiz? You'll be removed from the session.")) {
      try {
        // First ensure we stop the video stream
        stopLocalStream();
        
        // Add a small delay to ensure cleanup completes
        setTimeout(() => {
          // Then disconnect from the session
          disconnect();
        }, 100);
      } catch (error) {
        console.error("Error during quit:", error);
        // Attempt to disconnect even if there was an error with the stream
        disconnect();
      }
    }
  };

  // Add a function to handle manual WebRTC restart
  const handleManualWebRTCRestart = () => {
    setWebrtcInitFailed(false);
    // Delay slightly to ensure any state updates complete
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  // Update timer with server time
  useEffect(() => {
    // Only sync timer if the server value is reasonable (> 500ms)
    // Only update if the server time is LESS than the client (prevent resetting to higher value)
    if (
      gameState.timeRemaining > 500 &&
      (timeRemaining - gameState.timeRemaining) > 1000 &&
      gameState.timeRemaining < timeRemaining
    ) {
      console.log(`Updating time from ${timeRemaining}ms to ${gameState.timeRemaining}ms (server sync)`);
      setTimeRemaining(gameState.timeRemaining);
    }
  }, [gameState.timeRemaining, timeRemaining]);
  
  // Timer callback to sync with the server
  const handleTimerTick = (remainingTime: number) => {
    // Check if timer needs syncing with server
    if (gameState.timeRemaining > 0) {
      // Allow for some drift (1000ms) before resynchronizing to avoid jitter
      if (Math.abs(gameState.timeRemaining - remainingTime) > 1000) {
        setTimeRemaining(gameState.timeRemaining);
      }
    }
  };

  if (!currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-2xl text-white"
        >
          Loading question...
        </motion.div>
      </div>
    );
  }

  const isAnswerRevealed = currentQuestion.correctOption !== undefined;

  const getStatusClass = (index: number) => {
    if (!isAnswerRevealed) {
      return selectedAnswer === index ? 'bg-blue-600 text-white' : 'bg-white hover:bg-blue-100';
    }
    
    if (index === currentQuestion.correctOption) {
      return 'bg-green-600 text-white';
    }
    
    if (selectedAnswer === index && index !== currentQuestion.correctOption) {
      return 'bg-red-600 text-white';
    }
    
    return 'bg-white text-gray-700 opacity-75';
  };

  return (
    <main className="flex flex-col md:flex-row items-center min-h-screen w-full max-w-7xl mx-auto p-4 relative">
      {/* Stream error notification */}
      {(streamError || mediaErrorDetails) && streamErrorShown && (
        <div className="fixed top-4 right-4 bg-red-500 text-white p-3 rounded-md shadow-lg z-50 flex items-center">
          <span>Error: {streamError || mediaErrorDetails}</span>
          <button 
            onClick={handleRestartVideo}
            className="ml-3 bg-white text-red-500 px-2 py-1 rounded-md text-sm font-bold hover:bg-red-100"
          >
            Restart
          </button>
        </div>
      )}
      
      {/* Stream controls - fixed in the top right corner */}
      <div className="absolute top-4 right-4 z-40 flex space-x-2">
        <button
          onClick={handleRestartVideo}
          className="bg-blue-600 text-white p-2 rounded-full shadow-md hover:bg-blue-700"
          title="Restart video stream"
          disabled={streamStarting}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
          </svg>
        </button>
        
        <button
          onClick={handleQuit}
          className="bg-red-600 text-white p-2 rounded-full shadow-md hover:bg-red-700"
          title="Quit the quiz"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18"></path>
            <path d="M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      {/* Left side - Question and answers */}
      <div className="w-full md:w-3/5 bg-black bg-opacity-80 p-6 rounded-xl shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <div className="text-lg font-semibold text-white">
            Question {questionNumber} of {totalQuestions}
          </div>
          
          {/* Timer debug log moved above JSX to avoid ReactNode error */}
          {/* Timer debug: */}
          {/* See console for '[QuizScreen] Rendering Timer:' */}
          <Timer
            key={currentQuestion?.id} // Recreate timer when question changes
            remaining={Math.max(timeRemaining, currentQuestion ? 1000 : 0)}
            size="large"
            onTick={handleTimerTick}
            onExpire={() => {
              // Automatically submit the current answer when time expires
              if (selectedAnswer === null) {
                // Submit a random answer or no answer at all
                submitAnswer(-1); // -1 indicates no answer selected
              }
            }}
          />
          {(() => console.log('[QuizScreen] Rendering Timer:', { key: currentQuestion?.id, remaining: timeRemaining, timeLimit, questionNumber }))()}
          {(() => console.log('[QuizScreen] Rendering Timer:', { key: currentQuestion?.id, remaining: timeRemaining }))()}
        </div>
        
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          key={`question-${questionNumber}`}
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-2 text-white drop-shadow-lg" style={{textShadow: '0 2px 8px #000, 0 1px 0 #222'}}> 
            {currentQuestion.question}
          </h2>
        </motion.div>
        
        <motion.div 
          className="grid gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          key={`answers-${questionNumber}`}
        >
          {currentQuestion.options.map((option, index) => (
            <motion.button
              key={index}
              onClick={() => handleAnswerSelect(index)}
              disabled={selectedAnswer !== null}
              className={`p-4 rounded-lg shadow-md text-left transition-all ${getStatusClass(index)}`}
              whileHover={selectedAnswer === null ? { scale: 1.02 } : {}}
              whileTap={selectedAnswer === null ? { scale: 0.98 } : {}}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + index * 0.1 }}
            >
              <div className="flex items-center">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-opacity-30 mr-3 text-current font-semibold">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="text-lg text-white drop-shadow" style={{textShadow: '0 2px 8px #000, 0 1px 0 #222'}}>{option}</span>
              </div>
            </motion.button>
          ))}
        </motion.div>
      </div>
      
      {/* Right side - Video conference */}
      <div className="w-full md:w-2/5 mt-6 md:mt-0 md:ml-6">
        <div className="bg-black bg-opacity-20 backdrop-blur-md p-4 rounded-xl shadow-lg">
          <h3 className="text-lg font-medium text-white mb-3 text-center">Contestants</h3>
          
          <VideoGrid 
            players={gameState.players.filter(p => p.id !== player?.id)}
            highlightedPlayerId={player?.id}
            showLocalVideo={true}
            size="medium"
          />
        </div>
      </div>
    </main>
  );
};

export default QuizScreen; 