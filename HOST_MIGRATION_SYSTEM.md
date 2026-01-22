# HOST MIGRATION & VOTE TRANSFER SYSTEM
## NEO-VECTR ∞SNIP3 - Authoritative Multiplayer Architecture

---

## OVERVIEW

**Goal**: Implement peer-to-peer networking with one authoritative host ("source of truth") that can migrate seamlessly when needed.

**Use Cases**:
1. **Manual Transfer**: Players vote to change host (Settings menu)
2. **Automatic Migration**: Host disconnects/crashes → auto-promote next player
3. **Performance Migration**: Host has high latency → auto-migrate to better connection

---

## ARCHITECTURE

### Host Responsibilities (Authoritative)
The host is the **single source of truth** for:
- Game state (player positions, velocities, health, scores)
- Enemy spawns and AI behavior (∞SNIP3 mode)
- Seed generation and map barriers
- Hit detection and collision resolution
- Victory/elimination events
- Timer synchronization (game time, round time)

### Client Responsibilities
Clients send **inputs only**:
- Movement direction (WASD/stick)
- Aim direction (mouse/stick)
- Fire button state (held/released)
- Boost button state
- Charge level (for client-side prediction)

Clients receive **state updates** from host:
- Full game state at 20 Hz (50ms intervals)
- Player positions, velocities, alive status
- Laser positions, trajectories
- Enemy positions (∞SNIP3 mode)
- Score/lives/round state

---

## HOST MIGRATION PROCESS

### Phase 1: Detection (Trigger Event)
**Triggers:**
- Host disconnects (no heartbeat for 2 seconds)
- Host vote passes (>50% of players vote YES)
- Host latency >500ms for 10+ seconds (automatic quality failover)

### Phase 2: Freeze Game State
```javascript
function initiateHostMigration(reason) {
  log('WARN', `Host migration initiated: ${reason}`);
  
  // Freeze game immediately
  gameState.frozen = true;
  appMode = 'HOST_MIGRATION';
  
  // Save last known state
  migrationSnapshot = {
    players: JSON.parse(JSON.stringify(players)),
    lasers: JSON.parse(JSON.stringify(lasers)),
    enemies: JSON.parse(JSON.stringify(enemies)),
    score: playerScore.slice(),
    lives: playerLives.slice(),
    seed: currentSeed,
    gameTime: tSec,
    roundNumber: currentRound,
    timestamp: performance.now()
  };
  
  // Show migration UI
  showHostMigrationOverlay(reason);
}
```

### Phase 3: Select New Host
**Selection Algorithm** (deterministic, all clients compute same result):

```javascript
function selectNewHost(candidates) {
  // candidates = players who are still connected
  
  // Step 1: Filter by connection quality
  const goodConnections = candidates.filter(p => p.ping < 150 && p.packetLoss < 5);
  const pool = goodConnections.length > 0 ? goodConnections : candidates;
  
  // Step 2: Deterministic selection (lowest player ID wins)
  // All clients compute this identically, no voting needed
  pool.sort((a, b) => a.id - b.id);
  const newHost = pool[0];
  
  log('INFO', `New host selected: P${newHost.id + 1} (${newHost.ping}ms ping)`);
  return newHost;
}
```

### Phase 4: State Transfer
**If I am the new host:**
```javascript
function becomeHost(snapshot) {
  isHost = true;
  hostPlayerId = myPlayerId;
  
  // Restore game state from snapshot
  players = snapshot.players;
  lasers = snapshot.lasers;
  enemies = snapshot.enemies;
  playerScore = snapshot.score;
  playerLives = snapshot.lives;
  currentSeed = snapshot.seed;
  tSec = snapshot.gameTime;
  currentRound = snapshot.roundNumber;
  
  // Re-initialize RNG with saved seed
  setSeed(currentSeed);
  
  // Start broadcasting state to all clients
  startHostBroadcast();
  
  // Unfreeze game after 1 second (allow clients to reconnect)
  setTimeout(() => {
    gameState.frozen = false;
    appMode = 'GAME';
    log('INFO', 'Host migration complete - resuming game');
    hideHostMigrationOverlay();
  }, 1000);
}
```

**If I am still a client:**
```javascript
function connectToNewHost(newHostId) {
  hostPlayerId = newHostId;
  isHost = false;
  
  // Reconnect WebSocket/WebRTC to new host
  disconnectFromPeer(oldHostId);
  connectToPeer(newHostId);
  
  // Wait for state sync from new host
  waitingForStateSync = true;
  
  log('INFO', `Connected to new host: P${newHostId + 1}`);
}
```

