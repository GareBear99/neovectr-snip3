/**
 * NEO-VECTR ∞SNIP3 - Input Synchronization
 * Handles client input collection, binary packing, and host-side processing
 * 
 * Flow:
 * 1. Client collects input every frame (60 Hz)
 * 2. Client packs input to binary (24 bytes)
 * 3. Client sends to host via unreliable channel
 * 4. Host receives, buffers, and applies inputs
 * 5. Host broadcasts state to all clients (20 Hz)
 * 6. Clients interpolate state for smooth rendering
 * 
 * Bandwidth per client:
 * - Upload: 24 bytes × 60 Hz = 1.44 KB/s
 * - Download: 200 bytes × 20 Hz = 4 KB/s
 */

// =============================================================================
// INPUT PACKET STRUCTURE
// =============================================================================

/**
 * Input packet binary layout (24 bytes total)
 * 
 * Byte offset | Size | Type    | Field
 * ------------|------|---------|------------------
 * 0-3         | 4    | uint32  | Sequence number
 * 4-11        | 8    | float64 | Timestamp (ms)
 * 12          | 1    | uint8   | Key states (bitfield)
 * 13-16       | 4    | float32 | Aim angle (radians)
 * 17-20       | 4    | float32 | Charge held (0-1)
 * 21-23       | 3    | -       | Reserved for future use
 * 
 * Key bitfield (byte 12):
 * Bit 0: Up (W)
 * Bit 1: Down (S)
 * Bit 2: Left (A)
 * Bit 3: Right (D)
 * Bit 4: Fire (Space/Mouse)
 * Bit 5: Boost (Shift)
 * Bit 6-7: Reserved
 */

/**
 * InputPacket class
 * Represents a single frame of player input
 */
class InputPacket {
  constructor() {
    this.seq = 0;           // Sequence number for ordering
    this.timestamp = 0;     // Client timestamp (ms)
    this.keys = {           // Key states
      up: false,
      down: false,
      left: false,
      right: false,
      fire: false,
      boost: false,
    };
    this.aimAngle = 0;      // Aim direction in radians
    this.chargeHeld = 0;    // Charge shot progress (0-1)
  }
  
  /**
   * Pack input to binary format
   * Reduces from ~200 bytes (JSON) to 24 bytes (binary)
   * 
   * @returns {ArrayBuffer} 24-byte binary packet
   */
  pack() {
    const buffer = new ArrayBuffer(24);
    const view = new DataView(buffer);
    
    // Sequence number (4 bytes)
    view.setUint32(0, this.seq, true);
    
    // Timestamp (8 bytes, double precision for accuracy)
    view.setFloat64(4, this.timestamp, true);
    
    // Keys (1 byte, bit-packed)
    let keyByte = 0;
    if (this.keys.up)    keyByte |= (1 << 0);
    if (this.keys.down)  keyByte |= (1 << 1);
    if (this.keys.left)  keyByte |= (1 << 2);
    if (this.keys.right) keyByte |= (1 << 3);
    if (this.keys.fire)  keyByte |= (1 << 4);
    if (this.keys.boost) keyByte |= (1 << 5);
    view.setUint8(12, keyByte);
    
    // Aim angle (4 bytes, float32 is enough precision)
    view.setFloat32(13, this.aimAngle, true);
    
    // Charge held (4 bytes)
    view.setFloat32(17, this.chargeHeld, true);
    
    return buffer;
  }
  
  /**
   * Unpack binary data to InputPacket
   * 
   * @param {ArrayBuffer} buffer - 24-byte binary packet
   * @returns {InputPacket} Unpacked input
   */
  static unpack(buffer) {
    const input = new InputPacket();
    const view = new DataView(buffer);
    
    // Sequence number
    input.seq = view.getUint32(0, true);
    
    // Timestamp
    input.timestamp = view.getFloat64(4, true);
    
    // Keys (unpack bitfield)
    const keyByte = view.getUint8(12);
    input.keys.up    = !!(keyByte & (1 << 0));
    input.keys.down  = !!(keyByte & (1 << 1));
    input.keys.left  = !!(keyByte & (1 << 2));
    input.keys.right = !!(keyByte & (1 << 3));
    input.keys.fire  = !!(keyByte & (1 << 4));
    input.keys.boost = !!(keyByte & (1 << 5));
    
    // Aim angle
    input.aimAngle = view.getFloat32(13, true);
    
    // Charge held
    input.chargeHeld = view.getFloat32(17, true);
    
    return input;
  }
}

