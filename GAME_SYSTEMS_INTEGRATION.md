# NEO-VECTR ∞SNIP3 - COMPLETE GAME SYSTEMS INTEGRATION

## Overview

This guide shows how to integrate all game systems to create a fully functional multiplayer arena shooter with Battle Royale mode, custom shapes, touch controls, and comprehensive audio.

---

## System Components

### Core Systems
1. **Game Modes** (`game-modes.js`) - FFA, Battle Royale, Custom modes
2. **Touch Controls** (`touch-controls.js`) - Mobile/tablet support
3. **Shape Editor** (`shape-editor.js`) - Custom ship creation
4. **Credits** (`credits.js`) - Documentation and attribution
5. **Audio Control** (`audio-control.js`) - Sound management
6. **Audio GUI** (`audio-gui.js`) - Volume controls
7. **Network** (`network.js`, `network-state.js`, `network-input.js`) - P2P multiplayer
8. **Battle Royale** (`battle-royale-system.js`) - 99-player mode
9. **System Checker** (`system-checker.js`) - File validation
10. **Enhanced Menu** (`enhanced-menu.js`) - Boot sequence

---

## Quick Start Integration

### Step 1: Add All Scripts to HTML

```html
<!DOCTYPE html>
<html>
<head>
  <title>NEO-VECTR ∞SNIP3</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  <canvas id="gameCanvas"></canvas>
  
  <!-- Core Systems -->
  <script src="game-modes.js"></script>
  <script src="touch-controls.js"></script>
  <script src="shape-editor.js"></script>
  <script src="credits.js"></script>
  
  <!-- Audio Systems -->
  <script src="audio-control.js"></script>
  <script src="audio-gui.js"></script>
  
  <!-- Network Systems -->
  <script src="network.js"></script>
  <script src="network-state.js"></script>
  <script src="network-input.js"></script>
  
  <!-- Advanced Systems -->
  <script src="battle-royale-system.js"></script>
  <script src="system-checker.js"></script>
  <script src="enhanced-menu.js"></script>
  
  <!-- Main Game Logic -->
  <script src="main.js"></script>
</body>
</html>
```

### Step 2: Initialize All Systems

```javascript
// In your main.js or game init function

// 1. Audio System
AudioControl.init();
AudioGUI.init();

// 2. Touch Controls (auto-initializes on touch devices)
TouchControls.init();

// 3. Shape Editor
ShapeEditor.init();

// 4. System Checker
SystemChecker.init();

// 5. Game Mode Manager
GameModeManager.init(GameModeManager.Modes.FFA, {
  playerCount: 4,
  respawnEnabled: true,
  respawnDelay: 3.0,
});

// 6. Network (if multiplayer)
// Network.init() will be called when user hosts/joins

console.log('[Game] All systems initialized');
```

### Step 3: Game Loop Integration

```javascript
function gameLoop(deltaTime) {
  // 1. Update game mode logic
  GameModeManager.update(players, deltaTime);
  
  // 2. Sample player input
  const movement = TouchControls.getMovement();
  const aim = TouchControls.getAim();
  const fire = TouchControls.getFire(currentTime) || 
               TouchControls.hasPendingTapFire(performance.now());
  
  // 3. Update player
  player.vx += movement.x * SPEED * deltaTime;
  player.vy += movement.y * SPEED * deltaTime;
  
  if (aim.active) {
    player.aimX = aim.x;
    player.aimY = aim.y;
  }
  
  if (fire && shootCooldown <= 0) {
    spawnLaser(player);
    shootCooldown = LASER_COOLDOWN;
  }
  
  // 4. Check wall collisions
  GameModeManager.handleSliceWallCollision(
    player, 
    player.sliceIndex, 
    players.length, 
    arena
  );
  
  // 5. Update audio
  AudioControl.update(deltaTime);
  
  // 6. Network sync (if multiplayer)
  if (Network.isConnected()) {
    Network.update(deltaTime);
  }
}
```