### Phase 5: Resume Game
- New host broadcasts "MIGRATION_COMPLETE" message
- All clients receive full state update
- Game unfreezes simultaneously (timestamp-synchronized)
- 3-2-1 countdown overlay (optional, for fairness)

---

## VOTE TO TRANSFER HOST

### Settings Menu Integration
```javascript
function menuItemsSettings() {
  // ... existing settings ...
  
  // NEW: Host transfer section (only show in online multiplayer)
  if (isOnlineMultiplayer && playerCount > 1) {
    return [
      // ... existing items ...
      
      { kind:'divider', label: '— ONLINE LOBBY —' },
      
      { kind:'info', labelFn: () => `HOST: P${hostPlayerId + 1} ${isHost ? '(YOU)' : ''}` },
      
      { kind:'action', key:'voteHost', 
        labelFn: () => {
          if (isHost) return 'TRANSFER HOST (YOU ARE HOST)';
          if (hostTransferVote.active) {
            const yesVotes = hostTransferVote.votes.filter(v => v === true).length;
            const needed = Math.ceil(playerCount / 2);
            return `VOTE TO TRANSFER HOST (${yesVotes}/${needed})`;
          }
          return 'VOTE TO TRANSFER HOST';
        },
        action: () => {
          if (isHost) {
            // Host can voluntarily transfer
            const targetId = prompt(`Transfer host to which player? (1-${playerCount})`, '2');
            if (targetId === null) return;
            const id = parseInt(targetId, 10) - 1;
            if (id >= 0 && id < playerCount && id !== myPlayerId) {
              voluntaryHostTransfer(id);
            }
          } else {
            // Client initiates vote
            initiateHostTransferVote();
          }
        }
      },
      
      { kind:'toggle', key:'autoMigrate', 
        labelFn: () => `AUTO HOST MIGRATION: ${settings.autoHostMigration ? 'ON' : 'OFF'}`,
        action: () => { 
          settings.autoHostMigration = !settings.autoHostMigration; 
          saveSettings(); 
          log('INFO', `Auto host migration: ${settings.autoHostMigration ? 'ON' : 'OFF'}`);
        }
      },
      
      // ... rest of items ...
    ];
  }
}
```

### Vote System Implementation
```javascript
const hostTransferVote = {
  active: false,
  initiatorId: -1,
  votes: [], // true = yes, false = no, null = not voted
  startTime: 0,
  duration: 15000, // 15 seconds to vote
};

function initiateHostTransferVote() {
  if (hostTransferVote.active) {
    log('WARN', 'Vote already in progress');
    return;
  }
  
  // Broadcast vote request to all players
  broadcastMessage({
    type: 'HOST_TRANSFER_VOTE_START',
    initiatorId: myPlayerId,
    timestamp: performance.now()
  });
  
  hostTransferVote.active = true;
  hostTransferVote.initiatorId = myPlayerId;
  hostTransferVote.votes = Array(playerCount).fill(null);
  hostTransferVote.votes[myPlayerId] = true; // Initiator auto-votes YES
  hostTransferVote.startTime = performance.now();
  
  showVoteOverlay();
  
  log('INFO', `P${myPlayerId + 1} initiated host transfer vote`);
}

function castHostTransferVote(vote) {
  if (!hostTransferVote.active) return;
  
  hostTransferVote.votes[myPlayerId] = vote;
  
  // Broadcast my vote
  broadcastMessage({
    type: 'HOST_TRANSFER_VOTE_CAST',
    playerId: myPlayerId,
    vote: vote
  });
  
  checkVoteResult();
}

function checkVoteResult() {
  const yesVotes = hostTransferVote.votes.filter(v => v === true).length;
  const noVotes = hostTransferVote.votes.filter(v => v === false).length;
  const needed = Math.ceil(playerCount / 2); // Majority
  
  if (yesVotes >= needed) {
    // Vote passed!
    log('INFO', `Host transfer vote PASSED (${yesVotes}/${playerCount})`);
    endVote();
    initiateHostMigration('Vote passed by players');
  } else if (noVotes > playerCount - needed) {
    // Vote failed (not enough YES votes possible)
    log('INFO', `Host transfer vote FAILED (${yesVotes}/${playerCount})`);
    endVote();
  }
}

function updateVoteTimer(dt) {
  if (!hostTransferVote.active) return;
  
  const elapsed = performance.now() - hostTransferVote.startTime;
  if (elapsed >= hostTransferVote.duration) {
    // Vote expired
    log('INFO', 'Host transfer vote EXPIRED');
    checkVoteResult(); // Final tally
    endVote();
  }
}

function endVote() {
  hostTransferVote.active = false;
  hideVoteOverlay();
}
```

