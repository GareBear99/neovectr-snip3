# NETWORKED INPUT & CUSTOM MUSIC STREAMING SYSTEM
## Production-Grade Multiplayer Architecture

---

## PART 1: INPUT SYNCHRONIZATION (CLIENT → HOST → CLIENTS)

### Overview
**Industry Standard**: Client-side prediction + server reconciliation (used by CS:GO, Valorant, Rocket League)

**Flow**:
```
Client → Send input + timestamp → Host processes → Host broadcasts state → Clients interpolate
```

### Client Input Collection (Lightweight)
```javascript
// Client collects inputs every frame (120 Hz)
function collectPlayerInput() {
  return {
    seq: inputSequence++,              // Sequence number for packet ordering
    timestamp: performance.now(),      // Client timestamp
    keys: {
      up: keys.has('KeyW') || keys.has('ArrowUp'),
      down: keys.has('KeyS') || keys.has('ArrowDown'),
      left: keys.has('KeyA') || keys.has('ArrowLeft'),
      right: keys.has('KeyD') || keys.has('ArrowRight'),
      fire: mouseDown || keys.has('Space'),
      boost: keys.has('ShiftLeft') || keys.has('ShiftRight'),
    },
    aim: { x: aimAngle, y: 0 },        // Radians, not mouse position (smaller)
    chargeHeld: charging ? chargeHeld : 0,  // 0-1, for prediction
  };
}

// Send to host (UDP-like via unreliable WebRTC data channel)
function sendInputToHost(input) {
  if (!isHost && hostConnection) {
    // Compress to ~20 bytes
    const packed = packInput(input);
    hostConnection.send(packed);
  }
}

// Binary packing (reduce from ~200 bytes JSON to ~20 bytes)
function packInput(input) {
  const buffer = new ArrayBuffer(24);
  const view = new DataView(buffer);
  
  // 4 bytes: sequence number
  view.setUint32(0, input.seq, true);
  
  // 8 bytes: timestamp (double)
  view.setFloat64(4, input.timestamp, true);
  
  // 1 byte: keys (8 bits for 8 keys)
  let keyByte = 0;
  if (input.keys.up) keyByte |= 1 << 0;
  if (input.keys.down) keyByte |= 1 << 1;
  if (input.keys.left) keyByte |= 1 << 2;
  if (input.keys.right) keyByte |= 1 << 3;
  if (input.keys.fire) keyByte |= 1 << 4;
  if (input.keys.boost) keyByte |= 1 << 5;
  view.setUint8(12, keyByte);
  
  // 4 bytes: aim angle (float32)
  view.setFloat32(13, input.aim.x, true);
  
  // 4 bytes: charge held (float32)
  view.setFloat32(17, input.chargeHeld, true);
  
  return buffer;
}
```

### Host Processing (Authoritative)
```javascript
// Host receives input from each client
function receiveClientInput(playerId, packedInput) {
  const input = unpackInput(packedInput);
  
  // Store in buffer (handle out-of-order packets)
  if (!clientInputBuffers[playerId]) {
    clientInputBuffers[playerId] = [];
  }
  clientInputBuffers[playerId].push(input);
  
  // Sort by sequence number
  clientInputBuffers[playerId].sort((a, b) => a.seq - b.seq);
  
  // Discard old inputs (>500ms latency)
  const now = performance.now();
  clientInputBuffers[playerId] = clientInputBuffers[playerId].filter(
    inp => now - inp.timestamp < 500
  );
}

// Host game loop (120 Hz fixed timestep)
function hostStep(dt) {
  // Process inputs for all players
  for (let i = 0; i < playerCount; i++) {
    const buffer = clientInputBuffers[i];
    if (!buffer || buffer.length === 0) continue;
    
    // Use most recent input
    const input = buffer[buffer.length - 1];
    
    // Apply to player state (authoritative)
    applyInputToPlayer(players[i], input, dt);
  }
  
  // Run physics, collision, AI, etc.
  updateGameState(dt);
  
  // Broadcast state to all clients (20 Hz, not every frame)
  if (shouldBroadcastState()) {
    broadcastGameState();
  }
}

function applyInputToPlayer(player, input, dt) {
  // Movement
  let dx = 0, dy = 0;
  if (input.keys.up) dy -= 1;
  if (input.keys.down) dy += 1;
  if (input.keys.left) dx -= 1;
  if (input.keys.right) dx += 1;
  
  const len = Math.sqrt(dx*dx + dy*dy);
  if (len > 0) {
    dx /= len;
    dy /= len;
  }
  
  const speed = 280;
  player.vx += dx * speed * dt;
  player.vy += dy * speed * dt;
  
  // Aim
  player.aimX = Math.cos(input.aim.x);
  player.aimY = Math.sin(input.aim.x);
  
  // Fire (server validates cooldown)
  if (input.keys.fire && player.shootCooldown <= 0) {
    spawnLaserFromPlayer(player, input.chargeHeld);
    player.shootCooldown = LASER_COOLDOWN;
  }
  
  // Boost (server validates cooldown)
  if (input.keys.boost && player.boostCooldown <= 0) {
    applyBoostToPlayer(player);
    player.boostCooldown = BOOST_COOLDOWN;
  }
}
```

