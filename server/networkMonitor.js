class NetworkMonitor {
  constructor() {
    this.connections = new Map(); // socketId -> { latency, lastPing, health }
    this.healthThresholds = {
      good: 100,    // ms
      fair: 300,    // ms
      poor: 500     // ms
    };
    this.maxPingHistory = 5;
    this.pingInterval = 10000; // ms
    this.missedPingTolerance = 3;
    console.log('NetworkMonitor initialized');
  }

  // Start monitoring a connection
  startMonitoring(socket) {
    try {
      if (!socket || !socket.id) {
        console.error('Invalid socket provided to startMonitoring');
        return;
      }

      console.log(`Starting network monitoring for socket ${socket.id}`);
      this.connections.set(socket.id, {
        latency: 0,
        lastPing: Date.now(),
        health: 'good',
        pings: [],
        pingInterval: null,
        missedPings: 0
      });

      // Send initial ping with a small delay to ensure socket is ready
      setTimeout(() => {
        if (this.connections.has(socket.id)) {
          this.sendPing(socket);
        }
      }, 1000);
    } catch (error) {
      console.error('Error in startMonitoring:', error);
    }
  }

  // Stop monitoring a connection
  stopMonitoring(socketIdOrObject) {
    try {
      let socketId;
      
      // Handle both socket object and socket ID string
      if (typeof socketIdOrObject === 'object' && socketIdOrObject !== null) {
        if (!socketIdOrObject.id) {
          console.error('Invalid socket provided to stopMonitoring');
          return;
        }
        socketId = socketIdOrObject.id;
      } else if (typeof socketIdOrObject === 'string') {
        socketId = socketIdOrObject;
      } else {
        console.error('Invalid argument provided to stopMonitoring');
        return;
      }

      console.log(`Stopping network monitoring for socket ${socketId}`);
      const connection = this.connections.get(socketId);
      if (connection && connection.pingInterval) {
        clearInterval(connection.pingInterval);
      }
      this.connections.delete(socketId);
    } catch (error) {
      console.error('Error in stopMonitoring:', error);
    }
  }

  // Send ping to measure latency
  sendPing(socket) {
    try {
      if (!socket || !socket.id) {
        console.error('Invalid socket in sendPing');
        return;
      }
      
      // Check if socket is still being monitored
      if (!this.connections.has(socket.id)) {
        console.warn(`Socket ${socket.id} is no longer monitored`);
        return;
      }

      // Try to handle disconnections more gracefully
      if (!socket.connected) {
        const connection = this.connections.get(socket.id);
        if (connection) {
          connection.missedPings++;
          
          if (connection.missedPings > this.missedPingTolerance) {
            console.warn(`Socket ${socket.id} has missed ${connection.missedPings} pings, stopping monitoring`);
            this.stopMonitoring(socket.id);
            return;
          }
        }
        return;
      }

      const startTime = Date.now();
      
      // Using a try/catch for emit to handle any potential errors
      try {
        socket.emit('ping', { timestamp: startTime });
      } catch (err) {
        console.error(`Error sending ping to socket ${socket.id}:`, err.message);
        return;
      }
      
      // Schedule next ping
      const connection = this.connections.get(socket.id);
      if (connection) {
        if (connection.pingInterval) {
          clearInterval(connection.pingInterval);
        }
        connection.pingInterval = setInterval(() => this.sendPing(socket), this.pingInterval);
      }
    } catch (error) {
      console.error('Error in sendPing:', error);
    }
  }

  // Handle pong response
  handlePong(socket, data) {
    try {
      if (!socket || !socket.id || !data || typeof data.timestamp !== 'number') {
        console.error('Invalid pong data received');
        return;
      }

      const endTime = Date.now();
      const latency = endTime - data.timestamp;
      
      if (this.connections.has(socket.id)) {
        const connection = this.connections.get(socket.id);
        connection.latency = latency;
        connection.lastPing = endTime;
        
        // Update health status
        connection.health = this.calculateHealth(latency);
        
        // Keep last N pings for average calculation
        connection.pings.push(latency);
        if (connection.pings.length > this.maxPingHistory) {
          connection.pings.shift();
        }
        
        // Log network stats periodically
        if (connection.pings.length % 5 === 0) {
          console.log(`Network stats for ${socket.id}:`, {
            latency,
            health: connection.health,
            averageLatency: this.calculateAverageLatency(connection.pings)
          });
        }
        
        // Emit network stats to the client
        socket.emit('network-stats', {
          latency,
          health: connection.health,
          averageLatency: this.calculateAverageLatency(connection.pings)
        });
      } else {
        console.warn(`Received pong from unmonitored socket ${socket.id}`);
      }
    } catch (error) {
      console.error('Error in handlePong:', error);
    }
  }

  // Calculate connection health based on latency
  calculateHealth(latency) {
    if (latency <= this.healthThresholds.good) return 'good';
    if (latency <= this.healthThresholds.fair) return 'fair';
    return 'poor';
  }

  // Calculate average latency from recent pings
  calculateAverageLatency(pings) {
    if (pings.length === 0) return 0;
    return Math.round(pings.reduce((a, b) => a + b, 0) / pings.length);
  }

  // Get current network stats for a connection
  getStats(socketId) {
    const connection = this.connections.get(socketId);
    if (!connection) return null;
    
    return {
      latency: connection.latency,
      health: connection.health,
      averageLatency: this.calculateAverageLatency(connection.pings),
      lastPing: connection.lastPing
    };
  }

  // Get all connections' stats
  getAllStats() {
    const stats = {};
    for (const [socketId, connection] of this.connections.entries()) {
      stats[socketId] = {
        latency: connection.latency,
        health: connection.health,
        averageLatency: this.calculateAverageLatency(connection.pings)
      };
    }
    return stats;
  }
}

module.exports = NetworkMonitor; 