### Step 4: Render Loop Integration

```javascript
function render(ctx) {
  // 1. Clear screen
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // 2. Draw game
  drawArena(ctx);
  drawPlayers(ctx);
  drawLasers(ctx);
  
  // 3. Draw touch controls (if active)
  TouchControls.render(ctx);
  
  // 4. Draw shape editor (if open)
  ShapeEditor.render(ctx, canvas.width, canvas.height);
  
  // 5. Draw credits (if open)
  Credits.render(ctx, canvas.width, canvas.height, deltaTime);
  
  // 6. Draw audio GUI
  AudioGUI.render(ctx);
  
  // 7. Draw system checker (if visible)
  SystemChecker.render(ctx);
}
```

---

## Game Mode Setup

### FFA Mode (Free-for-All)
```javascript
GameModeManager.init(GameModeManager.Modes.FFA, {
  playerCount: 4,
  respawnEnabled: true,
  respawnDelay: 3.0,
  invincibilityTime: 2.0,
});

GameModeManager.setupPlayers(players, arena);
```

### Battle Royale Mode
```javascript
GameModeManager.init(GameModeManager.Modes.BATTLE_ROYALE, {
  playerCount: 99,
  maxPlayers: 99,
  aiEnabled: true,
  aiCount: 91,
  respawnEnabled: false, // No respawns in BR
});

// Initialize Battle Royale system
BattleRoyale.init(players, arena);

GameModeManager.setupPlayers(players, arena);
```

### Custom Mode
```javascript
GameModeManager.init(GameModeManager.Modes.CUSTOM, {
  playerCount: 8,
  aiEnabled: true,
  aiCount: 4,
  respawnEnabled: true,
  respawnDelay: 5.0,
  aiRespawnInterval: 300.0, // 5 minutes
});

GameModeManager.setupPlayers(players, arena);
```

---

## Spawning & Respawning

### Manual Spawn
```javascript
// Spawn player at specific slice
GameModeManager.spawnPlayer(player, sliceIndex);
```

### Handle Death
```javascript
// When player dies
GameModeManager.handlePlayerDeath(player);
// Player will auto-respawn after delay
```

### Check Bounds
```javascript
// In update loop - prevents out-of-bounds
GameModeManager.checkBoundsAndRespawn(player, player.sliceIndex);
```

### AI Respawn (5-min fallback)
```javascript
// Auto-initialize for AI players
const aiPlayers = players.filter(p => p.isAI);
GameModeManager.initAIRespawnTimers(aiPlayers);
```

---

## Touch Controls Usage

### Check if Touch Device
```javascript
if (TouchControls.isTouchDevice()) {
  console.log('Touch controls available');
}
```

### Sample Touch Input
```javascript
// Movement (left side)
const move = TouchControls.getMovement();
// move = { x, y, magnitude }

// Aim (right side)
const aim = TouchControls.getAim();
// aim = { x, y, active }

// Fire (tap or hold)
const fire = TouchControls.getFire(currentTime);
const tapFire = TouchControls.hasPendingTapFire(performance.now());
```

### Customize Touch Settings
```javascript
TouchControls.setOpacity(0.5); // Joystick opacity
TouchControls.setDeadZone(0.2); // Dead zone threshold
```

---

## Shape Editor Usage

### Open Editor
```javascript
// Press E to open
ShapeEditor.state.isOpen = true;
```

### Get Current Shape
```javascript
const shipShape = ShapeEditor.getCurrentShape();
// Use shipShape.points to draw custom ship
```

### Apply Shape to Player
```javascript
const shape = ShapeEditor.getCurrentShape();
const transformed = ShapeEditor.transformShape(
  shape.points,
  rotation,
  scale
);

// Draw ship with custom shape
ctx.beginPath();
for (let i = 0; i < transformed.length; i++) {
  const p = transformed[i];
  const x = player.x + p.x * shipSize;
  const y = player.y + p.y * shipSize;
  if (i === 0) ctx.moveTo(x, y);
  else ctx.lineTo(x, y);
}
ctx.closePath();
ctx.stroke();
```

