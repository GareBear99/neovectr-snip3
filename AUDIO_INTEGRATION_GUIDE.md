# 🎵 NEO-VECTR ∞SNIP3 - AUDIO SYSTEM INTEGRATION GUIDE

**Music by TRNDSTR** | Advanced Audio Control System

---

## 📦 What You're Integrating

**3 Files** (~1,400 lines of heavily commented code):
1. `audio-control.js` - Core audio engine (677 lines)
2. `audio-gui.js` - Visual controls (622 lines)
3. `CREDITS.md` - Attribution and documentation (95 lines)

**Features**:
- Master + per-category volume control
- 6 sound categories with toggles
- Music player with playlist support
- Crossfade, ducking, spatial audio
- Clean neon GUI matching game aesthetic
- TRNDSTR music attribution

---

## 🚀 Quick Start (15 Minutes)

### Step 1: Add Script Tags (2 minutes)

Add to your HTML file, **before your main game script**:

```html
<!-- Audio Control System -->
<script src="audio-control.js"></script>
<script src="audio-gui.js"></script>

<!-- Your game script -->
<script src="game.js"></script>
```

### Step 2: Initialize Audio System (3 minutes)

At the start of your game (on first user interaction):

```javascript
// In your game initialization (e.g., menu screen click)
async function initGame() {
  // Initialize audio system (must be on user interaction)
  await AudioControl.initAudioSystem();
  
  // Start menu music (TRNDSTR track)
  AudioControl.playMusic('menuMusic');
  
  // Continue with game init...
}
```

### Step 3: Load Your Audio Files (5 minutes)

Edit `audio-control.js` line 174-191 to match your audio file paths:

```javascript
async function loadSoundEffects() {
  const sounds = {
    // SFX (your actual paths)
    laser: 'assets/audio/sfx/laser.mp3',
    ricochet: 'assets/audio/sfx/ricochet.mp3',
    boost: 'assets/audio/sfx/boost.mp3',
    explosion: 'assets/audio/sfx/explosion.mp3',
    
    // Menu sounds
    menuClick: 'assets/audio/sfx/menu_click.mp3',
    menuHover: 'assets/audio/sfx/menu_hover.mp3',
    menuBack: 'assets/audio/sfx/menu_back.mp3',
    
    // Music tracks by TRNDSTR
    menuMusic: 'assets/audio/music/TRNDSTR_menu_theme.mp3',
    combatMusic: 'assets/audio/music/TRNDSTR_combat_theme.mp3',
    lobbyMusic: 'assets/audio/music/TRNDSTR_lobby_ambient.mp3',
  };
  // ... rest of function
}
```

### Step 4: Integrate GUI Rendering (3 minutes)

Add to your render loop:

```javascript
function render() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Render game (players, lasers, walls, etc.)
  renderGame(ctx);
  
  // Render audio GUI (music player + settings)
  AudioGUI.render(ctx, canvas.width, canvas.height);
}
```

### Step 5: Add Input Handling (2 minutes)

Add to your input handlers:

```javascript
// Mouse/touch click
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Check if audio GUI handled the click
  if (AudioGUI.handleClick(x, y, canvas.width, canvas.height)) {
    return; // GUI consumed the click
  }
  
  // Handle game input...
});

// Keyboard - toggle audio settings with 'S' key
document.addEventListener('keydown', (e) => {
  if (e.key === 's' || e.key === 'S') {
    AudioGUI.toggleSettings();
  }
  
  // Handle other game keys...
});
```

---

## 🎮 Using the Audio System

### Playing Sound Effects