### Vote Overlay UI
```javascript
function drawVoteOverlay() {
  if (!hostTransferVote.active) return;
  
  const w = Math.min(canvas.width * 0.35, 400);
  const h = Math.min(canvas.height * 0.40, 280);
  const x = (canvas.width - w) / 2;
  const y = canvas.height * 0.25;
  
  // Background
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(x, y, w, h);
  
  // Border
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(255,180,80,0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  
  // Header
  ctx.globalCompositeOperation = 'source-over';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = '700 20px system-ui';
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fillText('TRANSFER HOST?', x + w/2, y + 15);
  
  // Initiator
  ctx.font = '600 14px system-ui';
  ctx.fillStyle = 'rgba(255,255,255,0.70)';
  ctx.fillText(`Initiated by P${hostTransferVote.initiatorId + 1}`, x + w/2, y + 45);
  
  // Timer
  const elapsed = performance.now() - hostTransferVote.startTime;
  const remaining = Math.max(0, Math.ceil((hostTransferVote.duration - elapsed) / 1000));
  ctx.fillStyle = 'rgba(255,180,80,0.85)';
  ctx.fillText(`Time remaining: ${remaining}s`, x + w/2, y + 70);
  
  // Vote tally
  const yesVotes = hostTransferVote.votes.filter(v => v === true).length;
  const noVotes = hostTransferVote.votes.filter(v => v === false).length;
  const needed = Math.ceil(playerCount / 2);
  
  ctx.font = '700 16px system-ui';
  ctx.fillStyle = 'rgba(80,255,140,0.95)';
  ctx.fillText(`YES: ${yesVotes}/${needed}`, x + w/2 - 60, y + 105);
  ctx.fillStyle = 'rgba(255,90,90,0.95)';
  ctx.fillText(`NO: ${noVotes}`, x + w/2 + 60, y + 105);
  
  // Player votes list
  ctx.font = '600 13px ui-monospace, monospace';
  ctx.textAlign = 'left';
  for (let i = 0; i < playerCount; i++) {
    const py = y + 140 + i * 20;
    const p = players[i];
    
    // Player number + color
    ctx.fillStyle = `rgb(${p.color.r},${p.color.g},${p.color.b})`;
    ctx.fillText(`P${i+1}`, x + 20, py);
    
    // Vote status
    const vote = hostTransferVote.votes[i];
    if (vote === true) {
      ctx.fillStyle = 'rgba(80,255,140,0.90)';
      ctx.fillText('YES', x + 60, py);
    } else if (vote === false) {
      ctx.fillStyle = 'rgba(255,90,90,0.90)';
      ctx.fillText('NO', x + 60, py);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillText('...', x + 60, py);
    }
  }
  
  // Instructions (if I haven't voted)
  if (hostTransferVote.votes[myPlayerId] === null) {
    ctx.textAlign = 'center';
    ctx.font = '600 14px system-ui';
    ctx.fillStyle = 'rgba(255,255,255,0.80)';
    ctx.fillText('Press Y for YES, N for NO', x + w/2, y + h - 25);
  }
}

// Add to keydown handler
window.addEventListener('keydown', (e) => {
  // ... existing code ...
  
  // Vote input
  if (hostTransferVote.active && hostTransferVote.votes[myPlayerId] === null) {
    if (e.key === 'y' || e.key === 'Y') {
      castHostTransferVote(true);
      playMenuSelectSfx();
    } else if (e.key === 'n' || e.key === 'N') {
      castHostTransferVote(false);
      playMenuSelectSfx();
    }
  }
});
```

---

## AUTOMATIC FAILOVER

