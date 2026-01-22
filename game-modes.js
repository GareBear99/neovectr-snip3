/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NEO-VECTR ∞SNIP3 - GAME MODES SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Game modes with complete spawning/respawning logic:
 * - Free-for-All (FFA) - Classic pie slice mode
 * - Battle Royale - Up to 99 players with shrinking arena
 * - Custom - Configurable rules and settings
 * 
 * Features:
 * - Guaranteed spawn in designated pie slice area
 * - 5-minute AI respawn fallback
 * - No player stuck out of bounds
 * - Map wall collision handling
 * - Respawn on death with invincibility
 * - Spectator mode support
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// GAME MODE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

const GameModes = {
  FFA: 'FFA',
  BATTLE_ROYALE: 'BATTLE_ROYALE',
  CUSTOM: 'CUSTOM',
};

const GameModeManager = {
  // Current mode
  currentMode: GameModes.FFA,
  
  // Mode configuration
  config: {
    playerCount: 4,
    maxPlayers: 8,
    aiEnabled: false,
    aiCount: 0,
    respawnEnabled: true,
    respawnDelay: 3.0, // seconds
    invincibilityTime: 2.0, // seconds after respawn
    aiRespawnInterval: 300.0, // 5 minutes
  },
  
  // Spawn tracking
  spawnQueue: [],
  respawnTimers: new Map(),
  aiRespawnTimers: new Map(),
  
  // Arena state
  arenaCenter: { x: 0, y: 0 },
  arenaRadius: 400,
  sliceCount: 4,
  
  // Player death tracking
  deadPlayers: new Set(),
  spectators: new Map(),
};

// ═══════════════════════════════════════════════════════════════════════════
// SPAWNING SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate safe spawn position within pie slice
 * @param {number} sliceIndex - Pie slice index
 * @param {number} sliceCount - Total slice count
 * @param {Object} arena - Arena {cx, cy, r}
 * @returns {{x, y, angle}} - Spawn position
 */
function calculateSpawnPosition(sliceIndex, sliceCount, arena) {
  const angleMin = (Math.PI * 2 * sliceIndex) / sliceCount;
  const angleMax = (Math.PI * 2 * (sliceIndex + 1)) / sliceCount;
  const angleMid = (angleMin + angleMax) / 2;
  
  // Spawn at 45% radius (safe from edges)
  const spawnRadius = arena.r * 0.45;
  
  const x = arena.cx + Math.cos(angleMid) * spawnRadius;
  const y = arena.cy + Math.sin(angleMid) * spawnRadius;
  
  return {
    x,
    y,
    angle: angleMid,
  };
}

/**
 * Spawn player at designated position
 * @param {Object} player - Player object
 * @param {number} sliceIndex - Slice index
 */
function spawnPlayer(player, sliceIndex) {
  const arena = {
    cx: GameModeManager.arenaCenter.x,
    cy: GameModeManager.arenaCenter.y,
    r: GameModeManager.arenaRadius,
  };
  
  const pos = calculateSpawnPosition(
    sliceIndex,
    GameModeManager.sliceCount,
    arena
  );
  
  player.x = pos.x;
  player.y = pos.y;
  player.vx = 0;
  player.vy = 0;
  
  // Reset aim to center
  player.aimX = Math.cos(pos.angle);
  player.aimY = Math.sin(pos.angle);
  
  // Mark as alive
  player.alive = true;
  player.health = player.maxHealth || 100;
  player.invincible = true;
  player.invincibleTime = GameModeManager.config.invincibilityTime;
  
  // Clear from dead list
  GameModeManager.deadPlayers.delete(player.id);
  
  console.log(`[GameModes] Player ${player.id} spawned at slice ${sliceIndex}`);
}

/**
 * Respawn player after delay
 * @param {Object} player - Player object
 * @param {number} sliceIndex - Slice index
 */
function queueRespawn(player, sliceIndex) {
  if (!GameModeManager.config.respawnEnabled) return;
  
  const playerId = player.id;
  GameModeManager.deadPlayers.add(playerId);
  
  // Cancel any existing respawn timer
  if (GameModeManager.respawnTimers.has(playerId)) {
    clearTimeout(GameModeManager.respawnTimers.get(playerId));
  }
  
  // Queue respawn
  const timer = setTimeout(() => {
    spawnPlayer(player, sliceIndex);
    GameModeManager.respawnTimers.delete(playerId);
  }, GameModeManager.config.respawnDelay * 1000);
  
  GameModeManager.respawnTimers.set(playerId, timer);
  
  console.log(`[GameModes] Player ${playerId} will respawn in ${GameModeManager.config.respawnDelay}s`);
}