// =============================================================================
// CLIENT-SIDE INPUT COLLECTION
// =============================================================================

// Input state (referenced from main game code)
// These should be defined in your main game file
// const keys = new Set();          // Active keyboard keys
// const mouseDown = false;         // Mouse button state
// const aimAngle = 0;              // Current aim angle
// const charging = false;          // Is charge shot active
// const chargeHeld = 0;            // Charge progress (0-1)

// Input sequence counter (increments with each packet sent)
let clientInputSequence = 0;

// Pending inputs (for client-side prediction reconciliation)
const pendingClientInputs = [];

// Input send timer (60 Hz)
let inputSendTimer = 0;
const INPUT_SEND_INTERVAL = 1000 / 60; // 16.67ms

/**
 * Collect current input state from controls
 * Call this every frame to capture player input
 * 
 * @param {Object} gameState - Current game state (keys, mouse, etc.)
 * @returns {InputPacket} Current input state
 */
function collectInput(gameState) {
  const input = new InputPacket();
  
  // Sequence number (for ordering)
  input.seq = clientInputSequence++;
  
  // Timestamp (for latency compensation)
  input.timestamp = performance.now();
  
  // Key states (from keyboard/gamepad)
  input.keys.up    = gameState.keys.has('KeyW') || gameState.keys.has('ArrowUp');
  input.keys.down  = gameState.keys.has('KeyS') || gameState.keys.has('ArrowDown');
  input.keys.left  = gameState.keys.has('KeyA') || gameState.keys.has('ArrowLeft');
  input.keys.right = gameState.keys.has('KeyD') || gameState.keys.has('ArrowRight');
  input.keys.fire  = gameState.mouseDown || gameState.keys.has('Space');
  input.keys.boost = gameState.keys.has('ShiftLeft') || gameState.keys.has('ShiftRight');
  
  // Aim direction (in radians, more efficient than x/y coordinates)
  input.aimAngle = gameState.aimAngle || 0;
  
  // Charge shot progress (for client-side prediction)
  input.chargeHeld = (gameState.charging && gameState.chargeHeld) ? gameState.chargeHeld : 0;
  
  return input;
}

/**
 * Send input to host
 * Call this at 60 Hz to maintain smooth controls
 * 
 * @param {InputPacket} input - Input to send
 */
function sendInputToHost(input) {
  // Only send if we're a client (not the host)
  if (NetworkState.isHost) return;
  
  // Pack to binary
  const packed = input.pack();
  
  // Send via unreliable channel (UDP-like, low latency)
  // We don't need reliability here because inputs are sent so frequently
  // that a lost packet is immediately replaced by the next one
  sendBinary(NetworkState.hostPlayerId, packed, 'unreliable');
  
  // Store for client-side prediction reconciliation
  pendingClientInputs.push(input);
  
  // Limit pending inputs (avoid memory leak)
  if (pendingClientInputs.length > 120) {
    pendingClientInputs.shift();
  }
}

/**
 * Update input system (call every frame)
 * Handles input collection and sending at 60 Hz
 * 
 * @param {number} dt - Delta time in seconds
 * @param {Object} gameState - Current game state
 */
function updateInputSystem(dt, gameState) {
  // Only run on clients
  if (!NetworkState.isOnline || NetworkState.isHost) return;
  
  // Throttle to 60 Hz
  inputSendTimer += dt * 1000;
  if (inputSendTimer >= INPUT_SEND_INTERVAL) {
    inputSendTimer -= INPUT_SEND_INTERVAL;
    
    // Collect and send input
    const input = collectInput(gameState);
    sendInputToHost(input);
  }
}

// =============================================================================
// HOST-SIDE INPUT PROCESSING
// =============================================================================

// Input buffers for each client (host only)
const hostClientInputBuffers = new Map(); // Map<playerId, InputPacket[]>

