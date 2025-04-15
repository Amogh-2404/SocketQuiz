import SimplePeer from 'simple-peer';
import { Socket } from 'socket.io-client';

interface PeerConnection {
  peer: SimplePeer.Instance;
  peerId: string;
  stream?: MediaStream;
}

class WebRTCManager {
  private socket: Socket;
  private localStream: MediaStream | null = null;
  private peers: Map<string, PeerConnection> = new Map();
  private userId: string;
  private onPeerConnectCallbacks: ((peerId: string) => void)[] = [];
  private onPeerDisconnectCallbacks: ((peerId: string) => void)[] = [];
  private onStreamCallbacks: ((peerId: string, stream: MediaStream) => void)[] = [];
  private connectionAttempts: Map<string, number> = new Map();
  private maxRetries = 3;
  private useCompatibilityMode = false;

  constructor(socket: Socket, userId: string) {
    this.socket = socket;
    this.userId = userId;
    
    console.log('WebRTCManager initialized for user:', userId);
    this.setupSocketListeners();
  }
  
  private setupSocketListeners() {
    // Handle signaling for WebRTC
    this.socket.on('webrtc-signal', ({ from, signal }: { from: string, signal: SimplePeer.SignalData }) => {
      console.log(`Received WebRTC signal from ${from}`, typeof signal);
      
      const existingPeer = this.peers.get(from);
      
      if (existingPeer) {
        try {
          existingPeer.peer.signal(signal);
        } catch (err) {
          console.error(`Error processing signal from ${from}:`, err);
          // Recreate peer if signal processing fails
          this.removePeer(from);
          this.createPeer(from, false, signal);
        }
      } else {
        this.createPeer(from, false, signal);
      }
    });
    
    // Handle peer disconnection
    this.socket.on('peer-disconnected', (peerId: string) => {
      console.log(`Peer disconnected: ${peerId}`);
      this.removePeer(peerId);
    });
  }
  
  public async startLocalStream(video: boolean = true, audio: boolean = true): Promise<MediaStream> {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        throw new Error('Not in a browser environment');
      }
      
      // Compatibility fix for some browsers
      if (!navigator.mediaDevices) {
        console.log('MediaDevices API not supported, creating polyfill');
        // @ts-ignore
        navigator.mediaDevices = {};
      }

      // Polyfill getUserMedia
      if (!navigator.mediaDevices.getUserMedia) {
        console.log('getUserMedia not supported, using polyfill');
        navigator.mediaDevices.getUserMedia = async (constraints) => {
          // @ts-ignore - Old getUserMedia API
          const getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
          if (!getUserMedia) {
            throw new Error('getUserMedia is not supported in this browser');
          }
          
          return new Promise((resolve, reject) => {
            getUserMedia.call(navigator, constraints, resolve, reject);
          });
        };
      }
      
      // Stop any existing stream first
      this.stopLocalStream();
      
      console.log(`Requesting local media stream. Video: ${video}, Audio: ${audio}`);
      
      const constraints = {
        video: video ? {
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: "user"
        } : false,
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      };
      
      // Use a fallback approach with retries
      let stream: MediaStream | null = null;
      let error: Error | null = null;
      
      // First try the promise-based API with timeout
      try {
        console.log('Calling getUserMedia with constraints:', constraints);
        const streamPromise = navigator.mediaDevices.getUserMedia(constraints);
        const timeoutPromise = new Promise<MediaStream>((_resolve, reject) => {
          setTimeout(() => {
            console.error('getUserMedia call timed out after 30 seconds');
            reject(new Error('getUserMedia timeout - camera access taking too long'));
          }, 30000); // Increase timeout to 30 seconds from 15
        });
        
        stream = await Promise.race([streamPromise, timeoutPromise]);
        console.log('getUserMedia succeeded:', stream.id);
      } catch (err) {
        console.error('Error with promise-based getUserMedia:', err);
        error = err as Error;
      }
      
      // If we couldn't get a stream, throw the error
      if (!stream) {
        throw error || new Error('Unable to acquire media stream');
      }
      