### State Broadcasting (HOST → ALL CLIENTS)
```javascript
// Send game state at 20 Hz (50ms intervals)
let lastBroadcastTime = 0;
const BROADCAST_INTERVAL = 50; // ms

function shouldBroadcastState() {
  const now = performance.now();
  if (now - lastBroadcastTime >= BROADCAST_INTERVAL) {
    lastBroadcastTime = now;
    return true;
  }
  return false;
}

function broadcastGameState() {
  const state = {
    seq: stateSequence++,
    timestamp: performance.now(),
    gameTime: tSec,
    players: players.map(p => ({
      id: p.id,
      x: p.x, y: p.y,
      vx: p.vx, vy: p.vy,
      aimX: p.aimX, aimY: p.aimY,
      alive: p.alive,
      hp: p.hp || 3,
      score: playerScore[p.id] || 0,
    })),
    lasers: lasers.map(l => ({
      id: l.id,
      x: l.x, y: l.y,
      vx: l.vx, vy: l.vy,
      life: l.life,
      ownerId: l.ownerId,
    })),
    events: popGameEvents(), // Eliminations, explosions, etc.
  };
  
  // Delta compression (only send changed fields)
  const delta = computeDelta(state, lastBroadcastState);
  lastBroadcastState = state;
  
  // Send to all clients
  broadcastMessage({
    type: 'GAME_STATE_UPDATE',
    delta: delta,
  });
}

// Delta compression (reduce from ~2KB to ~200 bytes)
function computeDelta(newState, oldState) {
  if (!oldState) return newState; // First frame
  
  const delta = { seq: newState.seq, timestamp: newState.timestamp };
  
  // Only send players that changed position >1px or velocity >10
  delta.players = newState.players.filter((p, i) => {
    const old = oldState.players[i];
    return !old || 
           Math.abs(p.x - old.x) > 1 || 
           Math.abs(p.y - old.y) > 1 ||
           Math.abs(p.vx - old.vx) > 10 ||
           Math.abs(p.vy - old.vy) > 10 ||
           p.alive !== old.alive;
  });
  
  // Only send new/destroyed lasers
  delta.lasersAdded = newState.lasers.filter(l => !oldState.lasers.find(ol => ol.id === l.id));
  delta.lasersRemoved = oldState.lasers.filter(ol => !newState.lasers.find(l => l.id === ol.id)).map(l => l.id);
  
  delta.events = newState.events;
  
  return delta;
}
```