```javascript
// Laser fire sound
AudioControl.playSound('laser', 'laser', {
  volume: 0.8,
  x: laserX,       // Position for spatial audio
  y: laserY,
  playerX: player.x,
  playerY: player.y,
});

// Ricochet sound
AudioControl.playSound('ricochet', 'ricochet', {
  volume: 0.6,
  x: wallX,
  y: wallY,
  playerX: player.x,
  playerY: player.y,
});

// Boost sound (looping while boosting)
const boostSound = AudioControl.playSound('boost', 'boost', {
  volume: 0.7,
  loop: true,
});

// Stop boost sound when boost ends
AudioControl.stopSound(boostSound);

// Explosion
AudioControl.playSound('explosion', 'explosion', {
  volume: 1.0,
  x: explosionX,
  y: explosionY,
  playerX: player.x,
  playerY: player.y,
});

// Menu click
AudioControl.playSound('menu', 'menuClick', { volume: 0.5 });
```

### Playing Music

```javascript
// Start music (TRNDSTR tracks)
AudioControl.playMusic('menuMusic');          // Menu screen
AudioControl.playMusic('combatMusic');        // In-game
AudioControl.playMusic('lobbyMusic');         // Lobby

// Music controls
AudioControl.pauseMusic();      // Pause
AudioControl.resumeMusic();     // Resume
AudioControl.stopMusic();       // Stop

// Playlist navigation
AudioControl.playNextTrack();
AudioControl.playPreviousTrack();
```

### Dynamic Audio Ducking

Automatically lower music volume during intense combat:

```javascript
// In your game loop
function update(dt) {
  // Calculate combat intensity (0.0 to 1.0)
  const intensity = AudioControl.calculateCombatIntensity(gameState);
  
  // Duck music based on intensity
  AudioControl.duckMusic(intensity);
  
  // Continue game update...
}
```

Or manually:

```javascript
// Intense combat: 80% ducking
AudioControl.duckMusic(0.8, 0.3); // 0.3s transition

// Calm: no ducking
AudioControl.duckMusic(0.0, 1.0); // 1.0s transition
```

### Volume Controls

```javascript
// Set master volume (0.0 to 1.0)
AudioControl.setMasterVolume(0.7);

// Set music volume
AudioControl.setMusicVolume(0.6);

// Set SFX volume
AudioControl.setSFXVolume(0.8);

// Toggle categories
AudioControl.toggleCategory('laser');      // Toggle laser sounds on/off
AudioControl.toggleCategory('music');      // Toggle music on/off
AudioControl.toggleCategory('spatialAudio'); // Toggle 3D audio
```

### Getting Settings

```javascript
const settings = AudioControl.getSettings();
console.log('Master volume:', settings.masterVolume);
console.log('Laser enabled:', settings.laserEnabled);
console.log('Spatial audio:', settings.spatialAudio);

const musicState = AudioControl.getMusicState();
console.log('Now playing:', musicState.currentTrackName);
console.log('Is paused:', musicState.isPaused);
```

---

## 🎨 GUI Features

### Music Player (Always Visible)

- **Location**: Top-right corner
- **Shows**: Current track name + "Music by TRNDSTR"
- **Controls**: Previous, Play/Pause, Next
- **Auto-hides**: When no music playing

### Settings Panel (Press 'S' to Toggle)

- **Master Volume Slider**: Controls overall volume
- **Music Volume Slider**: Controls all music (TRNDSTR tracks)
- **SFX Volume Slider**: Controls all sound effects

**Sound Categories** (6 toggles):
- LASER FIRE
- RICOCHET
- BOOST
- EXPLOSION
- MENU SOUNDS
- MUSIC

**Advanced Settings** (4 toggles):
- 3D SPATIAL AUDIO (sounds come from direction)
- MUSIC DUCKING (auto-lower music during combat)
- CROSSFADE (smooth music transitions)
- NETWORK MUSIC (allow host to stream custom music)

---

## 🎵 TRNDSTR Attribution

### In-Game Display

The music player automatically shows "Music by TRNDSTR" whenever music is playing.

### Credits Screen

Add a credits section to your game menu:

