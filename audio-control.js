/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NEO-VECTR ∞SNIP3 - ADVANCED AUDIO CONTROL SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Complete audio management system with:
 * - Dynamic volume control (master + per-category)
 * - Granular sound toggles (5 categories + music)
 * - Music player with playlist support
 * - Cross-fade transitions
 * - Audio ducking (lower music during intense combat)
 * - Spatial audio (3D positioning)
 * - Network music streaming integration
 * - Clean, intuitive GUI controls
 * 
 * Music by: TRNDSTR
 * Audio Engine: Web Audio API
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// AUDIO CONTEXT & MASTER CHAIN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Global audio context (initialized on first user interaction to comply with browser autoplay policies)
 * @type {AudioContext|null}
 */
let audioContext = null;

/**
 * Master gain node - controls overall volume (0.0 to 1.0)
 * All audio passes through this node before reaching speakers
 * @type {GainNode|null}
 */
let masterGain = null;

/**
 * Music gain node - separate from SFX for independent volume control
 * Allows music ducking during intense gameplay
 * @type {GainNode|null}
 */
let musicGain = null;

/**
 * SFX gain node - controls all sound effects (laser, ricochet, boost, explosion, menu)
 * @type {GainNode|null}
 */
let sfxGain = null;

/**
 * Compressor node - prevents audio clipping when many sounds play simultaneously
 * Makes audio sound more polished and professional
 * @type {DynamicsCompressorNode|null}
 */
let compressor = null;

// ═══════════════════════════════════════════════════════════════════════════
// AUDIO STATE & SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Central audio settings object
 * All settings persist to localStorage and sync across sessions
 */
const AudioSettings = {
  // Volume levels (0.0 to 1.0)
  masterVolume: 0.7,      // Overall volume
  musicVolume: 0.6,       // Music tracks (TRNDSTR soundtrack)
  sfxVolume: 0.8,         // All sound effects
  
  // Per-category toggles (true = enabled, false = muted)
  laserEnabled: true,     // Laser fire sounds
  ricochetEnabled: true,  // Wall bounce sounds
  boostEnabled: true,     // Speed boost sounds
  explosionEnabled: true, // Player elimination explosions
  menuEnabled: true,      // UI click/hover sounds
  musicEnabled: true,     // Music playback
  
  // Advanced features
  spatialAudio: true,     // 3D positional audio (sounds come from direction of source)
  audioDucking: true,     // Lower music volume during intense combat
  crossfade: true,        // Smooth transitions between music tracks
  
  // Network music settings
  allowIncomingMusic: true,  // Allow host to stream custom music
  networkMusicVolume: 0.6,   // Volume for streamed music from host
};

/**
 * Current music state
 */
const MusicState = {
  currentTrack: null,        // Currently playing AudioBufferSourceNode
  currentTrackName: '',      // Display name for UI
  playlist: [],              // Array of {name, buffer} objects
  playlistIndex: 0,          // Current position in playlist
  isPlaying: false,          // Playback status
  isPaused: false,           // Pause status
  fadeOutTimer: null,        // Timeout for crossfade
  duckAmount: 0.0,           // Current ducking level (0.0 = normal, 1.0 = max duck)
};

/**
 * Audio buffer cache - stores loaded sound effects
 * Key: sound name, Value: AudioBuffer
 */
const audioBuffers = new Map();

/**
 * Currently playing sound effect sources
 * Used to stop/manage long-running effects (e.g., continuous boost sound)
 */
const activeSounds = new Map();

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize audio system
 * Must be called on user interaction (click/tap) due to browser autoplay policies
 * Sets up AudioContext, gain nodes, compressor, and loads settings
 * 
 * @returns {Promise<void>}
 */