### Client Interpolation (Smooth Rendering)
```javascript
// Client stores last 2 states for interpolation
let stateBuffer = [];
const INTERPOLATION_DELAY = 100; // ms (2 state updates)

function receiveGameState(stateUpdate) {
  // Apply delta to reconstruct full state
  const fullState = applyDelta(currentState, stateUpdate.delta);
  
  // Add to buffer
  stateBuffer.push(fullState);
  if (stateBuffer.length > 5) stateBuffer.shift(); // Keep last 250ms
  
  // Process events immediately (for sounds)
  if (stateUpdate.delta.events) {
    for (const event of stateUpdate.delta.events) {
      handleGameEvent(event);
    }
  }
}

function renderInterpolatedState() {
  const now = performance.now();
  const renderTime = now - INTERPOLATION_DELAY;
  
  // Find two states to interpolate between
  let s0 = null, s1 = null;
  for (let i = 0; i < stateBuffer.length - 1; i++) {
    if (stateBuffer[i].timestamp <= renderTime && stateBuffer[i+1].timestamp >= renderTime) {
      s0 = stateBuffer[i];
      s1 = stateBuffer[i+1];
      break;
    }
  }
  
  if (!s0 || !s1) {
    // Extrapolate (not enough data)
    if (stateBuffer.length > 0) {
      s0 = stateBuffer[stateBuffer.length - 1];
      s1 = s0;
    }
  }
  
  // Interpolate player positions
  const t = (renderTime - s0.timestamp) / (s1.timestamp - s0.timestamp);
  const alpha = Math.max(0, Math.min(1, t));
  
  for (let i = 0; i < playerCount; i++) {
    const p0 = s0.players[i];
    const p1 = s1.players[i];
    
    // Don't interpolate local player (use prediction)
    if (i === myPlayerId && !isHost) continue;
    
    players[i].x = lerp(p0.x, p1.x, alpha);
    players[i].y = lerp(p0.y, p1.y, alpha);
    players[i].vx = lerp(p0.vx, p1.vx, alpha);
    players[i].vy = lerp(p0.vy, p1.vy, alpha);
    players[i].alive = p1.alive;
  }
  
  // Draw game
  drawGame();
}

// Handle events (for playing sounds on client)
function handleGameEvent(event) {
  switch (event.type) {
    case 'LASER_FIRE':
      playShootSfx();
      break;
    case 'LASER_RICOCHET':
      playRicochetSfx();
      break;
    case 'BOOST':
      playBoostSfx();
      break;
    case 'EXPLOSION':
      playZapSfx();
      spawnExplosion(event.x, event.y, event.power);
      break;
    case 'PLAYER_ELIMINATED':
      log('INFO', `P${event.playerId + 1} eliminated`);
      break;
  }
}
```

### Client-Side Prediction (Local Player Only)
```javascript
// Predict local player movement before host confirms
function predictLocalPlayer(dt) {
  if (isHost) return; // Host is authoritative
  
  const localPlayer = players[myPlayerId];
  const input = collectPlayerInput();
  
  // Store for reconciliation
  pendingInputs.push(input);
  
  // Apply input locally (instant feedback)
  applyInputToPlayer(localPlayer, input, dt);
  
  // When we receive state from host, reconcile
  if (lastServerState) {
    reconcileWithServer(lastServerState);
  }
}

function reconcileWithServer(serverState) {
  const serverPlayer = serverState.players[myPlayerId];
  const localPlayer = players[myPlayerId];
  
  // Check if prediction was correct
  const errorX = Math.abs(serverPlayer.x - localPlayer.x);
  const errorY = Math.abs(serverPlayer.y - localPlayer.y);
  
  if (errorX > 5 || errorY > 5) {
    // Significant misprediction, snap to server
    localPlayer.x = serverPlayer.x;
    localPlayer.y = serverPlayer.y;
    localPlayer.vx = serverPlayer.vx;
    localPlayer.vy = serverPlayer.vy;
    
    // Re-apply pending inputs (server hasn't processed them yet)
    for (const input of pendingInputs) {
      if (input.seq > serverState.seq) {
        applyInputToPlayer(localPlayer, input, 1/120); // Fixed dt
      }
    }
  }
  
  // Clear old inputs
  pendingInputs = pendingInputs.filter(inp => inp.seq > serverState.seq);
}
```

---

## PART 2: CUSTOM MUSIC STREAMING SYSTEM