---

## Audio Integration

### Play Sound Effects
```javascript
// Laser fire
AudioControl.playSfx('laser_fire');

// Ricochet
AudioControl.playSfx('laser_ricochet');

// Boost
AudioControl.playSfx('boost');

// Explosion
AudioControl.playSfx('explosion');

// Menu click
AudioControl.playSfx('menu_click');
```

### Play Music
```javascript
// Start music track
AudioControl.playMusic('menu_theme');

// Crossfade to new track
AudioControl.crossfadeMusic('battle_theme', 2.0);

// Stop music
AudioControl.stopMusic();
```

### Volume Control
```javascript
// Master volume
AudioControl.setMasterVolume(0.8);

// Music volume
AudioControl.setMusicVolume(0.7);

// SFX volume
AudioControl.setSfxVolume(0.9);
```

### Audio Ducking
```javascript
// Auto-lower music during combat
AudioControl.setDuckingEnabled(true);

// Manual ducking
AudioControl.duck(0.5, 2.0); // Duck to 50% over 2 seconds
AudioControl.unduck(2.0); // Restore over 2 seconds
```

---

## Network Multiplayer

### Host Game
```javascript
Network.host({
  maxPlayers: 8,
  gameMode: 'FFA',
  roomName: 'My Game',
});

// Listen for peers
Network.onPeerJoin((peerId) => {
  console.log('Player joined:', peerId);
});
```

### Join Game
```javascript
Network.join(hostId, {
  playerName: 'Player1',
});

// Wait for connection
Network.onConnected(() => {
  console.log('Connected to host');
});
```

### Send/Receive Data
```javascript
// Send input
Network.sendInput({
  move: { x, y },
  aim: { x, y },
  fire: true,
});

// Receive state
Network.onStateUpdate((state) => {
  // Update players from network state
  updatePlayersFromNetwork(state.players);
});
```

---

## Credits & Documentation

### Open Credits
```javascript
// From menu
Credits.open();

// Handle input
window.addEventListener('keydown', (e) => {
  Credits.handleKeyboard(e);
});

window.addEventListener('click', (e) => {
  Credits.handleClick(mouseX, mouseY, canvas.width, canvas.height);
});
```

### Access Documentation
```javascript
// Programmatically open doc
const doc = Credits.docs[0]; // Shape Editor Guide
Credits.openDoc(doc);
```

---

## System Checker

### Validate Files
```javascript
// Check all files on boot
SystemChecker.validateFiles((results) => {
  if (results.errors.length > 0) {
    console.error('Missing files:', results.errors);
  }
});
```

### Check Version
```javascript
// Check for updates
SystemChecker.checkVersion((updateAvailable) => {
  if (updateAvailable) {
    console.log('Update available!');
  }
});
```

### Debug Overlay
```javascript
// Toggle with CapsLock + Tab
// Or programmatically:
SystemChecker.toggleDebug();
```

---

## Complete Example