async function initAudioSystem() {
  if (audioContext) return; // Already initialized
  
  try {
    // Create audio context (modern browsers)
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Build audio graph: source → sfxGain/musicGain → masterGain → compressor → destination
    masterGain = audioContext.createGain();
    musicGain = audioContext.createGain();
    sfxGain = audioContext.createGain();
    compressor = audioContext.createDynamicsCompressor();
    
    // Configure compressor for clean, professional sound
    compressor.threshold.value = -20;    // Start compressing at -20dB
    compressor.knee.value = 10;          // Smooth compression curve
    compressor.ratio.value = 4;          // 4:1 compression ratio
    compressor.attack.value = 0.003;     // Fast attack (3ms)
    compressor.release.value = 0.1;      // Medium release (100ms)
    
    // Connect audio graph
    musicGain.connect(masterGain);
    sfxGain.connect(masterGain);
    masterGain.connect(compressor);
    compressor.connect(audioContext.destination);
    
    // Load settings from localStorage
    loadAudioSettings();
    
    // Apply initial volumes
    applyVolumeSettings();
    
    // Load sound effects (add your actual file paths)
    await loadSoundEffects();
    
    console.log('[Audio] System initialized successfully');
  } catch (error) {
    console.error('[Audio] Initialization failed:', error);
  }
}

/**
 * Load all sound effect files
 * Modify paths to match your actual audio files
 * 
 * @returns {Promise<void>}
 */
