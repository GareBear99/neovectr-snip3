/**
 * NEO-VECTR ∞SNIP3 - Network Layer
 * Production-grade multiplayer with host migration and custom music streaming
 * 
 * Architecture:
 * - Authoritative host model (one player runs all game logic)
 * - Clients send inputs only (~20 bytes @ 60 Hz)
 * - Host broadcasts state updates (~200 bytes @ 20 Hz)
 * - Optional music streaming (64-320 kbps Opus)
 * 
 * Bandwidth:
 * - Game only: ~5 KB/s download, ~1 KB/s upload per client
 * - With music: ~45 KB/s download, ~1 KB/s upload per client
 * - Host: ~42 KB/s upload (game) + 320 KB/s (music optional)
 */

// =============================================================================
// NETWORK STATE
// =============================================================================

/**
 * Network configuration
 * These values determine connection quality and bandwidth usage
 */
const NET_CONFIG = {
  // Input packets sent from clients to host
  INPUT_RATE_HZ: 60,              // Send inputs 60 times per second
  INPUT_PACKET_SIZE: 24,          // ~24 bytes per input packet
  
  // State updates broadcast from host to clients
  STATE_RATE_HZ: 20,              // Broadcast state 20 times per second (50ms)
  STATE_INTERPOLATION_MS: 100,    // Clients render 100ms in the past for smooth interpolation
  
  // Connection management
  HEARTBEAT_INTERVAL_MS: 1000,    // Host sends heartbeat every second
  HEARTBEAT_TIMEOUT_MS: 3000,     // Consider host dead after 3 seconds of silence
  PING_INTERVAL_MS: 2000,         // Measure ping every 2 seconds
  
  // Music streaming
  MUSIC_FRAME_SIZE: 960,          // 20ms @ 48kHz (Opus standard)
  MUSIC_BUFFER_MS: 500,           // Buffer 500ms before playing
  
  // WebRTC configuration
  ICE_SERVERS: [
    { urls: 'stun:stun.l.google.com:19302' },        // Google STUN
    { urls: 'stun:stun1.l.google.com:19302' },
    // Add TURN servers here for NAT traversal if needed
  ],
};

/**
 * Network state management
 * Tracks connection status, peer list, and role (host vs client)
 */
const NetworkState = {
  // Connection info
  isOnline: false,              // Are we in an online multiplayer session?
  isHost: false,                // Am I the authoritative host?
  myPlayerId: 0,                // My player index (0-7)
  hostPlayerId: 0,              // Current host's player index
  
  // Peer connections (WebRTC)
  peers: new Map(),             // Map<playerId, RTCPeerConnection>
  dataChannels: new Map(),      // Map<playerId, RTCDataChannel>
  
  // Connection stats
  pings: new Map(),             // Map<playerId, number> - Round-trip times in ms
  packetLoss: new Map(),        // Map<playerId, number> - Packet loss percentage
  lastHeartbeat: 0,             // Timestamp of last heartbeat from host
  
  // Signaling (for WebRTC setup)
  signalingServer: null,        // WebSocket connection for signaling
  roomCode: '',                 // 6-digit room code for matchmaking
  
  // Sequence numbers (for packet ordering)
  inputSequence: 0,             // Outgoing input packet counter
  stateSequence: 0,             // Incoming state packet counter (for validation)
  
  // Callbacks
  onPeerConnected: null,        // Called when a new peer joins
  onPeerDisconnected: null,     // Called when a peer leaves
  onHostMigration: null,        // Called when host changes
  onMessage: null,              // Called for non-input/state messages
};

/**
 * Input buffer system
 * Host stores recent inputs from each client for processing
 * Handles out-of-order packets and latency compensation
 */
const clientInputBuffers = new Map(); // Map<playerId, Array<InputPacket>>
const MAX_INPUT_BUFFER_SIZE = 120;    // Store last 2 seconds @ 60 Hz
const MAX_INPUT_AGE_MS = 500;         // Discard inputs older than 500ms

/**
 * State buffer system
 * Clients store recent states for interpolation
 * Allows smooth rendering despite network jitter
 */
const stateBuffer = [];               // Array<GameState>
const MAX_STATE_BUFFER_SIZE = 10;     // Store last 500ms @ 20 Hz

/**
 * Pending inputs (client-side prediction)
 * Client stores inputs that haven't been confirmed by server yet
 * Used for reconciliation when server state arrives
 */
const pendingInputs = [];
const MAX_PENDING_INPUTS = 120;       // Store last 2 seconds

/**
 * Game event queue
 * Events like "laser fired", "player eliminated" that trigger sounds/VFX
 * Populated by host, consumed by clients
 */
const gameEvents = [];

// =============================================================================
// NETWORK INITIALIZATION
// =============================================================================