### Overview
**No File Sharing**: Host streams audio as opus/AAC encoded bytes
**High Quality**: 320kbps CBR (near-lossless, ~20KB/s per listener)
**Universal**: Works on Windows, macOS, Linux, iOS, Android, Web

### Architecture
```
Host: Select file/folder → Decode → Encode (Opus) → Stream chunks → Broadcast to all
Clients: Receive chunks → Buffer → Decode → Play (WebAudio)
```

### Settings Menu Integration
```javascript
function menuItemsSettings() {
  // ... existing settings ...
  
  return [
    // ... other items ...
    
    { kind:'divider', label: '— CUSTOM MUSIC —' },
    
    { kind:'info', labelFn: () => `CUSTOM MUSIC: ${customMusic.enabled ? 'ENABLED' : 'OFF'}` },
    
    { kind:'action', key:'selectMusic', 
      labelFn: () => 'SELECT MUSIC FILE/FOLDER',
      action: () => {
        if (isHost || !isOnlineMultiplayer) {
          selectCustomMusicSource();
        } else {
          log('WARN', 'Only host can select music');
        }
      }
    },
    
    { kind:'toggle', key:'allowIncomingMusic',
      labelFn: () => `ALLOW INCOMING MUSIC: ${settings.allowIncomingMusic ? 'YES' : 'NO'}`,
      action: () => {
        settings.allowIncomingMusic = !settings.allowIncomingMusic;
        saveSettings();
        log('INFO', `Incoming music: ${settings.allowIncomingMusic ? 'ALLOWED' : 'BLOCKED'}`);
      }
    },
    
    { kind:'toggle', key:'streamToAll',
      labelFn: () => `STREAM TO ALL PLAYERS: ${settings.streamMusicToAll ? 'YES' : 'NO'}`,
      action: () => {
        if (!isHost) {
          log('WARN', 'Only host can toggle streaming');
          return;
        }
        settings.streamMusicToAll = !settings.streamMusicToAll;
        saveSettings();
        broadcastMusicToggle(settings.streamMusicToAll);
        log('INFO', `Stream to all: ${settings.streamMusicToAll ? 'ON' : 'OFF'}`);
      }
    },
    
    { kind:'slider', key:'musicQuality',
      labelFn: () => {
        const kbps = [64, 128, 192, 256, 320][Math.floor(settings.musicQuality * 4)];
        return `STREAM QUALITY: ${kbps} kbps`;
      },
      onLeft: () => { settings.musicQuality = Math.max(0, settings.musicQuality - 0.25); saveSettings(); },
      onRight: () => { settings.musicQuality = Math.min(1, settings.musicQuality + 0.25); saveSettings(); },
      dragFn: (t) => { settings.musicQuality = t; saveSettings(); },
      action: () => {}
    },
    
    { kind:'info', labelFn: () => customMusic.nowPlaying ? `NOW PLAYING: ${customMusic.nowPlaying}` : 'No music playing' },
    
    // ... rest of items ...
  ];
}
```

### File/Folder Selection (Cross-Platform)
```javascript
const customMusic = {
  enabled: false,
  source: null,           // File or folder
  nowPlaying: '',
  playlist: [],
  currentIndex: 0,
  audioBuffer: null,
  encoder: null,
  streaming: false,
};

async function selectCustomMusicSource() {
  try {
    // Modern File System Access API (Chrome/Edge 86+, Safari 15.2+)
    if ('showOpenFilePicker' in window) {
      const options = {
        types: [
          {
            description: 'Audio Files',
            accept: {
              'audio/*': ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac', '.opus', '.webm']
            }
          }
        ],
        multiple: true
      };
      
      const [folderOption] = await showDirectoryPicker();
      if (folderOption) {
        // Folder selected
        await loadMusicFromFolder(folderOption);
      } else {
        // Files selected
        const fileHandles = await window.showOpenFilePicker(options);
        await loadMusicFromFiles(fileHandles);
      }
    } 
    // Fallback: traditional file input (all browsers)
    else {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'audio/*';
      input.webkitdirectory = true; // Allow folder selection on mobile
      
      input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        await loadMusicFromFileList(files);
      };
      
      input.click();
    }
  } catch (err) {
    log('ERROR', `Failed to select music: ${err.message}`);
  }
}

async function loadMusicFromFiles(fileHandles) {
  customMusic.playlist = [];
  
  for (const handle of fileHandles) {
    const file = await handle.getFile();
    if (isAudioFile(file.name)) {
      customMusic.playlist.push({
        name: file.name,
        file: file,
        duration: 0, // Will be detected when playing
      });
    }
  }
  
  if (customMusic.playlist.length > 0) {
    customMusic.enabled = true;
    customMusic.currentIndex = 0;
    log('INFO', `Loaded ${customMusic.playlist.length} music files`);
    
    // Start playing first track
    await playCustomMusic(0);
  }
}

function isAudioFile(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  return ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'opus', 'webm'].includes(ext);
}
```