      this.localStream = stream;
      
      console.log('Local stream acquired successfully', {
        streamId: this.localStream.id,
        videoTracks: this.localStream.getVideoTracks().length,
        audioTracks: this.localStream.getAudioTracks().length
      });
      
      // Ensure tracks are enabled by default
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach(track => {
          track.enabled = true;
        });
        this.localStream.getVideoTracks().forEach(track => {
          track.enabled = true;
        });
      }
      
      // Update existing peer connections with the new stream
      this.updatePeersWithNewStream();
      
      return this.localStream;
    } catch (error) {
      console.error('Failed to get local media stream:', error);
      
      // Try again with just audio if video fails
      if (video && !audio) {
        console.log('Retrying with audio only...');
        return this.startLocalStream(false, true);
      }
      
      throw error;
    }
  }
  
  private updatePeersWithNewStream() {
    if (!this.localStream) return;
    
    console.log(`Updating ${this.peers.size} peers with new stream`);
    
    // For each existing peer connection, remove old tracks and add new ones
    this.peers.forEach(({ peer, peerId }) => {
      try {
        // Recreate the peer with the new stream
        this.removePeer(peerId);
        this.createPeer(peerId, true);
      } catch (err) {
        console.warn('Could not update peer with new stream:', err);
      }
    });
  }
  
  public stopLocalStream() {
    if (this.localStream) {
      try {
        console.log('Stopping all media tracks');
        // Stop all tracks
        this.localStream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (err) {
            console.warn('Error stopping media track:', err);
          }
        });
        
        // Remove the stream from all peers
        this.peers.forEach(({ peer }) => {
          try {
            // Remove tracks from peer connections
            // Safely access methods that might not exist on the SimplePeer instance
            // @ts-ignore - SimplePeer typings are incomplete
            if (typeof peer.getSenders === 'function') {
              // @ts-ignore
              const senders = peer.getSenders();
              if (senders) {
                senders.forEach((sender: any) => {
                  // @ts-ignore
                  if (typeof peer.removeTrack === 'function') {
                    try {
                      // @ts-ignore
                      peer.removeTrack(sender);
                    } catch (err) {
                      console.warn('Error removing track from peer:', err);
                    }
                  }
                });
              }
            }
          } catch (err) {
            console.warn('Error removing tracks from peer:', err);
          }
        });
        
        console.log('Local stream stopped and removed from all peers');
        this.localStream = null;
      } catch (error) {
        console.error('Error stopping local stream:', error);
        this.localStream = null;
      }
    }
  }
  
  public connectToPeer(peerId: string) {
    console.log(`Connecting to peer: ${peerId}`);
    if (!this.peers.has(peerId)) {
      this.createPeer(peerId, true);
    } else {
      console.log(`Already connected to peer: ${peerId}`);
    }
  }
  
  private getCompatibilityOptions(initiator: boolean): SimplePeer.Options {
    // Use a more conservative set of options for browsers with WebRTC issues
    return {
      initiator,
      stream: this.localStream || undefined,
      trickle: false, // Disable trickle ICE for compatibility
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ],
        iceTransportPolicy: 'all',
      },
      offerOptions: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      },
      // Simplify SDP for compatibility
      sdpTransform: (sdp) => {
        // Remove complex codec parameters that can cause issues
        let modifiedSdp = sdp
          // Keep only the basic profile
          .replace(/profile-level-id=[^;\r\n]+/g, 'profile-level-id=42e01f')
          // Remove bandwidth constraints
          .replace(/b=AS:[0-9]+\r\n/g, '')
          // Remove complex fmtp lines
          .replace(/a=fmtp:(.*) apt=(.*)\r\n/g, '');
        
        return modifiedSdp;
      }
    };
  }
  
  public enableCompatibilityMode() {
    console.log('Enabling WebRTC compatibility mode');
    this.useCompatibilityMode = true;
    // Force reconnection of all existing peers
    this.updatePeersWithNewStream();
  }
  
  private createPeer(peerId: string, initiator: boolean, incomingSignal?: SimplePeer.SignalData): void {
    console.log(`Creating peer connection with ${peerId}. Initiator: ${initiator}`);
    
    // Track connection attempts for retry logic
    const attempts = this.connectionAttempts.get(peerId) || 0;
    
    if (attempts >= this.maxRetries) {
      console.warn(`Max retries (${this.maxRetries}) reached for peer ${peerId}. Giving up.`);
      return;
    }
    
    this.connectionAttempts.set(peerId, attempts + 1);
    
    let options: SimplePeer.Options;
    
    // Use compatibility mode if enabled
    if (this.useCompatibilityMode) {
      console.log(`Using compatibility mode for peer ${peerId}`);
      options = this.getCompatibilityOptions(initiator);
    } else {
      // Enhanced ICE servers list with multiple options for better connectivity
      const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ];
      
      // Standard options
      options = {
        initiator,
        stream: this.localStream || undefined,
        trickle: true,
        config: {
          iceServers,
          // Additional configuration options to help with connectivity
          iceTransportPolicy: 'all',
          bundlePolicy: 'max-bundle',
          rtcpMuxPolicy: 'require',
          iceCandidatePoolSize: 10
        },
        sdpTransform: (sdp) => {
          // Make sure video codecs are properly prioritized (VP8 first for wider compatibility)
          let modifiedSdp = sdp.replace(
            /a=fmtp:(.*) apt=(.*)\r\n/g, 
            (match, pt, apt) => apt === '96' ? match : ''
          );
          
          // Ensure video codec priorities
          if (modifiedSdp.includes('m=video')) {
            // Add bandwidth constraints
            modifiedSdp = modifiedSdp.replace(
              /m=video (.*)\r\n/g,
              (line) => line + 'b=AS:1000\r\n'
            );
            
            // Set low video resolution constraints to reduce bandwidth
            modifiedSdp = modifiedSdp.replace(
              /a=fmtp:(.*) profile-level-id=(.*)\r\n/g,
              (match, pt, profile) => `a=fmtp:${pt} profile-level-id=42e01f;max-fs=3600;max-mbps=108000\r\n`
            );
          }
          
          return modifiedSdp;
        }
      };
    }
    
    let peer: SimplePeer.Instance;
    
    try {
      peer = new SimplePeer(options);
    } catch (err) {
      console.error(`Error creating peer for ${peerId}:`, err);
      
      // If standard mode failed, try compatibility mode
      if (!this.useCompatibilityMode) {
        console.log('Switching to compatibility mode after error');
        this.useCompatibilityMode = true;
        return this.createPeer(peerId, initiator, incomingSignal);
      }
      
      return;
    }
    
    const peerConnection: PeerConnection = {
      peer,
      peerId
    };
    
    peer.on('signal', signal => {
      console.log(`Sending signal to ${peerId}`, typeof signal);
      this.socket.emit('webrtc-signal', {
        to: peerId,
        from: this.userId,
        signal
      });
    });
    
    // Debug events for troubleshooting
    if ('on' in peer && typeof peer.on === 'function') {
      // Access peer connection with type assertion
      const peerConnection = (peer as any)._pc as RTCPeerConnection;
      if (peerConnection) {
        // Track ICE connection state changes
        peerConnection.addEventListener('iceconnectionstatechange', () => {
          console.log(`ICE connection state for ${peerId}:`, peerConnection.iceConnectionState);
          
          // Handle failed ICE connections
          if (peerConnection.iceConnectionState === 'failed') {
            console.warn(`ICE connection failed for ${peerId}, attempting recovery`);
            try {
              // Try to recover by restarting ICE
              peerConnection.restartIce();
            } catch (e) {
              console.error('Error restarting ICE:', e);
            }
          }
        });
        
        // Track ICE gathering state changes
        peerConnection.addEventListener('icegatheringstatechange', () => {
          console.log(`ICE gathering state for ${peerId}:`, peerConnection.iceGatheringState);
        });
        
        // Track signaling state changes
        peerConnection.addEventListener('signalingstatechange', () => {
          console.log(`Signaling state for ${peerId}:`, peerConnection.signalingState);
        });
        
        // Log ICE candidates
        peerConnection.addEventListener('icecandidate', (event: RTCPeerConnectionIceEvent) => {
          if (event.candidate) {
            console.log(`ICE candidate for ${peerId}:`, event.candidate.candidate);
          }
        });
      }
    }
    
    peer.on('stream', stream => {
      console.log(`Received stream from ${peerId}`, {
        streamId: stream.id, 
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      });
      peerConnection.stream = stream;
      this.onStreamCallbacks.forEach(callback => callback(peerId, stream));
      
      // Reset connection attempts on successful stream
      this.connectionAttempts.delete(peerId);
    });
    
    peer.on('connect', () => {
      console.log('Connected to peer:', peerId);
      this.onPeerConnectCallbacks.forEach(callback => callback(peerId));
      
      // Reset connection attempts on successful connection
      this.connectionAttempts.delete(peerId);
    });
    
    peer.on('close', () => {
      console.log(`Peer connection closed: ${peerId}`);
      this.removePeer(peerId);
    });
    
    peer.on('error', err => {
      console.error(`Peer connection error with ${peerId}:`, err);
      
      // Only retry if we haven't exceeded the max retry count
      if ((this.connectionAttempts.get(peerId) || 0) < this.maxRetries) {
        console.log(`Retrying connection to ${peerId} after error...`);
        setTimeout(() => {
          this.removePeer(peerId);
          this.createPeer(peerId, initiator);
        }, 1000);
      } else {
        this.removePeer(peerId);
      }
    });
    
    if (incomingSignal) {
      try {
        peer.signal(incomingSignal);
      } catch (err) {
        console.error(`Error processing incoming signal from ${peerId}:`, err);
        peer.destroy();
        return;
      }
    }
    
    this.peers.set(peerId, peerConnection);
  }
  
  private removePeer(peerId: string) {
    const peer = this.peers.get(peerId);
    if (peer) {
      try {
        peer.peer.destroy();
      } catch (err) {
        console.warn(`Error destroying peer ${peerId}:`, err);
      }
      this.peers.delete(peerId);
      this.onPeerDisconnectCallbacks.forEach(callback => callback(peerId));
      console.log(`Removed peer: ${peerId}`);
    }
  }
  
  public getStream(peerId: string): MediaStream | undefined {
    return this.peers.get(peerId)?.stream;
  }
  
  public onPeerConnect(callback: (peerId: string) => void) {
    this.onPeerConnectCallbacks.push(callback);
  }
  
  public onPeerDisconnect(callback: (peerId: string) => void) {
    this.onPeerDisconnectCallbacks.push(callback);
  }
  
  public onStream(callback: (peerId: string, stream: MediaStream) => void) {
    this.onStreamCallbacks.push(callback);
  }
  
  public getConnectedPeers(): string[] {
    return Array.from(this.peers.keys());
  }
  
  public cleanup() {
    // Stop local media stream first
    try {
      this.stopLocalStream();
    } catch (err) {
      console.warn('Error stopping local stream during cleanup:', err);
      this.localStream = null;
    }
    
    // Destroy all peer connections
    try {
      const peersToDestroy = Array.from(this.peers.values());
      peersToDestroy.forEach(({ peer }) => {
        try {
          peer.destroy();
        } catch (err) {
          console.warn('Error destroying peer:', err);
        }
      });
      
      this.peers.clear();
    } catch (err) {
      console.warn('Error cleaning up peer connections:', err);
      this.peers = new Map();
    }
    
    this.connectionAttempts.clear();
    
    // Remove socket listeners if socket is still available
    if (this.socket) {
      try {
        this.socket.off('webrtc-signal');
        this.socket.off('peer-disconnected');
      } catch (err) {
        console.warn('Error removing socket listeners:', err);
      }
    }
    
    // Clear callbacks
    this.onPeerConnectCallbacks = [];
    this.onPeerDisconnectCallbacks = [];
    this.onStreamCallbacks = [];
    
    console.log('WebRTC manager cleanup complete');
  }
}

export default WebRTCManager; 