async function loadSoundEffects() {
  const sounds = {
    // SFX (use your actual file paths)
    laser: 'assets/audio/sfx/laser.mp3',
    ricochet: 'assets/audio/sfx/ricochet.mp3',
    boost: 'assets/audio/sfx/boost.mp3',
    explosion: 'assets/audio/sfx/explosion.mp3',
    
    // Menu sounds
    menuClick: 'assets/audio/sfx/menu_click.mp3',
    menuHover: 'assets/audio/sfx/menu_hover.mp3',
    menuBack: 'assets/audio/sfx/menu_back.mp3',
    
    // Music tracks by TRNDSTR (add all tracks)
    menuMusic: 'assets/audio/music/menu_theme.mp3',
    combatMusic: 'assets/audio/music/combat_theme.mp3',
    lobbyMusic: 'assets/audio/music/lobby_ambient.mp3',
  };
  
  // Load each sound file
  for (const [name, path] of Object.entries(sounds)) {
    try {
      const response = await fetch(path);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      audioBuffers.set(name, audioBuffer);
      console.log(`[Audio] Loaded: ${name}`);
    } catch (error) {
      console.warn(`[Audio] Failed to load ${name}:`, error);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SOUND PLAYBACK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Play a sound effect
 * 
 * @param {string} category - Sound category ('laser', 'ricochet', 'boost', 'explosion', 'menu')
 * @param {string} soundName - Name of sound in audioBuffers map
 * @param {Object} options - Playback options
 * @param {number} [options.volume=1.0] - Volume multiplier (0.0 to 1.0)
 * @param {number} [options.x] - X position for spatial audio
 * @param {number} [options.y] - Y position for spatial audio
 * @param {number} [options.playerX] - Listener X position (camera/player)
 * @param {number} [options.playerY] - Listener Y position (camera/player)
 * @param {boolean} [options.loop=false] - Loop the sound
 * @param {number} [options.playbackRate=1.0] - Speed/pitch adjustment
 * @returns {AudioBufferSourceNode|null} - Source node (for stopping later)
 */
function playSound(category, soundName, options = {}) {
  // Check if category is enabled
  const categoryEnabled = AudioSettings[`${category}Enabled`];
  if (!categoryEnabled) return null;
  
  // Check if audio buffer exists
  const buffer = audioBuffers.get(soundName);
  if (!buffer) {
    console.warn(`[Audio] Sound not found: ${soundName}`);
    return null;
  }
  
  // Create source node
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.loop = options.loop || false;
  source.playbackRate.value = options.playbackRate || 1.0;
  
  // Create gain node for this sound
  const gainNode = audioContext.createGain();
  gainNode.gain.value = options.volume || 1.0;
  
  // Apply spatial audio if coordinates provided
  if (AudioSettings.spatialAudio && options.x !== undefined && options.y !== undefined) {
    const panner = createPannerNode(options.x, options.y, options.playerX, options.playerY);
    source.connect(panner);
    panner.connect(gainNode);
  } else {
    source.connect(gainNode);
  }
  
  // Connect to SFX chain
  gainNode.connect(sfxGain);
  
  // Play sound
  source.start(0);
  
  // Track active sound (for stopping if needed)
  const soundId = `${category}_${soundName}_${Date.now()}`;
  activeSounds.set(soundId, { source, gainNode });
  
  // Auto-remove after playback
  source.onended = () => {
    activeSounds.delete(soundId);
  };
  
  return source;
}

/**
 * Create panner node for spatial audio
 * Makes sounds come from the direction of their source
 * 
 * @param {number} x - Sound X position
 * @param {number} y - Sound Y position
 * @param {number} listenerX - Player/camera X position
 * @param {number} listenerY - Player/camera Y position
 * @returns {PannerNode}
 */
function createPannerNode(x, y, listenerX = 0, listenerY = 0) {
  const panner = audioContext.createPanner();
  
  // Configure 3D audio settings
  panner.panningModel = 'HRTF'; // Head-related transfer function (realistic)
  panner.distanceModel = 'linear';
  panner.refDistance = 100;     // Distance where volume starts decreasing
  panner.maxDistance = 1000;    // Maximum distance before silence
  panner.rolloffFactor = 1;     // How quickly volume decreases with distance
  
  // Set sound position relative to listener
  const relX = x - listenerX;
  const relY = y - listenerY;
  panner.setPosition(relX, relY, 0);
  
  // Update listener position
  if (audioContext.listener.positionX) {
    // Modern API
    audioContext.listener.positionX.value = 0;
    audioContext.listener.positionY.value = 0;
    audioContext.listener.positionZ.value = 0;
  } else {
    // Legacy API
    audioContext.listener.setPosition(0, 0, 0);
  }
  
  return panner;
}

/**
 * Stop a specific sound effect
 * @param {AudioBufferSourceNode} source - Source node returned from playSound()
 */
function stopSound(source) {
  if (!source) return;
  try {
    source.stop();
  } catch (e) {
    // Already stopped
  }
}

/**
 * Stop all sounds in a category
 * @param {string} category - Category to stop ('laser', 'ricochet', etc.)
 */
function stopCategory(category) {
  for (const [id, { source }] of activeSounds.entries()) {
    if (id.startsWith(category)) {
      stopSound(source);
      activeSounds.delete(id);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MUSIC PLAYBACK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Play a music track with optional crossfade
 * 
 * @param {string} trackName - Name of track in audioBuffers
 * @param {boolean} [crossfade=true] - Crossfade from current track
 * @param {number} [fadeTime=2.0] - Fade duration in seconds
 */
function playMusic(trackName, crossfade = true, fadeTime = 2.0) {
  if (!AudioSettings.musicEnabled) return;
  
  const buffer = audioBuffers.get(trackName);
  if (!buffer) {
    console.warn(`[Audio] Music track not found: ${trackName}`);
    return;
  }
  
  // Stop current track
  if (MusicState.currentTrack) {
    if (crossfade && AudioSettings.crossfade) {
      // Fade out current track
      const currentGain = audioContext.createGain();
      currentGain.gain.value = 1.0;
      currentGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + fadeTime);
      
      // Reconnect current track through fade-out gain
      MusicState.currentTrack.disconnect();
      MusicState.currentTrack.connect(currentGain);
      currentGain.connect(musicGain);
      
      // Stop after fade
      setTimeout(() => {
        try {
          MusicState.currentTrack.stop();
        } catch (e) {}
      }, fadeTime * 1000);
    } else {
      // Immediate stop
      try {
        MusicState.currentTrack.stop();
      } catch (e) {}
    }
  }
  
  // Create new music source
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.loop = true; // Music loops by default
  
  // Create gain for fade-in
  const fadeGain = audioContext.createGain();
  
  if (crossfade && AudioSettings.crossfade) {
    // Fade in new track
    fadeGain.gain.value = 0;
    fadeGain.gain.linearRampToValueAtTime(1, audioContext.currentTime + fadeTime);
  } else {
    fadeGain.gain.value = 1;
  }
  
  // Connect: source → fadeGain → musicGain → masterGain → compressor → destination
  source.connect(fadeGain);
  fadeGain.connect(musicGain);
  
  // Start playback
  source.start(0);
  
  // Update state
  MusicState.currentTrack = source;
  MusicState.currentTrackName = trackName;
  MusicState.isPlaying = true;
  MusicState.isPaused = false;
  
  // Auto-play next track when current ends (if in playlist mode)
  source.onended = () => {
    if (!source.loop && MusicState.playlist.length > 0) {
      playNextTrack();
    }
  };
  
  console.log(`[Audio] Now playing: ${trackName}`);
}

/**
 * Pause current music track
 */
function pauseMusic() {
  if (MusicState.currentTrack && MusicState.isPlaying) {
    audioContext.suspend();
    MusicState.isPaused = true;
    console.log('[Audio] Music paused');
  }
}

/**
 * Resume paused music
 */
function resumeMusic() {
  if (MusicState.isPaused) {
    audioContext.resume();
    MusicState.isPaused = false;
    console.log('[Audio] Music resumed');
  }
}

/**
 * Stop music playback
 */
function stopMusic() {
  if (MusicState.currentTrack) {
    try {
      MusicState.currentTrack.stop();
    } catch (e) {}
    MusicState.currentTrack = null;
    MusicState.isPlaying = false;
    MusicState.isPaused = false;
    console.log('[Audio] Music stopped');
  }
}

/**
 * Play next track in playlist
 */
function playNextTrack() {
  if (MusicState.playlist.length === 0) return;
  
  MusicState.playlistIndex = (MusicState.playlistIndex + 1) % MusicState.playlist.length;
  const nextTrack = MusicState.playlist[MusicState.playlistIndex];
  playMusic(nextTrack.name);
}

/**
 * Play previous track in playlist
 */
function playPreviousTrack() {
  if (MusicState.playlist.length === 0) return;
  
  MusicState.playlistIndex = (MusicState.playlistIndex - 1 + MusicState.playlist.length) % MusicState.playlist.length;
  const prevTrack = MusicState.playlist[MusicState.playlistIndex];
  playMusic(prevTrack.name);
}

// ═══════════════════════════════════════════════════════════════════════════
// DYNAMIC AUDIO DUCKING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Duck music volume during intense gameplay
 * Smoothly lowers music so SFX are more audible
 * 
 * @param {number} intensity - Combat intensity (0.0 = calm, 1.0 = intense)
 * @param {number} [transition=0.5] - Transition time in seconds
 */
function duckMusic(intensity, transition = 0.5) {
  if (!AudioSettings.audioDucking || !MusicState.isPlaying) return;
  
  // Calculate target duck amount (0.0 to 0.6 based on intensity)
  const targetDuck = intensity * 0.6;
  
  // Smoothly ramp music volume
  const targetVolume = AudioSettings.musicVolume * (1.0 - targetDuck);
  musicGain.gain.linearRampToValueAtTime(targetVolume, audioContext.currentTime + transition);
  
  MusicState.duckAmount = targetDuck;
}

/**
 * Calculate combat intensity based on game state
 * Call this every frame and pass result to duckMusic()
 * 
 * @param {Object} gameState - Current game state
 * @returns {number} - Intensity from 0.0 to 1.0
 */
function calculateCombatIntensity(gameState) {
  let intensity = 0.0;
  
  // Factors that increase intensity:
  // - Number of lasers on screen
  // - Players currently boosting
  // - Recent explosions
  // - Proximity to other players
  
  // Example calculation (adjust for your game)
  if (gameState.lasers) {
    intensity += Math.min(gameState.lasers.length / 20, 0.4);
  }
  
  if (gameState.activePlayers) {
    const boostingPlayers = gameState.activePlayers.filter(p => p.isBoosting).length;
    intensity += boostingPlayers * 0.1;
  }
  
  if (gameState.recentExplosions) {
    intensity += Math.min(gameState.recentExplosions / 3, 0.3);
  }
  
  return Math.min(intensity, 1.0);
}

// ═══════════════════════════════════════════════════════════════════════════
// VOLUME CONTROLS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Set master volume
 * @param {number} volume - Volume level (0.0 to 1.0)
 */
function setMasterVolume(volume) {
  AudioSettings.masterVolume = Math.max(0, Math.min(1, volume));
  applyVolumeSettings();
  saveAudioSettings();
}

/**
 * Set music volume
 * @param {number} volume - Volume level (0.0 to 1.0)
 */
function setMusicVolume(volume) {
  AudioSettings.musicVolume = Math.max(0, Math.min(1, volume));
  applyVolumeSettings();
  saveAudioSettings();
}

/**
 * Set SFX volume
 * @param {number} volume - Volume level (0.0 to 1.0)
 */
function setSFXVolume(volume) {
  AudioSettings.sfxVolume = Math.max(0, Math.min(1, volume));
  applyVolumeSettings();
  saveAudioSettings();
}

/**
 * Apply volume settings to gain nodes
 */
function applyVolumeSettings() {
  if (!masterGain || !musicGain || !sfxGain) return;
  
  masterGain.gain.value = AudioSettings.masterVolume;
  musicGain.gain.value = AudioSettings.musicVolume * (1.0 - MusicState.duckAmount);
  sfxGain.gain.value = AudioSettings.sfxVolume;
}

/**
 * Toggle a sound category on/off
 * @param {string} category - Category to toggle ('laser', 'music', etc.)
 */
function toggleCategory(category) {
  const key = `${category}Enabled`;
  AudioSettings[key] = !AudioSettings[key];
  
  // Stop all sounds in this category if disabled
  if (!AudioSettings[key]) {
    if (category === 'music') {
      stopMusic();
    } else {
      stopCategory(category);
    }
  }
  
  saveAudioSettings();
}

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Save audio settings to localStorage
 */
function saveAudioSettings() {
  try {
    localStorage.setItem('neoVectrAudioSettings', JSON.stringify(AudioSettings));
  } catch (e) {
    console.warn('[Audio] Failed to save settings:', e);
  }
}

/**
 * Load audio settings from localStorage
 */
function loadAudioSettings() {
  try {
    const saved = localStorage.getItem('neoVectrAudioSettings');
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(AudioSettings, parsed);
      console.log('[Audio] Settings loaded from localStorage');
    }
  } catch (e) {
    console.warn('[Audio] Failed to load settings:', e);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

// Make functions available globally
window.AudioControl = {
  // Initialization
  initAudioSystem,
  
  // Sound playback
  playSound,
  stopSound,
  stopCategory,
  
  // Music playback
  playMusic,
  pauseMusic,
  resumeMusic,
  stopMusic,
  playNextTrack,
  playPreviousTrack,
  
  // Dynamic features
  duckMusic,
  calculateCombatIntensity,
  
  // Volume controls
  setMasterVolume,
  setMusicVolume,
  setSFXVolume,
  toggleCategory,
  
  // Settings
  getSettings: () => ({ ...AudioSettings }),
  getMusicState: () => ({ ...MusicState }),
  
  // State access (read-only)
  audioContext: () => audioContext,
  audioBuffers,
};