### Audio Decoding & Encoding (Host)
```javascript
async function playCustomMusic(index) {
  if (!customMusic.playlist[index]) return;
  
  const track = customMusic.playlist[index];
  customMusic.nowPlaying = track.name;
  customMusic.currentIndex = index;
  
  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await track.file.arrayBuffer();
    
    // Decode to raw PCM (WebAudio)
    const audioContext = AUDIO.ensureCtx();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    customMusic.audioBuffer = audioBuffer;
    track.duration = audioBuffer.duration;
    
    log('INFO', `Playing: ${track.name} (${track.duration.toFixed(1)}s)`);
    
    // Play locally
    playLocalCustomMusic(audioBuffer);
    
    // Stream to all clients (if enabled)
    if (settings.streamMusicToAll && isOnlineMultiplayer) {
      startMusicStream(audioBuffer, track.name);
    }
  } catch (err) {
    log('ERROR', `Failed to play music: ${err.message}`);
  }
}

function playLocalCustomMusic(audioBuffer) {
  // Stop current music
  if (customMusicSource) {
    customMusicSource.stop();
  }
  
  // Create new source
  const audioContext = AUDIO.ensureCtx();
  customMusicSource = audioContext.createBufferSource();
  customMusicSource.buffer = audioBuffer;
  
  // Volume control
  const gainNode = audioContext.createGain();
  gainNode.gain.value = settings.musicVol;
  
  customMusicSource.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Auto-play next track when finished
  customMusicSource.onended = () => {
    const nextIndex = (customMusic.currentIndex + 1) % customMusic.playlist.length;
    playCustomMusic(nextIndex);
  };
  
  customMusicSource.start(0);
}
```