/**
 * Initialize network subsystem
 * Call this once at game start, before any networking
 * 
 * @param {Object} callbacks - Event handlers
 * @param {Function} callbacks.onPeerConnected - (playerId) => void
 * @param {Function} callbacks.onPeerDisconnected - (playerId) => void
 * @param {Function} callbacks.onHostMigration - (newHostId) => void
 * @param {Function} callbacks.onMessage - (message) => void
 */
function initNetwork(callbacks = {}) {
  NetworkState.onPeerConnected = callbacks.onPeerConnected || (() => {});
  NetworkState.onPeerDisconnected = callbacks.onPeerDisconnected || (() => {});
  NetworkState.onHostMigration = callbacks.onHostMigration || (() => {});
  NetworkState.onMessage = callbacks.onMessage || (() => {});
  
  console.log('[NETWORK] Initialized');
}

/**
 * Create a new online lobby (become host)
 * Generates a 6-digit room code and starts listening for connections
 * 
 * @returns {Promise<string>} Room code for others to join
 */
async function createLobby() {
  NetworkState.isOnline = true;
  NetworkState.isHost = true;
  NetworkState.myPlayerId = 0;  // Host is always player 0
  NetworkState.hostPlayerId = 0;
  
  // Generate room code (6 digits)
  NetworkState.roomCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Connect to signaling server (for WebRTC negotiation)
  await connectToSignalingServer();
  
  // Register this room
  sendSignalingMessage({
    type: 'CREATE_ROOM',
    roomCode: NetworkState.roomCode,
    hostId: NetworkState.myPlayerId,
  });
  
  console.log(`[NETWORK] Created lobby: ${NetworkState.roomCode}`);
  return NetworkState.roomCode;
}

/**
 * Join an existing online lobby (become client)
 * Connects to host via WebRTC using room code
 * 
 * @param {string} roomCode - 6-digit room code from host
 * @returns {Promise<void>}
 */
async function joinLobby(roomCode) {
  NetworkState.isOnline = true;
  NetworkState.isHost = false;
  NetworkState.roomCode = roomCode;
  
  // Connect to signaling server
  await connectToSignalingServer();
  
  // Request to join room
  sendSignalingMessage({
    type: 'JOIN_ROOM',
    roomCode: roomCode,
  });
  
  // Wait for host assignment
  // This will be received via signaling and set NetworkState.myPlayerId
  
  console.log(`[NETWORK] Joining lobby: ${roomCode}`);
}

/**
 * Disconnect from online lobby
 * Closes all peer connections and cleans up resources
 */
function leaveLobby() {
  // Close all peer connections
  for (const [playerId, peer] of NetworkState.peers) {
    peer.close();
  }
  
  // Close signaling connection
  if (NetworkState.signalingServer) {
    NetworkState.signalingServer.close();
    NetworkState.signalingServer = null;
  }
  
  // Reset state
  NetworkState.isOnline = false;
  NetworkState.isHost = false;
  NetworkState.peers.clear();
  NetworkState.dataChannels.clear();
  NetworkState.pings.clear();
  
  console.log('[NETWORK] Left lobby');
}

// =============================================================================
// WEBRTC PEER CONNECTIONS
// =============================================================================

/**
 * Connect to signaling server
 * Signaling is used ONLY for WebRTC setup (exchanging connection info)
 * Once peers are connected, signaling is no longer needed
 * 
 * @returns {Promise<void>}
 */
async function connectToSignalingServer() {
  return new Promise((resolve, reject) => {
    // TODO: Replace with your actual signaling server URL
    // For development, you can use a local WebSocket server or a service like PeerJS
    const SIGNALING_URL = 'wss://your-signaling-server.com';
    
    NetworkState.signalingServer = new WebSocket(SIGNALING_URL);
    
    NetworkState.signalingServer.onopen = () => {
      console.log('[NETWORK] Connected to signaling server');
      resolve();
    };
    
    NetworkState.signalingServer.onerror = (err) => {
      console.error('[NETWORK] Signaling error:', err);
      reject(err);
    };
    
    NetworkState.signalingServer.onmessage = (event) => {
      handleSignalingMessage(JSON.parse(event.data));
    };
    
    NetworkState.signalingServer.onclose = () => {
      console.log('[NETWORK] Signaling connection closed');
    };
  });
}

/**
 * Send message to signaling server
 * Used during WebRTC setup to exchange connection info
 * 
 * @param {Object} message - Signaling message
 */
function sendSignalingMessage(message) {
  if (NetworkState.signalingServer && NetworkState.signalingServer.readyState === WebSocket.OPEN) {
    NetworkState.signalingServer.send(JSON.stringify(message));
  }
}