```javascript
// main.js - Complete integration

let gameState = 'MENU'; // MENU, GAME, CREDITS
let players = [];
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Initialize all systems
function init() {
  AudioControl.init();
  AudioGUI.init();
  TouchControls.init();
  ShapeEditor.init();
  SystemChecker.init();
  
  GameModeManager.init(GameModeManager.Modes.FFA, {
    playerCount: 4,
    respawnEnabled: true,
  });
  
  // Create players
  players = createPlayers(4);
  
  // Setup spawning
  const arena = { cx: canvas.width / 2, cy: canvas.height / 2, r: 400 };
  GameModeManager.setupPlayers(players, arena);
  
  // Start game loop
  requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
  const deltaTime = calculateDeltaTime(timestamp);
  
  // Update
  if (gameState === 'GAME') {
    updateGame(deltaTime);
  }
  
  // Render
  render(ctx, deltaTime);
  
  requestAnimationFrame(gameLoop);
}

function updateGame(dt) {
  // Game mode logic
  GameModeManager.update(players, dt);
  
  // Player input
  const p1 = players[0];
  const move = TouchControls.getMovement();
  const aim = TouchControls.getAim();
  const fire = TouchControls.getFire(performance.now() / 1000);
  
  // Apply input
  p1.vx += move.x * 420 * dt;
  p1.vy += move.y * 420 * dt;
  
  if (aim.active) {
    p1.aimX = aim.x;
    p1.aimY = aim.y;
  }
  
  if (fire) {
    spawnLaser(p1);
    AudioControl.playSfx('laser_fire');
  }
  
  // Physics
  for (const player of players) {
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    
    // Wall collision
    GameModeManager.handleSliceWallCollision(
      player,
      player.sliceIndex,
      players.length,
      { cx: canvas.width / 2, cy: canvas.height / 2, r: 400 }
    );
  }
  
  // Audio
  AudioControl.update(dt);
}

function render(ctx, dt) {
  // Clear
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  if (gameState === 'GAME') {
    // Draw game
    drawArena(ctx);
    drawPlayers(ctx);
    
    // Overlays
    TouchControls.render(ctx);
    ShapeEditor.render(ctx, canvas.width, canvas.height);
    AudioGUI.render(ctx);
  } else if (gameState === 'CREDITS') {
    Credits.render(ctx, canvas.width, canvas.height, dt);
  }
}

// Start
init();
```

---

## Troubleshooting

### Touch Controls Not Working
- Check `TouchControls.isTouchDevice()` returns `true`
- Call `TouchControls.init()` manually if needed
- Verify touch events not blocked by CSS `touch-action`

### Spawning Issues
- Ensure `GameModeManager.setupPlayers()` called
- Check arena dimensions are valid
- Verify `sliceCount` matches player count

### Audio Not Playing
- Call `AudioControl.init()` after user gesture
- Check audio files exist in `/audio/` directory
- Verify browser supports Web Audio API

### Network Desync
- Ensure all clients use same game version
- Check network latency with `Network.getStats()`
- Verify state compression settings match

### Shape Editor Not Opening
- Press `E` to toggle editor
- Check `ShapeEditor.state.isOpen` value
- Verify init was called

---

## Performance Tips

1. **Limit AI Count**: Keep AI below 50 for smooth performance
2. **Audio Pooling**: Pre-load and reuse audio elements
3. **Network Throttling**: Use delta compression for state sync
4. **Shape Complexity**: Keep custom shapes under 16 vertices
5. **Touch Polling**: Sample input at 60Hz, not every frame

---

## API Quick Reference

### GameModeManager
- `init(mode, config)` - Initialize mode
- `setupPlayers(players, arena)` - Spawn all players
- `update(players, dt)` - Update logic
- `spawnPlayer(player, slice)` - Manual spawn
- `handlePlayerDeath(player)` - Queue respawn

### TouchControls
- `getMovement()` - Get move vector
- `getAim()` - Get aim vector
- `getFire(time)` - Check fire state
- `render(ctx)` - Draw joysticks

### ShapeEditor
- `getCurrentShape()` - Get active shape
- `transformShape(points, rot, scale)` - Apply transform
- `validateShape(points)` - Validate & fix
- `render(ctx, w, h)` - Draw editor

### AudioControl
- `playSfx(id)` - Play sound effect
- `playMusic(id)` - Play music track
- `setMasterVolume(vol)` - Set master volume
- `duck(level, duration)` - Duck audio

### Credits
- `open()` - Open credits
- `render(ctx, w, h, dt)` - Draw credits
- `openDoc(doc)` - Open documentation

---

**For detailed documentation, open the Credits page and click on any documentation link!**

© 2026 NEO-VECTR™ INC