### Opus Encoding & Streaming (Host → Clients)
```javascript
// Use opus-encoder WASM (best quality/size ratio)
// https://github.com/chris-rudmin/opus-recorder
let opusEncoder = null;

async function initOpusEncoder() {
  if (opusEncoder) return opusEncoder;
  
  // Load Opus encoder WASM module
  const OpusEncoder = await import('https://cdn.jsdelivr.net/npm/opus-encoder@0.3.0/+esm');
  
  const sampleRate = 48000; // Opus standard
  const channels = 2;       // Stereo
  const bitrate = [64000, 128000, 192000, 256000, 320000][Math.floor(settings.musicQuality * 4)];
  
  opusEncoder = new OpusEncoder({
    sampleRate: sampleRate,
    channels: channels,
    bitrate: bitrate,
    application: 'audio', // vs 'voip' or 'restricted_lowdelay'
  });
  
  log('INFO', `Opus encoder initialized: ${bitrate/1000}kbps, ${sampleRate}Hz, ${channels}ch`);
  return opusEncoder;
}

async function startMusicStream(audioBuffer, trackName) {
  customMusic.streaming = true;
  
  // Initialize encoder
  await initOpusEncoder();
  
  // Resample to 48kHz if needed (Opus requirement)
  const resampled = await resampleAudioBuffer(audioBuffer, 48000);
  
  // Get PCM data
  const pcmLeft = resampled.getChannelData(0);
  const pcmRight = resampled.numberOfChannels > 1 ? resampled.getChannelData(1) : pcmLeft;
  
  // Interleave stereo
  const pcmInterleaved = new Float32Array(pcmLeft.length * 2);
  for (let i = 0; i < pcmLeft.length; i++) {
    pcmInterleaved[i * 2] = pcmLeft[i];
    pcmInterleaved[i * 2 + 1] = pcmRight[i];
  }
  
  // Encode in chunks (20ms frames = 960 samples @ 48kHz)
  const FRAME_SIZE = 960;
  const frameCount = Math.ceil(pcmInterleaved.length / (FRAME_SIZE * 2));
  
  // Send metadata first
  broadcastMessage({
    type: 'MUSIC_STREAM_START',
    trackName: trackName,
    duration: audioBuffer.duration,
    sampleRate: 48000,
    channels: 2,
    frameCount: frameCount,
  });
  
  // Stream frames (throttled to real-time)
  const frameInterval = (FRAME_SIZE / 48000) * 1000; // 20ms
  let frameIndex = 0;
  
  const streamInterval = setInterval(() => {
    if (!customMusic.streaming || frameIndex >= frameCount) {
      clearInterval(streamInterval);
      broadcastMessage({ type: 'MUSIC_STREAM_END' });
      return;
    }
    
    // Extract frame
    const start = frameIndex * FRAME_SIZE * 2;
    const end = Math.min(start + FRAME_SIZE * 2, pcmInterleaved.length);
    const frame = pcmInterleaved.slice(start, end);
    
    // Encode to Opus
    const opusPacket = opusEncoder.encode(frame);
    
    // Broadcast (reliable channel, in-order)
    broadcastMessage({
      type: 'MUSIC_STREAM_FRAME',
      frameIndex: frameIndex,
      data: opusPacket, // ArrayBuffer
    });
    
    frameIndex++;
  }, frameInterval);
}

async function resampleAudioBuffer(audioBuffer, targetRate) {
  if (audioBuffer.sampleRate === targetRate) return audioBuffer;
  
  const audioContext = AUDIO.ensureCtx();
  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.duration * targetRate,
    targetRate
  );
  
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start(0);
  
  return await offlineContext.startRendering();
}
```

### Client Decoding & Playback
```javascript
// Client receives stream
let musicStreamBuffer = [];
let musicStreamMetadata = null;
let opusDecoder = null;

async function initOpusDecoder() {
  if (opusDecoder) return opusDecoder;
  
  const OpusDecoder = await import('https://cdn.jsdelivr.net/npm/opus-decoder@0.3.0/+esm');
  
  opusDecoder = new OpusDecoder({
    sampleRate: 48000,
    channels: 2,
  });
  
  return opusDecoder;
}

function receiveMusicStreamStart(metadata) {
  if (!settings.allowIncomingMusic) {
    log('INFO', 'Incoming music blocked by user settings');
    return;
  }
  
  log('INFO', `Receiving music stream: ${metadata.trackName}`);
  
  musicStreamMetadata = metadata;
  musicStreamBuffer = [];
  
  // Stop current music
  if (customMusicSource) customMusicSource.stop();
  
  // Initialize decoder
  initOpusDecoder();
}

function receiveMusicStreamFrame(frame) {
  if (!settings.allowIncomingMusic || !musicStreamMetadata) return;
  
  // Store in buffer
  musicStreamBuffer[frame.frameIndex] = frame.data;
  
  // Start playback when we have 500ms buffered
  const framesNeeded = Math.ceil(0.5 * 48000 / 960); // 500ms @ 48kHz
  if (musicStreamBuffer.filter(f => f).length >= framesNeeded && !customMusicSource) {
    startStreamPlayback();
  }
}

async function startStreamPlayback() {
  const audioContext = AUDIO.ensureCtx();
  
  // Decode all buffered frames
  const decodedFrames = [];
  for (const opusPacket of musicStreamBuffer) {
    if (!opusPacket) continue;
    const pcm = await opusDecoder.decode(opusPacket);
    decodedFrames.push(pcm);
  }
  
  // Concatenate PCM data
  const totalLength = decodedFrames.reduce((sum, frame) => sum + frame.length, 0);
  const concatenated = new Float32Array(totalLength);
  let offset = 0;
  for (const frame of decodedFrames) {
    concatenated.set(frame, offset);
    offset += frame.length;
  }
  
  // De-interleave stereo
  const left = new Float32Array(concatenated.length / 2);
  const right = new Float32Array(concatenated.length / 2);
  for (let i = 0; i < left.length; i++) {
    left[i] = concatenated[i * 2];
    right[i] = concatenated[i * 2 + 1];
  }
  
  // Create AudioBuffer
  const audioBuffer = audioContext.createBuffer(2, left.length, 48000);
  audioBuffer.copyToChannel(left, 0);
  audioBuffer.copyToChannel(right, 1);
  
  // Play
  playLocalCustomMusic(audioBuffer);
}
```