```javascript
function renderCredits(ctx) {
  ctx.fillStyle = '#ff00ff';
  ctx.font = 'bold 24px monospace';
  ctx.fillText('♫ ORIGINAL SOUNDTRACK ♫', centerX, y);
  
  ctx.fillStyle = '#00ffff';
  ctx.font = '20px monospace';
  ctx.fillText('Music by TRNDSTR', centerX, y + 40);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px monospace';
  ctx.fillText('Neon synthwave & dynamic combat themes', centerX, y + 70);
  
  // List tracks
  const tracks = [
    'Menu Theme',
    'Combat Theme',
    'Lobby Ambient',
    // Add all TRNDSTR tracks
  ];
  
  tracks.forEach((track, i) => {
    ctx.fillText(`- ${track}`, centerX, y + 110 + i * 25);
  });
}
```

### External Documentation

Use `CREDITS.md` as your official credits file. Update it with:
- All TRNDSTR track names
- Contact/social media links
- Website/portfolio links

---

## 🔧 Advanced Integration

### Custom Sound Effects

Add your own sound effects:

```javascript
// In loadSoundEffects(), add more sounds:
const sounds = {
  // ... existing sounds ...
  
  // Custom sounds
  powerup: 'assets/audio/sfx/powerup.mp3',
  teleport: 'assets/audio/sfx/teleport.mp3',
  countdown: 'assets/audio/sfx/countdown.mp3',
};

// Play them:
AudioControl.playSound('menu', 'powerup', { volume: 0.8 });
```

### Music Playlist

Create a playlist for auto-progression:

```javascript
// Get music state and set playlist
const musicState = AudioControl.getMusicState();
musicState.playlist = [
  { name: 'combatMusic' },
  { name: 'menuMusic' },
  { name: 'lobbyMusic' },
];
musicState.playlistIndex = 0;

// Disable loop on current track (so it auto-advances)
const source = musicState.currentTrack;
if (source) source.loop = false;

// Music will auto-play next track when current ends
```

### Spatial Audio Positioning

For accurate 3D audio:

```javascript
function updateSpatialAudio() {
  // Update listener position every frame
  const audioContext = AudioControl.audioContext();
  
  if (audioContext?.listener.positionX) {
    audioContext.listener.positionX.value = player.x;
    audioContext.listener.positionY.value = player.y;
    audioContext.listener.positionZ.value = 0;
  }
}
```

### Network Music Integration

Integrate with multiplayer (from `NETWORKED_INPUT_AUDIO_SYSTEM.md`):

```javascript
// Host: Stream music to clients
if (NetworkState.isHost) {
  // See NETWORKED_INPUT_AUDIO_SYSTEM.md for full implementation
  startMusicStream('path/to/music.mp3');
}

// Client: Receive music
if (!NetworkState.isHost && AudioSettings.allowIncomingMusic) {
  receiveNetworkMusic(audioData);
}
```

---

## 🎹 Keyboard Shortcuts

Add these to your keyboard handler:

- `S` - Toggle audio settings panel
- `M` - Toggle music player visibility
- `P` - Play/pause music
- `N` - Next track
- `B` - Previous track (or use `P` for "back")

```javascript
document.addEventListener('keydown', (e) => {
  switch(e.key.toLowerCase()) {
    case 's':
      AudioGUI.toggleSettings();
      break;
    case 'm':
      AudioGUI.togglePlayer();
      break;
    case 'p':
      const musicState = AudioControl.getMusicState();
      musicState.isPaused ? AudioControl.resumeMusic() : AudioControl.pauseMusic();
      break;
    case 'n':
      AudioControl.playNextTrack();
      break;
    case 'b':
      AudioControl.playPreviousTrack();
      break;
  }
});
```

---

## 🐛 Troubleshooting

### No Sound Playing

**Issue**: Audio doesn't play
**Solution**: Audio must be initialized on user interaction (browser policy)

```javascript
// BAD: Initialize on page load
window.onload = () => AudioControl.initAudioSystem(); // Won't work!

// GOOD: Initialize on user click
startButton.addEventListener('click', async () => {
  await AudioControl.initAudioSystem(); // Works!
  startGame();
});
```

### Audio Files Not Loading

**Issue**: Console shows "Failed to load [sound]"
**Solution**: Check file paths in `loadSoundEffects()`

