/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NEO-VECTR ∞SNIP3 - BATTLE ROYALE SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Epic 99-player battle royale mode with:
 * - Up to 99 total players (8 human + 91 AI)
 * - Dynamic pie grid that shrinks as players are eliminated
 * - Audio-reactive glow effects (players, walls, lasers pulse to beat)
 * - AI opponents with varying skill levels
 * - Battle royale mechanics (shrinking arena, survival)
 * - Real-time elimination tracking
 * - Placement system (1st, 2nd, 3rd, etc.)
 * - Spectator mode when eliminated
 * 
 * Music by: TRNDSTR
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// BATTLE ROYALE STATE
// ═══════════════════════════════════════════════════════════════════════════

const BattleRoyale = {
  // Player configuration
  maxPlayers: 99,              // Total players (8 human + 91 AI)
  maxHumanPlayers: 8,          // Max human players
  currentPlayerCount: 99,      // Current active players
  
  // Player tracking
  alivePlayers: [],            // Array of alive player IDs
  eliminatedPlayers: [],       // Array of {id, placement, time}
  placement: 1,                // Current placement (99, 98, 97...)
  
  // Arena shrinking
  shrinkEnabled: true,
  currentSlices: 99,           // Current number of pie slices
  targetSlices: 99,            // Target after next shrink
  shrinkProgress: 0,           // 0 to 1
  shrinkSpeed: 0.3,            // Speed of shrink animation
  
  // Audio reactivity
  audioEnergy: 0,
  audioEnergySmooth: 0,
  beatIntensity: 0,
  beatDecay: 0.95,
  lastBeatTime: 0,
  
  // Game state
  gameMode: 'WARMUP',          // 'WARMUP', 'ACTIVE', 'ENDGAME', 'FINISHED'
  warmupTime: 5,               // Seconds before game starts
  shrinkTimer: 30,             // Seconds between shrinks
  timeSinceLastShrink: 0,
  
  // Visual effects
  wallGlowPulse: 0,
  playerGlowPulse: 0,
  arenaGlowIntensity: 0,
};

/**
 * Color palette for 99 players
 * Generates distinct hues across spectrum
 */
function generatePlayerColors(count) {
  const colors = [];
  const hueStep = 360 / count;
  
  for (let i = 0; i < count; i++) {
    const hue = (i * hueStep) % 360;
    const { r, g, b } = hslToRgb(hue / 360, 0.9, 0.6);
    
    colors.push({
      name: `Player${i + 1}`,
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
      hue: hue,
    });
  }
  
  return colors;
}

/**
 * HSL to RGB conversion
 * @param {number} h - Hue (0-1)
 * @param {number} s - Saturation (0-1)
 * @param {number} l - Lightness (0-1)
 * @returns {{r, g, b}} - RGB values (0-1)
 */