/**
 * Handle signaling messages
 * Coordinates WebRTC peer connections between players
 * 
 * @param {Object} message - Signaling message from server
 */
async function handleSignalingMessage(message) {
  switch (message.type) {
    case 'PLAYER_ASSIGNED':
      // Server assigned us a player ID
      NetworkState.myPlayerId = message.playerId;
      NetworkState.hostPlayerId = message.hostId;
      console.log(`[NETWORK] Assigned player ID: ${NetworkState.myPlayerId}`);
      break;
      
    case 'PEER_JOINED':
      // New player joined, establish connection
      if (NetworkState.isHost) {
        await createPeerConnection(message.playerId, true);
      }
      break;
      
    case 'WEBRTC_OFFER':
      // Received WebRTC offer, respond with answer
      await handleWebRTCOffer(message.fromPlayerId, message.offer);
      break;
      
    case 'WEBRTC_ANSWER':
      // Received WebRTC answer, complete connection
      await handleWebRTCAnswer(message.fromPlayerId, message.answer);
      break;
      
    case 'ICE_CANDIDATE':
      // Received ICE candidate, add to connection
      await handleICECandidate(message.fromPlayerId, message.candidate);
      break;
  }
}

/**
 * Create peer-to-peer connection to another player
 * Uses WebRTC for low-latency, direct communication
 * 
 * @param {number} playerId - Target player's ID
 * @param {boolean} isInitiator - Are we initiating the connection?
 * @returns {Promise<RTCPeerConnection>}
 */
async function createPeerConnection(playerId, isInitiator) {
  // Create RTCPeerConnection with STUN/TURN servers
  const peer = new RTCPeerConnection({
    iceServers: NET_CONFIG.ICE_SERVERS,
  });
  
  NetworkState.peers.set(playerId, peer);
  
  // Handle ICE candidates (for NAT traversal)
  peer.onicecandidate = (event) => {
    if (event.candidate) {
      sendSignalingMessage({
        type: 'ICE_CANDIDATE',
        toPlayerId: playerId,
        fromPlayerId: NetworkState.myPlayerId,
        candidate: event.candidate,
      });
    }
  };
  
  // Handle connection state changes
  peer.onconnectionstatechange = () => {
    console.log(`[NETWORK] Peer ${playerId} state: ${peer.connectionState}`);
    
    if (peer.connectionState === 'connected') {
      NetworkState.onPeerConnected(playerId);
      console.log(`[NETWORK] Connected to player ${playerId}`);
    } else if (peer.connectionState === 'disconnected' || peer.connectionState === 'failed') {
      NetworkState.onPeerDisconnected(playerId);
      console.log(`[NETWORK] Disconnected from player ${playerId}`);
    }
  };
  
  // Create data channel (for game traffic)
  if (isInitiator) {
    // Create two channels: reliable (for state) and unreliable (for inputs)
    const reliableChannel = peer.createDataChannel('reliable', {
      ordered: true,
      maxRetransmits: 3,
    });
    
    const unreliableChannel = peer.createDataChannel('unreliable', {
      ordered: false,
      maxRetransmits: 0,  // UDP-like behavior
    });
    
    setupDataChannel(playerId, reliableChannel, 'reliable');
    setupDataChannel(playerId, unreliableChannel, 'unreliable');
    
    // Create and send offer
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    
    sendSignalingMessage({
      type: 'WEBRTC_OFFER',
      toPlayerId: playerId,
      fromPlayerId: NetworkState.myPlayerId,
      offer: offer,
    });
  } else {
    // Wait for data channels from initiator
    peer.ondatachannel = (event) => {
      const channel = event.channel;
      const type = channel.label; // 'reliable' or 'unreliable'
      setupDataChannel(playerId, channel, type);
    };
  }
  
  return peer;
}

/**
 * Setup data channel for receiving messages
 * Attaches event handlers for incoming data
 * 
 * @param {number} playerId - Peer's player ID
 * @param {RTCDataChannel} channel - WebRTC data channel
 * @param {string} type - 'reliable' or 'unreliable'
 */
function setupDataChannel(playerId, channel, type) {
  NetworkState.dataChannels.set(`${playerId}-${type}`, channel);
  
  channel.onopen = () => {
    console.log(`[NETWORK] Data channel ${type} opened with player ${playerId}`);
  };
  
  channel.onclose = () => {
    console.log(`[NETWORK] Data channel ${type} closed with player ${playerId}`);
  };
  
  channel.onmessage = (event) => {
    handleDataChannelMessage(playerId, event.data, type);
  };
  
  channel.onerror = (error) => {
    console.error(`[NETWORK] Data channel error with player ${playerId}:`, error);
  };
}

/**
 * Handle WebRTC offer (client receives this from host)
 * 
 * @param {number} fromPlayerId - Peer's player ID
 * @param {RTCSessionDescription} offer - WebRTC offer
 */