### Heartbeat System
```javascript
const HEARTBEAT_INTERVAL = 1000; // Send heartbeat every 1s
const HEARTBEAT_TIMEOUT = 3000;  // Consider host dead after 3s silence

let lastHostHeartbeat = performance.now();
let heartbeatTimer = 0;

function sendHeartbeat() {
  if (!isHost) return;
  
  broadcastMessage({
    type: 'HEARTBEAT',
    hostId: myPlayerId,
    timestamp: performance.now(),
    gameTime: tSec
  });
}

function receiveHeartbeat(msg) {
  if (msg.hostId === hostPlayerId) {
    lastHostHeartbeat = performance.now();
  }
}

function checkHostAlive(dt) {
  if (isHost) {
    // I am host, send heartbeat
    heartbeatTimer += dt;
    if (heartbeatTimer >= HEARTBEAT_INTERVAL / 1000) {
      sendHeartbeat();
      heartbeatTimer = 0;
    }
  } else {
    // I am client, check if host is alive
    const timeSinceHeartbeat = performance.now() - lastHostHeartbeat;
    if (timeSinceHeartbeat > HEARTBEAT_TIMEOUT) {
      log('ERROR', `Host timeout (${timeSinceHeartbeat}ms since last heartbeat)`);
      initiateHostMigration('Host disconnected');
    }
  }
}
```

### Latency-Based Migration
```javascript
const HOST_LATENCY_THRESHOLD = 500; // 500ms+ = bad host
const HOST_LATENCY_GRACE_PERIOD = 10000; // 10s of bad latency before migration

let hostHighLatencyStart = 0;

function checkHostLatency() {
  if (isHost || !settings.autoHostMigration) return;
  
  const hostPing = getPlayerPing(hostPlayerId);
  
  if (hostPing > HOST_LATENCY_THRESHOLD) {
    if (hostHighLatencyStart === 0) {
      hostHighLatencyStart = performance.now();
      log('WARN', `Host latency high: ${hostPing}ms`);
    } else {
      const duration = performance.now() - hostHighLatencyStart;
      if (duration > HOST_LATENCY_GRACE_PERIOD) {
        log('ERROR', `Host latency consistently high (${hostPing}ms for ${duration}ms)`);
        initiateHostMigration('Host latency too high');
      }
    }
  } else {
    hostHighLatencyStart = 0; // Reset
  }
}
```

---

## MIGRATION OVERLAY