/**
 * Receive input packet from client (host only)
 * Stores input in buffer for processing
 * 
 * @param {number} playerId - Client's player ID
 * @param {ArrayBuffer} packedInput - Binary input packet
 */
function receiveClientInput(playerId, packedInput) {
  // Unpack binary input
  const input = InputPacket.unpack(packedInput);
  
  // Get or create buffer for this client
  if (!hostClientInputBuffers.has(playerId)) {
    hostClientInputBuffers.set(playerId, []);
  }
  
  const buffer = hostClientInputBuffers.get(playerId);
  
  // Add to buffer
  buffer.push(input);
  
  // Sort by sequence number (handle out-of-order packets)
  buffer.sort((a, b) => a.seq - b.seq);
  
  // Remove old inputs (older than 500ms)
  const now = performance.now();
  const filtered = buffer.filter(inp => (now - inp.timestamp) < 500);
  hostClientInputBuffers.set(playerId, filtered);
  
  // Limit buffer size (prevent memory leak)
  if (filtered.length > 120) {
    filtered.shift();
  }
}

/**
 * Apply input to player (host authoritative)
 * Host validates and applies input to game state
 * 
 * @param {Object} player - Player object
 * @param {InputPacket} input - Input to apply
 * @param {number} dt - Delta time in seconds
 */
function applyInputToPlayer(player, input, dt) {
  // Movement vector
  let dx = 0, dy = 0;
  if (input.keys.up)    dy -= 1;
  if (input.keys.down)  dy += 1;
  if (input.keys.left)  dx -= 1;
  if (input.keys.right) dx += 1;
  
  // Normalize diagonal movement
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 0) {
    dx /= len;
    dy /= len;
  }
  
  // Apply movement (host controls speed to prevent cheating)
  const MOVE_SPEED = 280; // Pixels per second
  player.vx += dx * MOVE_SPEED * dt;
  player.vy += dy * MOVE_SPEED * dt;
  
  // Update aim direction
  player.aimX = Math.cos(input.aimAngle);
  player.aimY = Math.sin(input.aimAngle);
  
  // Fire weapon (server validates cooldown)
  if (input.keys.fire && player.shootCooldown <= 0) {
    // Spawn laser (defined in main game code)
    if (typeof spawnLaserFromPlayer === 'function') {
      spawnLaserFromPlayer(player, input.chargeHeld);
      
      // Set cooldown (prevent rapid fire exploits)
      player.shootCooldown = 0.15; // 150ms cooldown
      
      // Add event for clients to play sound
      addGameEvent({
        type: 'LASER_FIRE',
        playerId: player.id,
        x: player.x,
        y: player.y,
        power: input.chargeHeld,
      });
    }
  }
  
  // Boost (server validates cooldown)
  if (input.keys.boost && player.boostCooldown <= 0) {
    // Apply boost impulse (defined in main game code)
    if (typeof applyBoostToPlayer === 'function') {
      applyBoostToPlayer(player);
      
      // Set cooldown
      player.boostCooldown = 1.0; // 1 second cooldown
      
      // Add event for clients
      addGameEvent({
        type: 'BOOST',
        playerId: player.id,
        x: player.x,
        y: player.y,
      });
    }
  }
}

/**
 * Process all client inputs (host only)
 * Call this in host's game loop to apply inputs
 * 
 * @param {Array} players - Array of player objects
 * @param {number} dt - Delta time in seconds
 */
function processClientInputs(players, dt) {
  // Only run on host
  if (!NetworkState.isHost) return;
  
  // Process each player
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    
    // Skip if player is host (host has direct input)
    if (i === NetworkState.myPlayerId) continue;
    
    // Get input buffer for this player
    const buffer = hostClientInputBuffers.get(i);
    if (!buffer || buffer.length === 0) continue;
    
    // Use most recent input (last in buffer)
    const input = buffer[buffer.length - 1];
    
    // Apply input to player
    applyInputToPlayer(player, input, dt);
  }
}

// =============================================================================
// GAME EVENTS (for sounds/VFX)
// =============================================================================

// Event queue (populated by host, consumed by clients)
const gameEventQueue = [];