async function handleWebRTCOffer(fromPlayerId, offer) {
  const peer = await createPeerConnection(fromPlayerId, false);
  
  await peer.setRemoteDescription(new RTCSessionDescription(offer));
  
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  
  sendSignalingMessage({
    type: 'WEBRTC_ANSWER',
    toPlayerId: fromPlayerId,
    fromPlayerId: NetworkState.myPlayerId,
    answer: answer,
  });
}

/**
 * Handle WebRTC answer (host receives this from client)
 * 
 * @param {number} fromPlayerId - Peer's player ID
 * @param {RTCSessionDescription} answer - WebRTC answer
 */
async function handleWebRTCAnswer(fromPlayerId, answer) {
  const peer = NetworkState.peers.get(fromPlayerId);
  if (peer) {
    await peer.setRemoteDescription(new RTCSessionDescription(answer));
  }
}

/**
 * Handle ICE candidate (NAT traversal)
 * 
 * @param {number} fromPlayerId - Peer's player ID
 * @param {RTCIceCandidate} candidate - ICE candidate
 */
async function handleICECandidate(fromPlayerId, candidate) {
  const peer = NetworkState.peers.get(fromPlayerId);
  if (peer) {
    await peer.addIceCandidate(new RTCIceCandidate(candidate));
  }
}

// =============================================================================
// MESSAGE HANDLING
// =============================================================================

/**
 * Handle incoming data channel messages
 * Routes messages to appropriate handlers based on type
 * 
 * @param {number} playerId - Sender's player ID
 * @param {ArrayBuffer|string} data - Message data
 * @param {string} channelType - 'reliable' or 'unreliable'
 */
function handleDataChannelMessage(playerId, data, channelType) {
  // Parse binary or JSON message
  let message;
  
  if (data instanceof ArrayBuffer) {
    // Binary message (likely input packet)
    message = { type: 'INPUT', data: data };
  } else {
    // JSON message
    try {
      message = JSON.parse(data);
    } catch (err) {
      console.error('[NETWORK] Failed to parse message:', err);
      return;
    }
  }
  
  // Route to handler
  switch (message.type) {
    case 'INPUT':
      if (NetworkState.isHost) {
        handleInputPacket(playerId, message.data);
      }
      break;
      
    case 'STATE_UPDATE':
      if (!NetworkState.isHost) {
        handleStateUpdate(message.data);
      }
      break;
      
    case 'HEARTBEAT':
      NetworkState.lastHeartbeat = performance.now();
      break;
      
    case 'PING_REQUEST':
      sendPingResponse(playerId, message.timestamp);
      break;
      
    case 'PING_RESPONSE':
      handlePingResponse(playerId, message.timestamp);
      break;
      
    default:
      // Custom message (music, chat, etc.)
      NetworkState.onMessage(message);
      break;
  }
}

/**
 * Broadcast message to all connected peers
 * 
 * @param {Object} message - Message to broadcast
 * @param {string} channel - 'reliable' or 'unreliable'
 */
function broadcastMessage(message, channel = 'reliable') {
  const data = JSON.stringify(message);
  
  for (const [key, dataChannel] of NetworkState.dataChannels) {
    if (key.endsWith(`-${channel}`) && dataChannel.readyState === 'open') {
      dataChannel.send(data);
    }
  }
}

/**
 * Send message to specific peer
 * 
 * @param {number} playerId - Target player ID
 * @param {Object} message - Message to send
 * @param {string} channel - 'reliable' or 'unreliable'
 */
function sendMessage(playerId, message, channel = 'reliable') {
  const key = `${playerId}-${channel}`;
  const dataChannel = NetworkState.dataChannels.get(key);
  
  if (dataChannel && dataChannel.readyState === 'open') {
    const data = JSON.stringify(message);
    dataChannel.send(data);
  }
}

/**
 * Send binary data to specific peer (for inputs)
 * 
 * @param {number} playerId - Target player ID
 * @param {ArrayBuffer} data - Binary data
 * @param {string} channel - 'reliable' or 'unreliable'
 */
function sendBinary(playerId, data, channel = 'unreliable') {
  const key = `${playerId}-${channel}`;
  const dataChannel = NetworkState.dataChannels.get(key);
  
  if (dataChannel && dataChannel.readyState === 'open') {
    dataChannel.send(data);
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

// Export network API for game to use
if (typeof module !== 'undefined' && module.exports) {
  // Node.js export (for testing)
  module.exports = {
    NET_CONFIG,
    NetworkState,
    initNetwork,
    createLobby,
    joinLobby,
    leaveLobby,
    broadcastMessage,
    sendMessage,
    sendBinary,
  };
}

console.log('[NETWORK] Module loaded');