```javascript
function drawHostMigrationOverlay(reason) {
  const w = Math.min(canvas.width * 0.45, 500);
  const h = Math.min(canvas.height * 0.35, 250);
  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;
  
  // Background
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(0,0,0,0.90)';
  ctx.fillRect(x, y, w, h);
  
  // Border glow (orange warning)
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(255,180,80,0.55)';
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, w, h);
  
  // Header
  ctx.globalCompositeOperation = 'source-over';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 24px system-ui';
  ctx.fillStyle = 'rgba(255,180,80,0.95)';
  ctx.fillText('HOST MIGRATION', x + w/2, y + 40);
  
  // Reason
  ctx.font = '600 16px system-ui';
  ctx.fillStyle = 'rgba(255,255,255,0.80)';
  ctx.fillText(reason, x + w/2, y + 75);
  
  // Spinner animation
  const t = performance.now() * 0.001;
  const spinnerSize = 30;
  const spinnerY = y + h/2 + 10;
  
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 8; i++) {
    const angle = (t * 2 + i * Math.PI / 4) % (Math.PI * 2);
    const sx = x + w/2 + Math.cos(angle) * spinnerSize;
    const sy = spinnerY + Math.sin(angle) * spinnerSize;
    const alpha = 0.2 + 0.6 * ((i + Math.floor(t * 4)) % 8) / 8;
    
    ctx.fillStyle = `rgba(120,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Status text
  ctx.globalCompositeOperation = 'source-over';
  ctx.font = '600 14px system-ui';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText('Selecting new host...', x + w/2, y + h - 35);
}
```

---

## SETTINGS PERSISTENCE

```javascript
// Add to settings object
const settings = {
  // ... existing settings ...
  
  autoHostMigration: true,  // Enable automatic host migration
  preferredHostId: -1,      // -1 = auto, 0-7 = prefer specific player
};
```

---

## INTEGRATION CHECKLIST

### 1. Network Layer (WebRTC/WebSocket)
- [ ] Implement peer-to-peer connections
- [ ] Add message broadcasting system
- [ ] Add peer connection/disconnection detection
- [ ] Implement state synchronization (host → clients)
- [ ] Implement input forwarding (clients → host)

### 2. Game State Serialization
- [ ] Create `serializeGameState()` function
- [ ] Create `deserializeGameState()` function
- [ ] Test state snapshot/restore

### 3. Host Migration Logic
- [ ] Add `isHost` and `hostPlayerId` globals
- [ ] Implement `initiateHostMigration()`
- [ ] Implement `selectNewHost()`
- [ ] Implement `becomeHost()` and `connectToNewHost()`
- [ ] Add heartbeat system to step loop
- [ ] Add latency monitoring

### 4. Vote System
- [ ] Add vote UI to Settings menu
- [ ] Implement vote broadcasting/receiving
- [ ] Add vote overlay rendering
- [ ] Add Y/N keyboard input handling
- [ ] Test vote timeout/expiration

### 5. UI/UX
- [ ] Add host indicator to lobby overlay
- [ ] Add migration overlay rendering
- [ ] Add countdown after migration
- [ ] Add "Reconnecting..." state for dropped clients

### 6. Testing
- [ ] Test 2-player migration (host quits)
- [ ] Test 8-player migration (vote system)
- [ ] Test mid-game migration (preserve score/state)
- [ ] Test rapid migrations (host quits → new host quits)
- [ ] Test vote during migration (should cancel)

---

## EXAMPLE FLOW: HOST DISCONNECT

```plaintext
T+0s:   Host (P1) crashes
T+0.5s: All clients detect missing heartbeat
T+2s:   Clients trigger host migration
T+2.1s: All clients freeze game, save state snapshot
T+2.2s: All clients compute selectNewHost() → P2 wins (lowest ID)
T+2.3s: P2 becomes new host, restores state
T+2.4s: P2 broadcasts "I am host" + full state update
T+3s:   All clients receive state, reconnect to P2
T+3.5s: Game unfreezes, resumes from last known state
```

**Total migration time: ~1.5 seconds** (imperceptible to players if done right)

---

## NETWORK MESSAGE TYPES

```javascript
const MessageType = {
  // Input
  PLAYER_INPUT: 'PLAYER_INPUT',           // Client → Host
  
  // State sync
  GAME_STATE_UPDATE: 'GAME_STATE_UPDATE', // Host → Clients (20 Hz)
  GAME_EVENT: 'GAME_EVENT',               // Host → Clients (eliminations, scores, etc.)
  
  // Connection
  HEARTBEAT: 'HEARTBEAT',                 // Host → Clients (1 Hz)
  PING_REQUEST: 'PING_REQUEST',           // Bidirectional
  PING_RESPONSE: 'PING_RESPONSE',         // Bidirectional
  
  // Host migration
  HOST_MIGRATION_START: 'HOST_MIGRATION_START',
  HOST_MIGRATION_COMPLETE: 'HOST_MIGRATION_COMPLETE',
  NEW_HOST_ANNOUNCEMENT: 'NEW_HOST_ANNOUNCEMENT',
  
  // Vote system
  HOST_TRANSFER_VOTE_START: 'HOST_TRANSFER_VOTE_START',
  HOST_TRANSFER_VOTE_CAST: 'HOST_TRANSFER_VOTE_CAST',
  HOST_TRANSFER_VOTE_END: 'HOST_TRANSFER_VOTE_END',
};
```

---

## PRODUCTION CONSIDERATIONS

### Cheat Prevention
- All game logic runs on host (clients can't cheat position/score)
- Clients send inputs only (not actions/results)
- Host validates all inputs (e.g. can't fire if cooldown active)

### Graceful Degradation
- If WebRTC fails, fall back to WebSocket relay server
- If migration fails twice, show "Lobby disbanded" screen
- Auto-save game state every 5s (host disk cache) for crash recovery

### Performance
- State updates at 20 Hz (50ms) for smooth gameplay
- Delta compression (only send changed fields)
- Interpolation/prediction on clients (hide latency)

---

## FILES TO MODIFY

1. **audio/index_pie_slice_production_pause_settings_final_v3_spawnfix_v5.html**
   - Add host migration logic (lines ~500-650)
   - Add vote system (lines ~650-800)
   - Add overlays (after line 2037)
   - Add settings menu items (line ~2600)
   - Add network message handlers (new section)

2. **network.js** (NEW FILE)
   - WebRTC peer connection management
   - Message serialization/deserialization
   - State synchronization protocol

3. **README.md**
   - Document online multiplayer setup
   - Explain host migration to users

---

## ESTIMATED IMPLEMENTATION TIME

- **Network layer**: 12-16 hours
- **Host migration**: 6-8 hours
- **Vote system**: 3-4 hours
- **Testing**: 6-8 hours
- **Total**: ~30-36 hours

This is a **production-grade** multiplayer system similar to Castle Crashers, Call of Duty, and other AAA titles with seamless host migration.