/**
 * Check if player is out of bounds and respawn if needed
 * @param {Object} player - Player object
 * @param {number} sliceIndex - Player's slice index
 */
function checkBoundsAndRespawn(player, sliceIndex) {
  const arena = {
    cx: GameModeManager.arenaCenter.x,
    cy: GameModeManager.arenaCenter.y,
    r: GameModeManager.arenaRadius,
  };
  
  const dx = player.x - arena.cx;
  const dy = player.y - arena.cy;
  const dist = Math.hypot(dx, dy);
  
  // Out of bounds
  if (dist > arena.r + 50) {
    console.warn(`[GameModes] Player ${player.id} out of bounds, respawning`);
    spawnPlayer(player, sliceIndex);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AI RESPAWN SYSTEM (5-minute fallback)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize AI respawn timers
 * @param {Array} aiPlayers - AI player objects
 */
function initAIRespawnTimers(aiPlayers) {
  for (const ai of aiPlayers) {
    startAIRespawnTimer(ai, ai.sliceIndex || 0);
  }
}

/**
 * Start 5-minute respawn timer for AI
 * @param {Object} aiPlayer - AI player object
 * @param {number} sliceIndex - Slice index
 */
function startAIRespawnTimer(aiPlayer, sliceIndex) {
  const aiId = aiPlayer.id;
  
  // Cancel existing timer
  if (GameModeManager.aiRespawnTimers.has(aiId)) {
    clearInterval(GameModeManager.aiRespawnTimers.get(aiId));
  }
  
  // 5-minute respawn interval
  const interval = setInterval(() => {
    if (!aiPlayer.alive || GameModeManager.deadPlayers.has(aiId)) {
      console.log(`[GameModes] AI ${aiId} auto-respawn (5min fallback)`);
      spawnPlayer(aiPlayer, sliceIndex);
    }
  }, GameModeManager.config.aiRespawnInterval * 1000);
  
  GameModeManager.aiRespawnTimers.set(aiId, interval);
}

/**
 * Stop AI respawn timer
 * @param {string|number} aiId - AI player ID
 */
function stopAIRespawnTimer(aiId) {
  if (GameModeManager.aiRespawnTimers.has(aiId)) {
    clearInterval(GameModeManager.aiRespawnTimers.get(aiId));
    GameModeManager.aiRespawnTimers.delete(aiId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME MODE LOGIC
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize game mode
 * @param {string} mode - Game mode (FFA, BATTLE_ROYALE, CUSTOM)
 * @param {Object} config - Mode configuration
 */
function initGameMode(mode, config = {}) {
  GameModeManager.currentMode = mode;
  GameModeManager.config = {
    ...GameModeManager.config,
    ...config,
  };
  
  // Clear state
  GameModeManager.spawnQueue = [];
  GameModeManager.respawnTimers.clear();
  GameModeManager.deadPlayers.clear();
  GameModeManager.spectators.clear();
  
  console.log(`[GameModes] Initialized mode: ${mode}`);
}

/**
 * Setup players for current game mode
 * @param {Array} players - Player objects
 * @param {Object} arena - Arena {cx, cy, r}
 */
function setupPlayers(players, arena) {
  GameModeManager.arenaCenter = { x: arena.cx, y: arena.cy };
  GameModeManager.arenaRadius = arena.r;
  GameModeManager.sliceCount = players.length;
  
  // Spawn all players
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    player.sliceIndex = i;
    player.alive = true;
    player.health = player.maxHealth || 100;
    spawnPlayer(player, i);
  }
  
  // Setup AI respawn timers for AI players
  const aiPlayers = players.filter(p => p.isAI);
  if (aiPlayers.length > 0) {
    initAIRespawnTimers(aiPlayers);
  }
  
  console.log(`[GameModes] Setup ${players.length} players`);
}

/**
 * Update game mode logic (call every frame)
 * @param {Array} players - Player objects
 * @param {number} deltaTime - Time since last frame
 */
function updateGameMode(players, deltaTime) {
  for (const player of players) {
    // Update invincibility
    if (player.invincible && player.invincibleTime !== undefined) {
      player.invincibleTime -= deltaTime;
      if (player.invincibleTime <= 0) {
        player.invincible = false;
        console.log(`[GameModes] Player ${player.id} invincibility ended`);
      }
    }
    
    // Check bounds
    if (player.alive) {
      checkBoundsAndRespawn(player, player.sliceIndex || 0);
    }
  }
  
  // Mode-specific logic
  switch (GameModeManager.currentMode) {
    case GameModes.BATTLE_ROYALE:
      updateBattleRoyaleMode(players, deltaTime);
      break;
    case GameModes.CUSTOM:
      updateCustomMode(players, deltaTime);
      break;
    default:
      // FFA - no special logic
      break;
  }
}

/**
 * Battle Royale mode update
 */
function updateBattleRoyaleMode(players, deltaTime) {
  // Handled by battle-royale-system.js
  // This is a hook for additional logic
}

/**
 * Custom mode update
 */
function updateCustomMode(players, deltaTime) {
  // Custom mode rules here
}

/**
 * Handle player death
 * @param {Object} player - Player object
 */
function handlePlayerDeath(player) {
  if (!player.alive) return;
  
  player.alive = false;
  player.health = 0;
  
  console.log(`[GameModes] Player ${player.id} died`);
  
  // Queue respawn
  queueRespawn(player, player.sliceIndex || 0);
}

/**
 * Cleanup game mode (call when exiting)
 */
function cleanupGameMode() {
  // Clear all timers
  for (const timer of GameModeManager.respawnTimers.values()) {
    clearTimeout(timer);
  }
  for (const interval of GameModeManager.aiRespawnTimers.values()) {
    clearInterval(interval);
  }
  
  GameModeManager.respawnTimers.clear();
  GameModeManager.aiRespawnTimers.clear();
  GameModeManager.deadPlayers.clear();
  GameModeManager.spectators.clear();
  
  console.log('[GameModes] Cleanup complete');
}

// ═══════════════════════════════════════════════════════════════════════════
// WALL COLLISION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check and handle wall collision for pie slice boundaries
 * @param {Object} player - Player object
 * @param {number} sliceIndex - Slice index
 * @param {number} sliceCount - Total slices
 * @param {Object} arena - Arena {cx, cy, r}
 */
function handleSliceWallCollision(player, sliceIndex, sliceCount, arena) {
  const dx = player.x - arena.cx;
  const dy = player.y - arena.cy;
  let playerAngle = Math.atan2(dy, dx);
  if (playerAngle < 0) playerAngle += Math.PI * 2;
  
  const angleMin = (Math.PI * 2 * sliceIndex) / sliceCount;
  const angleMax = (Math.PI * 2 * (sliceIndex + 1)) / sliceCount;
  
  // Clamp to slice boundaries
  let clamped = false;
  if (playerAngle < angleMin) {
    playerAngle = angleMin;
    clamped = true;
  } else if (playerAngle > angleMax) {
    playerAngle = angleMax;
    clamped = true;
  }
  
  if (clamped) {
    const dist = Math.hypot(dx, dy);
    player.x = arena.cx + Math.cos(playerAngle) * dist;
    player.y = arena.cy + Math.sin(playerAngle) * dist;
    
    // Bounce velocity
    const nx = Math.cos(playerAngle);
    const ny = Math.sin(playerAngle);
    const vn = player.vx * nx + player.vy * ny;
    player.vx -= nx * vn * 1.5; // Bounce back
    player.vy -= ny * vn * 1.5;
  }
  
  // Outer ring collision
  const dist = Math.hypot(dx, dy);
  if (dist > arena.r) {
    const angle = Math.atan2(dy, dx);
    player.x = arena.cx + Math.cos(angle) * arena.r;
    player.y = arena.cy + Math.sin(angle) * arena.r;
    
    // Bounce
    const nx = dx / dist;
    const ny = dy / dist;
    const vn = player.vx * nx + player.vy * ny;
    if (vn > 0) {
      player.vx -= nx * vn * 1.2;
      player.vy -= ny * vn * 1.2;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

window.GameModeManager = {
  // Enums
  Modes: GameModes,
  
  // State
  state: GameModeManager,
  
  // Initialization
  init: initGameMode,
  setupPlayers,
  
  // Spawning
  spawnPlayer,
  queueRespawn,
  calculateSpawnPosition,
  
  // Updates
  update: updateGameMode,
  handlePlayerDeath,
  
  // Collision
  handleSliceWallCollision,
  checkBoundsAndRespawn,
  
  // AI
  initAIRespawnTimers,
  startAIRespawnTimer,
  stopAIRespawnTimer,
  
  // Cleanup
  cleanup: cleanupGameMode,
};

console.log('[GameModes] Game mode system loaded');
console.log('[GameModes] Available modes: FFA, BATTLE_ROYALE, CUSTOM');