function hslToRgb(h, s, l) {
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return { r, g, b };
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIO REACTIVITY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Update audio-reactive effects
 * Call this every frame with audio data
 * @param {Uint8Array} frequencyData - Audio frequency data
 * @param {number} dt - Delta time
 */
function updateAudioReactivity(frequencyData, dt) {
  if (!frequencyData) return;
  
  // Calculate energy from frequency data
  let sum = 0;
  const bins = Math.min(32, frequencyData.length);
  for (let i = 0; i < bins; i++) {
    sum += frequencyData[i];
  }
  BattleRoyale.audioEnergy = (sum / bins) / 255;
  
  // Smooth energy for baseline
  BattleRoyale.audioEnergySmooth = BattleRoyale.audioEnergySmooth * 0.85 + BattleRoyale.audioEnergy * 0.15;
  
  // Beat detection
  const rise = BattleRoyale.audioEnergy - BattleRoyale.audioEnergySmooth;
  const now = Date.now();
  if (rise > 0.15 && now - BattleRoyale.lastBeatTime > 150) {
    BattleRoyale.beatIntensity = 1.0;
    BattleRoyale.lastBeatTime = now;
  }
  
  // Decay beat intensity
  BattleRoyale.beatIntensity *= BattleRoyale.beatDecay;
  
  // Pulse calculations
  BattleRoyale.wallGlowPulse = BattleRoyale.audioEnergy * 0.6 + BattleRoyale.beatIntensity * 0.4;
  BattleRoyale.playerGlowPulse = BattleRoyale.audioEnergy * 0.5 + BattleRoyale.beatIntensity * 0.5;
  BattleRoyale.arenaGlowIntensity = BattleRoyale.audioEnergy * 0.3;
}

// ═══════════════════════════════════════════════════════════════════════════
// PLAYER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize battle royale players
 * @param {number} totalPlayers - Total players (1-99)
 * @param {number} humanPlayers - Human players (1-8)
 * @param {Object} arena - Arena dimensions
 * @returns {Array} - Array of player objects
 */
function initBattleRoyalePlayers(totalPlayers, humanPlayers, arena) {
  totalPlayers = Math.max(1, Math.min(99, totalPlayers));
  humanPlayers = Math.max(1, Math.min(8, humanPlayers));
  humanPlayers = Math.min(humanPlayers, totalPlayers);
  
  BattleRoyale.maxPlayers = totalPlayers;
  BattleRoyale.maxHumanPlayers = humanPlayers;
  BattleRoyale.currentPlayerCount = totalPlayers;
  BattleRoyale.currentSlices = totalPlayers;
  BattleRoyale.targetSlices = totalPlayers;
  BattleRoyale.alivePlayers = [];
  BattleRoyale.eliminatedPlayers = [];
  BattleRoyale.placement = totalPlayers;
  
  const players = [];
  const colors = generatePlayerColors(totalPlayers);
  const spawnR = arena.r * 0.45;
  
  const TAU = Math.PI * 2;
  
  for (let i = 0; i < totalPlayers; i++) {
    const angMin = (TAU * i) / totalPlayers;
    const angMax = (TAU * (i + 1)) / totalPlayers;
    const mid = (angMin + angMax) * 0.5;
    
    const player = {
      id: i,
      isHuman: i < humanPlayers,
      isAI: i >= humanPlayers,
      color: colors[i],
      angMin,
      angMax,
      
      // Position
      x: arena.cx + Math.cos(mid) * spawnR,
      y: arena.cy + Math.sin(mid) * spawnR,
      vx: 0,
      vy: 0,
      
      // Aiming
      aimX: Math.cos(mid),
      aimY: Math.sin(mid),
      lastMoveX: Math.cos(mid),
      lastMoveY: Math.sin(mid),
      
      // Stats
      alive: true,
      health: 100,
      kills: 0,
      
      // AI specific
      aiDifficulty: i >= humanPlayers ? Math.random() : 0, // 0-1
      aiTarget: null,
      aiShootCooldown: 0,
      aiThinkTimer: 0,
      
      // Visual
      trail: [],
      trailMax: 24,
      glowPhase: Math.random() * Math.PI * 2, // For individual pulse variation
      
      // Drift for idle players
      driftT: Math.random() * 10,
    };
    
    players.push(player);
    BattleRoyale.alivePlayers.push(i);
  }
  
  console.log(`[BattleRoyale] Initialized ${totalPlayers} players (${humanPlayers} human, ${totalPlayers - humanPlayers} AI)`);
  
  return players;
}

/**
 * Eliminate a player
 * @param {Object} player - Player to eliminate
 */
function eliminatePlayer(player) {
  if (!player.alive) return;
  
  player.alive = false;
  BattleRoyale.currentPlayerCount--;
  
  // Remove from alive list
  const idx = BattleRoyale.alivePlayers.indexOf(player.id);
  if (idx !== -1) {
    BattleRoyale.alivePlayers.splice(idx, 1);
  }
  
  // Add to eliminated list
  BattleRoyale.eliminatedPlayers.push({
    id: player.id,
    placement: BattleRoyale.placement,
    time: Date.now(),
  });
  
  console.log(`[BattleRoyale] Player ${player.id + 1} eliminated (Rank #${BattleRoyale.placement})`);
  
  BattleRoyale.placement--;
  
  // Trigger arena shrink
  if (BattleRoyale.shrinkEnabled && BattleRoyale.alivePlayers.length < BattleRoyale.currentSlices) {
    BattleRoyale.targetSlices = BattleRoyale.alivePlayers.length;
  }
  
  // Check for victory
  if (BattleRoyale.alivePlayers.length === 1) {
    BattleRoyale.gameMode = 'FINISHED';
    console.log(`[BattleRoyale] Winner: Player ${BattleRoyale.alivePlayers[0] + 1}!`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ARENA SHRINKING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Update arena shrinking animation
 * @param {number} dt - Delta time
 */
function updateArenaShrink(dt) {
  // Shrink animation
  if (BattleRoyale.currentSlices > BattleRoyale.targetSlices) {
    BattleRoyale.shrinkProgress += BattleRoyale.shrinkSpeed * dt;
    
    if (BattleRoyale.shrinkProgress >= 1.0) {
      BattleRoyale.shrinkProgress = 0;
      BattleRoyale.currentSlices = BattleRoyale.targetSlices;
      console.log(`[BattleRoyale] Arena shrunk to ${BattleRoyale.currentSlices} slices`);
    }
  }
}

/**
 * Recalculate player slice boundaries after shrink
 * @param {Array} players - Array of players
 * @param {number} sliceCount - New slice count
 */
function recalculateSlices(players, sliceCount) {
  const TAU = Math.PI * 2;
  const alivePlayerIndices = players
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.alive)
    .map(({ i }) => i);
  
  // Redistribute slices among alive players
  for (let i = 0; i < alivePlayerIndices.length; i++) {
    const playerIdx = alivePlayerIndices[i];
    const player = players[playerIdx];
    
    player.angMin = (TAU * i) / sliceCount;
    player.angMax = (TAU * (i + 1)) / sliceCount;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AI BEHAVIOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Update AI player behavior
 * @param {Object} aiPlayer - AI player
 * @param {Array} allPlayers - All players
 * @param {number} dt - Delta time
 * @param {Object} arena - Arena
 */
function updateAIPlayer(aiPlayer, allPlayers, dt, arena) {
  if (!aiPlayer.alive || !aiPlayer.isAI) return;
  
  aiPlayer.aiThinkTimer += dt;
  aiPlayer.aiShootCooldown = Math.max(0, aiPlayer.aiShootCooldown - dt);
  
  // Think every 0.2-0.5 seconds (based on difficulty)
  const thinkInterval = 0.5 - aiPlayer.aiDifficulty * 0.3;
  if (aiPlayer.aiThinkTimer < thinkInterval) return;
  aiPlayer.aiThinkTimer = 0;
  
  // Find nearest alive enemy
  let nearestEnemy = null;
  let nearestDist = Infinity;
  
  for (const other of allPlayers) {
    if (other.id === aiPlayer.id || !other.alive) continue;
    
    const dx = other.x - aiPlayer.x;
    const dy = other.y - aiPlayer.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestEnemy = other;
    }
  }
  
  if (nearestEnemy) {
    aiPlayer.aiTarget = nearestEnemy;
    
    // Aim at target
    const dx = nearestEnemy.x - aiPlayer.x;
    const dy = nearestEnemy.y - aiPlayer.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > 0.1) {
      // Add inaccuracy based on difficulty (inverse)
      const inaccuracy = (1 - aiPlayer.aiDifficulty) * 0.3;
      const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * inaccuracy;
      
      aiPlayer.aimX = Math.cos(angle);
      aiPlayer.aimY = Math.sin(angle);
      
      // Movement: strafe randomly while keeping distance
      const moveAngle = angle + (Math.random() - 0.5) * Math.PI * 0.5;
      aiPlayer.lastMoveX = Math.cos(moveAngle);
      aiPlayer.lastMoveY = Math.sin(moveAngle);
    }
  } else {
    // No target: patrol/idle
    const mid = (aiPlayer.angMin + aiPlayer.angMax) * 0.5;
    const wobble = 0.3 * Math.sin(aiPlayer.driftT * 0.8);
    const ang = mid + wobble;
    
    aiPlayer.aimX = Math.cos(ang);
    aiPlayer.aimY = Math.sin(ang);
    aiPlayer.lastMoveX = Math.cos(ang);
    aiPlayer.lastMoveY = Math.sin(ang);
  }
  
  aiPlayer.driftT += dt;
}

/**
 * Check if AI should shoot
 * @param {Object} aiPlayer - AI player
 * @returns {boolean} - True if AI should shoot
 */
function aiShouldShoot(aiPlayer) {
  if (!aiPlayer.isAI || !aiPlayer.alive) return false;
  if (aiPlayer.aiShootCooldown > 0) return false;
  if (!aiPlayer.aiTarget || !aiPlayer.aiTarget.alive) return false;
  
  // Shooting frequency based on difficulty
  const shootChance = 0.3 + aiPlayer.aiDifficulty * 0.5;
  if (Math.random() > shootChance) return false;
  
  // Set cooldown
  const cooldown = 0.5 - aiPlayer.aiDifficulty * 0.3; // 0.2-0.5s
  aiPlayer.aiShootCooldown = cooldown;
  
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIO-REACTIVE RENDERING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Draw arena ring with audio-reactive glow
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} arena
 */
function drawAudioReactiveArenaRing(ctx, arena) {
  const intensity = BattleRoyale.arenaGlowIntensity;
  const beat = BattleRoyale.beatIntensity;
  
  const c = { r: 120, g: 255, b: 255 };
  
  ctx.globalCompositeOperation = 'lighter';
  
  // Outer glow (pulses to beat)
  ctx.beginPath();
  ctx.arc(arena.cx, arena.cy, arena.r, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${0.06 + intensity * 0.15 + beat * 0.1})`;
  ctx.lineWidth = 10 + beat * 15;
  ctx.stroke();
  
  // Core ring
  ctx.beginPath();
  ctx.arc(arena.cx, arena.cy, arena.r, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${0.14 + beat * 0.2})`;
  ctx.lineWidth = 2.2 + beat * 1;
  ctx.stroke();
}

/**
 * Draw player slices with audio-reactive glow
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} players
 * @param {Object} arena
 * @param {number} sliceShakeAng - P1 shake (optional)
 */
function drawAudioReactivePlayerSlices(ctx, players, arena, sliceShakeAng = 0) {
  const beat = BattleRoyale.beatIntensity;
  const glow = BattleRoyale.wallGlowPulse;
  
  // Soft fill wedges
  for (const p of players) {
    if (!p.alive) continue;
    
    const j = (p.id === 0) ? sliceShakeAng : 0;
    const a0 = p.angMin + j;
    const a1 = p.angMax + j;
    
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.moveTo(arena.cx, arena.cy);
    ctx.arc(arena.cx, arena.cy, arena.r * 0.985, a0, a1);
    ctx.closePath();
    
    const fillAlpha = 0.028 + beat * 0.02;
    ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${fillAlpha})`;
    ctx.fill();
  }
  
  // Wedge boundary lines (glow to beat)
  for (const p of players) {
    if (!p.alive) continue;
    
    const j = (p.id === 0) ? sliceShakeAng : 0;
    const a0 = p.angMin + j;
    const c = p.color;
    const x0 = arena.cx + Math.cos(a0) * arena.r;
    const y0 = arena.cy + Math.sin(a0) * arena.r;
    
    // Glow layers
    ctx.globalCompositeOperation = 'lighter';
    const haloAlpha = 0.06 + glow * 0.1;
    const coreAlpha = 0.22 + glow * 0.15;
    
    ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${haloAlpha})`;
    ctx.lineWidth = 7.0 + beat * 5;
    ctx.beginPath();
    ctx.moveTo(arena.cx, arena.cy);
    ctx.lineTo(x0, y0);
    ctx.stroke();
    
    ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${coreAlpha})`;
    ctx.lineWidth = 1.3 + beat * 0.5;
    ctx.beginPath();
    ctx.moveTo(arena.cx, arena.cy);
    ctx.lineTo(x0, y0);
    ctx.stroke();
  }
  
  // Outer slice arcs
  for (const p of players) {
    if (!p.alive) continue;
    
    const j = (p.id === 0) ? sliceShakeAng : 0;
    const a0 = p.angMin + j;
    const a1 = p.angMax + j;
    const c = p.color;
    
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.arc(arena.cx, arena.cy, arena.r, a0, a1);
    ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${0.14 + beat * 0.15})`;
    ctx.lineWidth = 2.0 + beat * 1.5;
    ctx.stroke();
  }
}

/**
 * Draw player ship with audio-reactive glow
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} player
 * @param {boolean} isP1
 * @param {number} shakeX
 * @param {number} shakeY
 */
function drawAudioReactivePlayerShip(ctx, player, isP1, shakeX = 0, shakeY = 0) {
  if (!player.alive) return;
  
  const sx = player.x + (isP1 ? shakeX : 0);
  const sy = player.y + (isP1 ? shakeY : 0);
  
  const ang = Math.atan2(player.aimY, player.aimX);
  const fX = Math.cos(ang), fY = Math.sin(ang);
  const rX = -fY, rY = fX;
  
  const s = 18;
  const tip = { x: sx + fX * (2.2 * s), y: sy + fY * (2.2 * s) };
  const left = { x: sx + fX * (-1.0 * s) + rX * (0.9 * s), y: sy + fY * (-1.0 * s) + rY * (0.9 * s) };
  const right = { x: sx + fX * (-1.0 * s) - rX * (0.9 * s), y: sy + fY * (-1.0 * s) - rY * (0.9 * s) };
  
  // Audio-reactive glow
  const glow = BattleRoyale.playerGlowPulse;
  const beat = BattleRoyale.beatIntensity;
  
  // Individual pulse variation
  const phase = player.glowPhase + Date.now() * 0.002;
  const individualPulse = Math.sin(phase) * 0.5 + 0.5;
  const finalGlow = glow * 0.7 + individualPulse * 0.3;
  
  const coreW = 2.2 + beat * 0.5;
  const haloW = 10.0 + finalGlow * 8;
  const coreA = 0.90 + beat * 0.1;
  const haloA = 0.18 + finalGlow * 0.15;
  
  // Draw ship
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Halo
  ctx.strokeStyle = `rgba(${player.color.r}, ${player.color.g}, ${player.color.b}, ${haloA})`;
  ctx.lineWidth = haloW;
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(left.x, left.y);
  ctx.lineTo(right.x, right.y);
  ctx.closePath();
  ctx.stroke();
  
  // Core
  ctx.strokeStyle = `rgba(${player.color.r}, ${player.color.g}, ${player.color.b}, ${coreA})`;
  ctx.lineWidth = coreW;
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(left.x, left.y);
  ctx.lineTo(right.x, right.y);
  ctx.closePath();
  ctx.stroke();
  
  // Aim feeler
  const feelerAlpha = 0.35 + finalGlow * 0.2;
  ctx.strokeStyle = `rgba(255, 180, 255, ${feelerAlpha})`;
  ctx.lineWidth = 1.2 + beat * 0.3;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx + player.aimX * 40, sy + player.aimY * 40);
  ctx.stroke();
}