/**
 * Add game event (host only)
 * Events trigger sounds/VFX on all clients
 * 
 * @param {Object} event - Event object
 */
function addGameEvent(event) {
  if (!NetworkState.isHost) return;
  
  gameEventQueue.push(event);
}

/**
 * Pop all pending events (host only)
 * Called when broadcasting state to include events
 * 
 * @returns {Array} All pending events
 */
function popGameEvents() {
  const events = gameEventQueue.slice();
  gameEventQueue.length = 0;
  return events;
}

/**
 * Handle game event (client only)
 * Triggers local effects (sounds, particles)
 * 
 * @param {Object} event - Event from host
 */
function handleGameEvent(event) {
  // Events are handled in main game code
  // This just provides a hook for the network layer
  
  switch (event.type) {
    case 'LASER_FIRE':
      // Play shoot sound (defined in main game)
      if (typeof playShootSfx === 'function') {
        playShootSfx();
      }
      break;
      
    case 'LASER_RICOCHET':
      if (typeof playRicochetSfx === 'function') {
        playRicochetSfx();
      }
      break;
      
    case 'BOOST':
      if (typeof playBoostSfx === 'function') {
        playBoostSfx();
      }
      break;
      
    case 'EXPLOSION':
      if (typeof playZapSfx === 'function') {
        playZapSfx();
      }
      // Spawn particle effect
      if (typeof spawnExplosion === 'function') {
        spawnExplosion(event.x, event.y, event.power || 1.0);
      }
      break;
      
    case 'PLAYER_ELIMINATED':
      // Log elimination
      console.log(`[GAME] Player ${event.playerId + 1} eliminated`);
      break;
  }
}

// =============================================================================
// CLIENT-SIDE PREDICTION
// =============================================================================

/**
 * Predict local player movement (client only)
 * Provides instant feedback before server confirms
 * 
 * @param {Object} localPlayer - Local player object
 * @param {number} dt - Delta time in seconds
 * @param {Object} gameState - Current game state
 */
function predictLocalPlayer(localPlayer, dt, gameState) {
  // Only run on clients
  if (NetworkState.isHost) return;
  
  // Collect input
  const input = collectInput(gameState);
  
  // Apply input locally (instant feedback)
  applyInputToPlayer(localPlayer, input, dt);
}

/**
 * Reconcile prediction with server state (client only)
 * Corrects mispredictions when server state arrives
 * 
 * @param {Object} localPlayer - Local player object
 * @param {Object} serverPlayer - Player state from server
 */
function reconcileWithServer(localPlayer, serverPlayer) {
  // Calculate prediction error
  const errorX = Math.abs(serverPlayer.x - localPlayer.x);
  const errorY = Math.abs(serverPlayer.y - localPlayer.y);
  
  // If error is significant (>5 pixels), snap to server
  if (errorX > 5 || errorY > 5) {
    console.log(`[INPUT] Prediction error: ${errorX.toFixed(1)}, ${errorY.toFixed(1)}px`);
    
    // Snap to server position
    localPlayer.x = serverPlayer.x;
    localPlayer.y = serverPlayer.y;
    localPlayer.vx = serverPlayer.vx;
    localPlayer.vy = serverPlayer.vy;
    
    // Re-apply pending inputs (server hasn't seen them yet)
    // This ensures smooth correction without losing player actions
    for (const input of pendingClientInputs) {
      if (input.seq > serverPlayer.lastProcessedInput) {
        applyInputToPlayer(localPlayer, input, 1/120); // Fixed dt
      }
    }
  }
  
  // Clear old pending inputs
  const filtered = pendingClientInputs.filter(
    inp => inp.seq > serverPlayer.lastProcessedInput
  );
  pendingClientInputs.length = 0;
  pendingClientInputs.push(...filtered);
}

// =============================================================================
// EXPORTS
// =============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    InputPacket,
    collectInput,
    sendInputToHost,
    updateInputSystem,
    receiveClientInput,
    applyInputToPlayer,
    processClientInputs,
    addGameEvent,
    popGameEvents,
    handleGameEvent,
    predictLocalPlayer,
    reconcileWithServer,
  };
}

console.log('[NETWORK-INPUT] Module loaded');