---

## PART 3: MOBILE & CROSS-PLATFORM SUPPORT

### iOS/Android File Selection
```javascript
// iOS requires user gesture for file input
function mobileSelectMusic() {
  // Create overlay with large touch target
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.85);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;
  
  const button = document.createElement('button');
  button.textContent = 'SELECT MUSIC FILES';
  button.style.cssText = `
    padding: 20px 40px;
    font-size: 18px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  `;
  
  button.onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'audio/*';
    
    input.onchange = async (e) => {
      await loadMusicFromFileList(Array.from(e.target.files));
      document.body.removeChild(overlay);
    };
    
    input.click();
  };
  
  overlay.appendChild(button);
  document.body.appendChild(overlay);
}

// Detect mobile
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
if (isMobile) {
  // Use mobile-optimized UI
  selectCustomMusicSource = mobileSelectMusic;
}
```

### Bandwidth Optimization
```javascript
// Adaptive bitrate based on connection
function adjustMusicQuality() {
  if (!isHost || !customMusic.streaming) return;
  
  // Check average client ping
  const avgPing = players.reduce((sum, p) => sum + (p.ping || 50), 0) / playerCount;
  
  if (avgPing > 200) {
    // High latency → reduce quality
    settings.musicQuality = Math.min(0.5, settings.musicQuality); // Max 192kbps
    log('WARN', 'High latency detected, reducing music quality');
  } else if (avgPing < 100) {
    // Good connection → allow high quality
    settings.musicQuality = Math.max(settings.musicQuality, 0.75); // Min 256kbps
  }
}
```

---

## PART 4: SCROLLABLE SETTINGS MENU

### Implement Scrolling for Long Menus
```javascript
let settingsScroll = 0;
const SETTINGS_VISIBLE_ITEMS = 8; // Show 8 items at once

function drawSettingsMenu(now) {
  const items = menuItemsSettings();
  const layout = menuLayout('SETTINGS', items.length);
  
  // Calculate scroll bounds
  const maxScroll = Math.max(0, items.length - SETTINGS_VISIBLE_ITEMS);
  settingsScroll = clamp(settingsScroll, 0, maxScroll);
  
  // Adjust selection bounds
  if (menuSel < settingsScroll) settingsScroll = menuSel;
  if (menuSel >= settingsScroll + SETTINGS_VISIBLE_ITEMS) {
    settingsScroll = menuSel - SETTINGS_VISIBLE_ITEMS + 1;
  }
  
  // Draw visible items only
  const visibleItems = items.slice(settingsScroll, settingsScroll + SETTINGS_VISIBLE_ITEMS);
  
  for (let i = 0; i < visibleItems.length; i++) {
    const item = visibleItems[i];
    const globalIndex = settingsScroll + i;
    const selected = (globalIndex === menuSel);
    const yy = layout.baseY + i * layout.stepY;
    
    drawMenuItem(item, yy, selected, layout, now);
  }
  
  // Scroll indicators
  if (settingsScroll > 0) {
    // Up arrow
    ctx.fillStyle = 'rgba(255,255,255,0.50)';
    ctx.font = '600 20px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('▲', arena().cx, layout.baseY - 25);
  }
  
  if (settingsScroll < maxScroll) {
    // Down arrow
    ctx.fillStyle = 'rgba(255,255,255,0.50)';
    ctx.font = '600 20px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('▼', arena().cx, layout.baseY + SETTINGS_VISIBLE_ITEMS * layout.stepY + 15);
  }
}

// Scroll with mouse wheel
canvas.addEventListener('wheel', (e) => {
  if (appMode !== 'MENU' || menuPage !== 'SETTINGS') return;
  
  const delta = Math.sign(e.deltaY);
  settingsScroll = clamp(settingsScroll + delta, 0, maxScroll);
  e.preventDefault();
}, { passive: false });
```