```javascript
// Verify paths are correct (relative to HTML file)
laser: 'assets/audio/sfx/laser.mp3',  // ✓ Correct
laser: '/audio/sfx/laser.mp3',        // ✓ Also correct
laser: 'laser.mp3',                   // ✗ Only if in same folder as HTML
```

### Spatial Audio Not Working

**Issue**: All sounds come from center
**Solution**: Enable spatial audio in settings OR pass coordinates

```javascript
// Enable in settings
AudioSettings.spatialAudio = true;

// Pass coordinates when playing
AudioControl.playSound('laser', 'laser', {
  x: laserX,       // Required
  y: laserY,       // Required
  playerX: player.x,  // Required
  playerY: player.y,  // Required
});
```

### GUI Not Showing

**Issue**: Audio GUI doesn't render
**Solution**: Ensure `AudioGUI.render()` is called in render loop

```javascript
function render() {
  // ... game rendering ...
  
  AudioGUI.render(ctx, canvas.width, canvas.height); // Add this!
}
```

### Settings Not Persisting

**Issue**: Settings reset on page reload
**Solution**: Ensure localStorage is enabled

```javascript
// Check if localStorage works
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
  console.log('localStorage: OK');
} catch (e) {
  console.error('localStorage disabled:', e);
}
```

---

## ✅ Integration Checklist

- [ ] Add `audio-control.js` script tag
- [ ] Add `audio-gui.js` script tag
- [ ] Call `AudioControl.initAudioSystem()` on user interaction
- [ ] Update audio file paths in `loadSoundEffects()`
- [ ] Add `AudioGUI.render()` to render loop
- [ ] Add `AudioGUI.handleClick()` to input handler
- [ ] Add keyboard shortcut for settings (S key)
- [ ] Play sounds with `AudioControl.playSound()`
- [ ] Start music with `AudioControl.playMusic()`
- [ ] Test all volume sliders
- [ ] Test all category toggles
- [ ] Test music player controls
- [ ] Test spatial audio positioning
- [ ] Add TRNDSTR attribution to credits screen
- [ ] Update `CREDITS.md` with track names

---

## 📊 Performance Tips

### Optimize Audio Loading

```javascript
// Preload critical sounds first
async function loadCriticalSounds() {
  const critical = ['laser', 'explosion', 'menuClick'];
  for (const sound of critical) {
    await loadSound(sound);
  }
}

// Load remaining sounds in background
async function loadRemainingSound() {
  const remaining = ['ricochet', 'boost', 'menuHover', 'menuBack'];
  for (const sound of remaining) {
    await loadSound(sound);
  }
}
```

### Limit Simultaneous Sounds

```javascript
// Prevent audio spam (e.g., rapid laser fire)
let lastLaserTime = 0;
const laserCooldown = 50; // ms

function fireLaser() {
  const now = Date.now();
  if (now - lastLaserTime > laserCooldown) {
    AudioControl.playSound('laser', 'laser');
    lastLaserTime = now;
  }
}
```

### Use Audio Object Pool

```javascript
// Reuse audio buffer sources for performance
const audioPool = {
  laser: [],
  explosion: [],
};

function getPooledSound(category) {
  const pool = audioPool[category];
  return pool.length > 0 ? pool.pop() : null;
}

function returnToPool(category, source) {
  audioPool[category].push(source);
}
```

---

## 🎉 You're Done!

**Your game now has:**
- ✅ Professional audio engine
- ✅ Intuitive GUI controls
- ✅ TRNDSTR music attribution
- ✅ Dynamic features (ducking, spatial audio)
- ✅ Settings persistence
- ✅ Clean neon aesthetic

**Players will love:**
- 🎵 High-quality TRNDSTR soundtrack
- 🎛️ Granular sound control
- 🎮 Immersive 3D audio
- 💾 Settings that persist across sessions

---

**Music by TRNDSTR** | Audio Engine: Web Audio API | Integration Time: ~15 minutes