// ═══════════════════════════════════════════════════════════════════════════
// HUD & UI
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Draw battle royale HUD
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {Object} localPlayer
 */
function drawBattleRoyaleHUD(ctx, canvasWidth, canvasHeight, localPlayer) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  
  // Top-right: Player count
  const hudX = canvasWidth - 15;
  const hudY = 15;
  
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 24px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillText(`${BattleRoyale.alivePlayers.length}`, hudX, hudY);
  
  ctx.font = '14px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText('ALIVE', hudX, hudY + 28);
  
  // Top-left: Current placement
  if (localPlayer && localPlayer.alive) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = 'rgba(0, 255, 255, 0.9)';
    
    const rank = BattleRoyale.alivePlayers.indexOf(localPlayer.id) + 1;
    ctx.fillText(`#${rank}`, 15, 15);
    
    ctx.font = '12px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(`Kills: ${localPlayer.kills}`, 15, 40);
  }
  
  // Center: Victory/Elimination text
  if (BattleRoyale.gameMode === 'FINISHED') {
    const winner = BattleRoyale.alivePlayers[0];
    const isWinner = localPlayer && localPlayer.id === winner;
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 48px monospace';
    
    if (isWinner) {
      ctx.fillStyle = 'rgba(255, 255, 0, 0.95)';
      ctx.fillText('VICTORY ROYALE', canvasWidth / 2, canvasHeight / 2);
    } else {
      ctx.fillStyle = 'rgba(255, 100, 100, 0.9)';
      ctx.fillText('ELIMINATED', canvasWidth / 2, canvasHeight / 2);
      
      ctx.font = '24px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      const placement = BattleRoyale.eliminatedPlayers.find(e => e.id === localPlayer.id)?.placement || '?';
      ctx.fillText(`Rank #${placement}`, canvasWidth / 2, canvasHeight / 2 + 50);
    }
  }
  
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

window.BattleRoyaleSystem = {
  // State
  state: BattleRoyale,
  
  // Player management
  initPlayers: initBattleRoyalePlayers,
  eliminatePlayer: eliminatePlayer,
  
  // Audio reactivity
  updateAudioReactivity: updateAudioReactivity,
  
  // Arena
  updateArenaShrink: updateArenaShrink,
  recalculateSlices: recalculateSlices,
  
  // AI
  updateAIPlayer: updateAIPlayer,
  aiShouldShoot: aiShouldShoot,
  
  // Rendering
  drawArenaRing: drawAudioReactiveArenaRing,
  drawPlayerSlices: drawAudioReactivePlayerSlices,
  drawPlayerShip: drawAudioReactivePlayerShip,
  drawHUD: drawBattleRoyaleHUD,
  
  // Utility
  generateColors: generatePlayerColors,
};

console.log('[BattleRoyale] System loaded - Up to 99 players supported');
console.log('[BattleRoyale] Audio-reactive visuals • Dynamic shrinking arena • Music by TRNDSTR');