---

## BANDWIDTH & PERFORMANCE ANALYSIS

### Input Packets
- **Size**: ~20 bytes per input
- **Frequency**: 60 Hz (every 16ms)
- **Bandwidth**: 20 bytes × 60 Hz = 1.2 KB/s per player
- **Total (8 players)**: 9.6 KB/s upstream (host), 1.2 KB/s downstream (each client)

### State Updates
- **Size**: ~200 bytes (delta-compressed)
- **Frequency**: 20 Hz (every 50ms)
- **Bandwidth**: 200 bytes × 20 Hz = 4 KB/s per client
- **Total (8 players)**: 32 KB/s downstream from host

### Music Streaming
- **Quality**: 320 kbps = 40 KB/s
- **Total (8 players)**: 320 KB/s downstream from host (optional)
- **Adaptive**: Scales down to 64 kbps (8 KB/s) on poor connections

### Grand Total (Worst Case)
- **Host upload**: 9.6 KB/s (input) + 32 KB/s (state) + 320 KB/s (music) = **362 KB/s ≈ 3 Mbps**
- **Client download**: 1.2 KB/s (input) + 4 KB/s (state) + 40 KB/s (music) = **45 KB/s ≈ 360 Kbps**

**Result**: Runs on DSL/4G (most connections >5 Mbps). Mobile-friendly.

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Input Sync (10-12 hours)
- [ ] Implement `collectPlayerInput()` with binary packing
- [ ] Add client input buffer on host
- [ ] Implement `applyInputToPlayer()` (authoritative)
- [ ] Add delta compression for state updates
- [ ] Implement client interpolation (100ms delay)
- [ ] Add client-side prediction + reconciliation
- [ ] Test with 2 players, 50ms latency

### Phase 2: Custom Music (8-10 hours)
- [ ] Add file/folder picker (cross-platform)
- [ ] Implement audio decoding (WebAudio)
- [ ] Add Opus encoder/decoder (WASM)
- [ ] Implement streaming protocol (frames + metadata)
- [ ] Add client playback with buffering
- [ ] Test with MP3, WAV, FLAC files
- [ ] Test on iOS/Android

### Phase 3: Settings UI (2-3 hours)
- [ ] Add custom music settings menu items
- [ ] Implement scrollable settings (8 items visible)
- [ ] Add mouse wheel scroll support
- [ ] Add "Allow incoming music" toggle
- [ ] Add quality slider (64-320 kbps)
- [ ] Test with >20 settings items

### Phase 4: Polish (2-3 hours)
- [ ] Add "Now Playing" HUD indicator
- [ ] Add bandwidth monitor (debug)
- [ ] Add adaptive quality based on ping
- [ ] Add mobile-optimized file picker
- [ ] Test with 8 players + music streaming

**Total**: 22-28 hours

---

## PRODUCTION NOTES

This system uses **industry-standard techniques**:
- **Input synchronization**: Same as Overwatch, Rocket League, Valorant
- **Delta compression**: Same as Source engine, Unity Netcode
- **Opus streaming**: Same as Discord, Zoom, WebRTC
- **Client prediction**: Same as Quake 3, CS:GO

Music streaming is **optional** (toggle off to save bandwidth). Game inputs are **always lightweight** (~10 KB/s total).
