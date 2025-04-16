"use client";
import React, { useEffect, useRef, useState } from "react";
import { useGame } from "../context/GameContext";

// Use simple-peer for easier WebRTC management
// If not available, fallback to raw RTCPeerConnection
let SimplePeer: any = null;
try {
  SimplePeer = require("simple-peer");
} catch (e) {
  // Will fallback to raw WebRTC
}

interface PeerStream {
  peerId: string;
  stream: MediaStream;
}

import { MicrophoneIcon, VideoCameraIcon, VideoCameraSlashIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';

const VideoGrid: React.FC = () => {
  const { socket, gameState, player } = useGame();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peerStreams, setPeerStreams] = useState<PeerStream[]>([]);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const peersRef = useRef<{ [peerId: string]: RTCPeerConnection | any }>({});
  const streamsRef = useRef<{ [peerId: string]: MediaStream }>({});
  const sessionId = gameState.sessionId;
  const myId = player?.id;

  // Helper: Clean up all peer connections and streams
  const cleanup = () => {
    Object.values(peersRef.current).forEach((peer) => {
      if (peer.destroy) peer.destroy();
      if (peer.close) peer.close();
    });
    Object.values(streamsRef.current).forEach((stream) => {
      stream.getTracks().forEach((t) => t.stop());
    });
    peersRef.current = {};
    streamsRef.current = {};
    setPeerStreams([]);
  };

  // Get user media
  useEffect(() => {
    let ignore = false;
    navigator.mediaDevices
      .getUserMedia({ video: cameraOn, audio: true })
      .then((stream) => {
        if (ignore) return;
        setLocalStream(stream);
        if (muted) {
          stream.getAudioTracks().forEach((t) => (t.enabled = false));
        }
      })
      .catch(() => {
        setLocalStream(null);
      });
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line
  }, [cameraOn, muted]);

  // Handle peer connections
  useEffect(() => {
    if (!socket || !localStream || !myId || !gameState?.players) return;

    // Join video mesh
    socket.emit("video-peer-join", { sessionId: gameState.sessionId, peerId: myId });

    // Listen for peer join
    socket.on("video-peer-join", ({ peerId }) => {
      if (peerId === myId) return;
      createPeer(peerId, true);
    });

    // Listen for peer leave
    socket.on("video-peer-leave", ({ peerId }) => {
      removePeer(peerId);
    });

    // Listen for offers/answers/candidates
    socket.on("video-offer", async ({ from, sdp }) => {
      await createPeer(from, false, sdp);
    });
    socket.on("video-answer", ({ from, sdp }) => {
      const peer = peersRef.current[from];
      if (peer) peer.signal(sdp);
    });
    socket.on("video-ice-candidate", ({ from, candidate }) => {
      const peer = peersRef.current[from];
      if (peer && peer.signal) peer.signal(candidate);
    });

    // Clean up on unmount
    return () => {
      cleanup();
      socket.emit("video-peer-leave", { sessionId: gameState.sessionId, peerId: myId });
      socket.off("video-peer-join");
      socket.off("video-peer-leave");
      socket.off("video-offer");
      socket.off("video-answer");
      socket.off("video-ice-candidate");
    };
    // eslint-disable-next-line
  }, [socket, localStream, myId, gameState?.sessionId]);

  // Create peer connection
  const createPeer = (peerId: string, initiator: boolean, offerSdp?: any) => {
    if (peersRef.current[peerId]) return; // Already connected
    let peer;
    if (SimplePeer) {
      peer = new SimplePeer({
        initiator,
        trickle: true,
        stream: localStream,
      });
      peer.on("signal", (data: any) => {
        if (data.type === "offer") {
          socket?.emit("video-offer", { to: peerId, from: myId, sdp: data });
        } else if (data.type === "answer") {
          socket?.emit("video-answer", { to: peerId, from: myId, sdp: data });
        } else if (data.candidate) {
          socket?.emit("video-ice-candidate", { to: peerId, from: myId, candidate: data });
        }
      });
      peer.on("stream", (stream: MediaStream) => {
        streamsRef.current[peerId] = stream;
        setPeerStreams((prev) => [...prev.filter((ps) => ps.peerId !== peerId), { peerId, stream }]);
      });
      peer.on("close", () => removePeer(peerId));
      peer.on("error", () => removePeer(peerId));
      if (!initiator && offerSdp) {
        peer.signal(offerSdp);
      }
    } else {
      // TODO: fallback to raw RTCPeerConnection if needed
    }
    peersRef.current[peerId] = peer;
  };

  // Remove peer
  const removePeer = (peerId: string) => {
    const peer = peersRef.current[peerId];
    if (peer) {
      if (peer.destroy) peer.destroy();
      if (peer.close) peer.close();
      delete peersRef.current[peerId];
    }
    if (streamsRef.current[peerId]) {
      streamsRef.current[peerId].getTracks().forEach((t) => t.stop());
      delete streamsRef.current[peerId];
    }
    setPeerStreams((prev) => prev.filter((ps) => ps.peerId !== peerId));
  };

  // Controls
  const toggleMute = () => {
    setMuted((m) => {
      if (localStream) {
        localStream.getAudioTracks().forEach((t) => (t.enabled = m));
      }
      return !m;
    });
  };
  const toggleCamera = () => setCameraOn((c) => !c);

  // Helper to get player name by peerId
  const getPlayerName = (peerId: string) => {
    if (peerId === myId) return player?.name || 'You';
    const p = gameState.players?.find((p) => p.id === peerId);
    return p?.name || 'Peer';
  };

  // Active speaker detection (local only)
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    if (!localStream) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = ctx.createAnalyser();
    const mic = ctx.createMediaStreamSource(localStream);
    mic.connect(analyser);
    analyser.fftSize = 512;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let raf: number;
    const checkSpeaking = () => {
      analyser.getByteFrequencyData(dataArray);
      const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setSpeaking(volume > 20);
      raf = requestAnimationFrame(checkSpeaking);
    };
    checkSpeaking();
    return () => {
      cancelAnimationFrame(raf);
      analyser.disconnect();
      mic.disconnect();
      ctx.close();
    };
  }, [localStream]);

  // Glassmorphic floating panel
  return (
    <div
      className={`fixed bottom-0 left-0 m-6 z-50 transition-all duration-300 ${collapsed ? 'h-16 w-48' : 'min-w-[320px] min-h-[180px] max-w-[480px] max-h-[320px]'} flex flex-col items-start`}
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className={`relative w-full ${collapsed ? 'h-16' : 'h-auto'} bg-white/10 dark:bg-gray-900/60 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 flex flex-col items-center transition-all duration-300`}
        style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.25)' }}
      >
        <button
          className="absolute top-2 right-2 bg-black/30 hover:bg-black/60 rounded-full p-1 transition"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? (
            <ChevronUpIcon className="w-5 h-5 text-white" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-white" />
          )}
        </button>
        {!collapsed && (
          <div className="flex flex-wrap justify-center items-center gap-3 p-3 pt-8 w-full transition-all">
            {/* Local video */}
            {localStream && (
              <div className="relative group">
                <video
                  ref={(el) => {
                    if (el && localStream) {
                      el.srcObject = localStream;
                      el.muted = true;
                      el.autoplay = true;
                      el.playsInline = true;
                    }
                  }}
                  className={`rounded-xl shadow-lg border-4 transition-all duration-200 ${speaking ? 'border-pink-400 shadow-pink-300/40' : 'border-white/20'} bg-black w-32 h-24 object-cover`}
                  style={{ minWidth: 128, minHeight: 96, background: '#222' }}
                />
                <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-gradient-to-r from-purple-600 to-pink-500 text-xs text-white rounded-full shadow font-semibold">
                  {getPlayerName(myId!)}
                </div>
              </div>
            )}
            {/* Remote videos */}
            {peerStreams.map(({ peerId, stream }) => (
              <div key={peerId} className="relative group">
                <video
                  ref={(el) => {
                    if (el && stream) {
                      el.srcObject = stream;
                      el.autoplay = true;
                      el.playsInline = true;
                    }
                  }}
                  className="rounded-xl shadow-lg border-4 border-white/20 bg-black w-32 h-24 object-cover"
                  style={{ minWidth: 128, minHeight: 96, background: '#222' }}
                />
                <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-xs text-white rounded-full shadow font-semibold">
                  {getPlayerName(peerId)}
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Controls */}
        {!collapsed && (
          <div className="flex items-center justify-center gap-4 p-3 pb-2 w-full">
            <button
              className={`rounded-full p-2 bg-white/20 hover:bg-pink-500/90 transition shadow-lg ${muted ? 'bg-red-500/80' : ''}`}
              onClick={toggleMute}
              title={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? (
                <MicrophoneIcon className="w-6 h-6 text-red-400 opacity-70" />
              ) : (
                <MicrophoneIcon className="w-6 h-6 text-white" />
              )}
            </button>
            <button
              className={`rounded-full p-2 bg-white/20 hover:bg-blue-500/90 transition shadow-lg ${!cameraOn ? 'bg-gray-500/80' : ''}`}
              onClick={toggleCamera}
              title={cameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
            >
              {cameraOn ? (
                <VideoCameraIcon className="w-6 h-6 text-white" />
              ) : (
                <VideoCameraSlashIcon className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoGrid;
