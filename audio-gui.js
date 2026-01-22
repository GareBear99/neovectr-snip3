/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NEO-VECTR ∞SNIP3 - AUDIO CONTROL GUI
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Clean, intuitive GUI for audio settings with:
 * - Volume sliders (master, music, SFX)
 * - Category toggles (laser, ricochet, boost, explosion, menu, music)
 * - Music player controls (play/pause, next/prev, track display)
 * - Advanced settings (spatial audio, ducking, crossfade)
 * - Visual feedback (neon glow, animations)
 * - Keyboard shortcuts
 * - Mobile-friendly touch controls
 * 
 * Music by: TRNDSTR
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// GUI STATE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Audio GUI state
 */
const AudioGUIState = {
  isVisible: false,           // Settings panel visibility
  musicPlayerVisible: true,   // Mini music player visibility
  settingsScrollY: 0,         // Scroll position for settings
};

// ═══════════════════════════════════════════════════════════════════════════
// RENDERING CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const AudioGUI = {
  // Panel dimensions
  panelWidth: 400,
  panelHeight: 600,
  panelPadding: 20,
  
  // Colors (neon theme matching game)
  bgColor: 'rgba(10, 5, 20, 0.95)',
  borderColor: '#00ffff',
  textColor: '#ffffff',
  accentColor: '#ff00ff',
  disabledColor: '#666666',
  
  // Slider dimensions
  sliderWidth: 300,
  sliderHeight: 6,
  sliderThumbSize: 16,
  
  // Toggle dimensions
  toggleWidth: 50,
  toggleHeight: 24,
  
  // Music player dimensions
  playerWidth: 300,
  playerHeight: 80,
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN RENDER FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Render audio settings panel
 * Call this from your main render loop
 * 
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 */
function renderAudioGUI(ctx, canvasWidth, canvasHeight) {
  // Render mini music player (always visible if music playing)
  if (AudioGUIState.musicPlayerVisible) {
    renderMusicPlayer(ctx, canvasWidth, canvasHeight);
  }
  
  // Render settings panel (only if opened)
  if (AudioGUIState.isVisible) {
    renderSettingsPanel(ctx, canvasWidth, canvasHeight);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MUSIC PLAYER (MINI)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Render compact music player in corner
 * Shows current track by TRNDSTR and basic controls
 * 
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 */
function renderMusicPlayer(ctx, canvasWidth, canvasHeight) {
  const musicState = window.AudioControl?.getMusicState();
  if (!musicState || !musicState.isPlaying) return;
  
  const x = canvasWidth - AudioGUI.playerWidth - 20;
  const y = 20;
  const w = AudioGUI.playerWidth;
  const h = AudioGUI.playerHeight;
  
  // Background panel with neon glow
  ctx.save();
  ctx.shadowColor = AudioGUI.borderColor;
  ctx.shadowBlur = 10;
  ctx.fillStyle = AudioGUI.bgColor;
  ctx.strokeStyle = AudioGUI.borderColor;
  ctx.lineWidth = 2;
  
  // Rounded rectangle
  drawRoundedRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  
  ctx.shadowBlur = 0;
  
  // "NOW PLAYING" label
  ctx.fillStyle = AudioGUI.accentColor;
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('♫ NOW PLAYING ♫', x + w / 2, y + 20);
  
  // Track name
  ctx.fillStyle = AudioGUI.textColor;
  ctx.font = 'bold 14px monospace';
  const trackName = musicState.currentTrackName || 'Unknown Track';
  ctx.fillText(trackName, x + w / 2, y + 40);
  
  // "Music by TRNDSTR"
  ctx.fillStyle = AudioGUI.accentColor;
  ctx.font = '10px monospace';
  ctx.fillText('Music by TRNDSTR', x + w / 2, y + 55);
  
  // Control buttons (previous, play/pause, next)
  const buttonY = y + 65;
  const buttonSize = 12;
  const buttonSpacing = 40;
  const centerX = x + w / 2;
  
  // Previous button
  drawTriangleButton(ctx, centerX - buttonSpacing, buttonY, buttonSize, 'left');
  
  // Play/Pause button
  if (musicState.isPaused) {
    drawPlayButton(ctx, centerX, buttonY, buttonSize);
  } else {
    drawPauseButton(ctx, centerX, buttonY, buttonSize);
  }
  
  // Next button
  drawTriangleButton(ctx, centerX + buttonSpacing, buttonY, buttonSize, 'right');
  
  ctx.restore();
}

/**
 * Draw rounded rectangle
 */
function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Draw triangle button (prev/next)
 */
function drawTriangleButton(ctx, x, y, size, direction) {
  ctx.fillStyle = AudioGUI.textColor;
  ctx.beginPath();
  
  if (direction === 'left') {
    ctx.moveTo(x + size / 2, y - size / 2);
    ctx.lineTo(x - size / 2, y);
    ctx.lineTo(x + size / 2, y + size / 2);
  } else {
    ctx.moveTo(x - size / 2, y - size / 2);
    ctx.lineTo(x + size / 2, y);
    ctx.lineTo(x - size / 2, y + size / 2);
  }
  
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw play button
 */
function drawPlayButton(ctx, x, y, size) {
  ctx.fillStyle = AudioGUI.textColor;
  ctx.beginPath();
  ctx.moveTo(x - size / 2, y - size / 2);
  ctx.lineTo(x + size / 2, y);
  ctx.lineTo(x - size / 2, y + size / 2);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw pause button
 */
function drawPauseButton(ctx, x, y, size) {
  ctx.fillStyle = AudioGUI.textColor;
  const barWidth = size / 4;
  const barHeight = size;
  
  ctx.fillRect(x - size / 3, y - barHeight / 2, barWidth, barHeight);
  ctx.fillRect(x + size / 12, y - barHeight / 2, barWidth, barHeight);
}

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS PANEL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Render full settings panel with all audio controls
 * 
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 */
function renderSettingsPanel(ctx, canvasWidth, canvasHeight) {
  const settings = window.AudioControl?.getSettings();
  if (!settings) return;
  
  const panelX = (canvasWidth - AudioGUI.panelWidth) / 2;
  const panelY = (canvasHeight - AudioGUI.panelHeight) / 2;
  
  // Background panel with glow
  ctx.save();
  ctx.shadowColor = AudioGUI.borderColor;
  ctx.shadowBlur = 20;
  ctx.fillStyle = AudioGUI.bgColor;
  ctx.strokeStyle = AudioGUI.borderColor;
  ctx.lineWidth = 3;
  
  drawRoundedRect(ctx, panelX, panelY, AudioGUI.panelWidth, AudioGUI.panelHeight, 15);
  ctx.fill();
  ctx.stroke();
  
  ctx.shadowBlur = 0;
  
  // Title
  ctx.fillStyle = AudioGUI.accentColor;
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('♫ AUDIO SETTINGS ♫', panelX + AudioGUI.panelWidth / 2, panelY + 40);
  
  // Content area
  let currentY = panelY + 70;
  const leftMargin = panelX + AudioGUI.panelPadding;
  
  ctx.textAlign = 'left';
  ctx.font = 'bold 14px monospace';
  
  // ─────────────────────────────────────────────────────────────────────────
  // VOLUME SLIDERS
  // ─────────────────────────────────────────────────────────────────────────
  
  // Master Volume
  ctx.fillStyle = AudioGUI.textColor;
  ctx.fillText('MASTER VOLUME', leftMargin, currentY);
  currentY += 25;
  renderSlider(ctx, leftMargin, currentY, settings.masterVolume, 'master');
  currentY += 35;
  
  // Music Volume
  ctx.fillText('MUSIC VOLUME', leftMargin, currentY);
  currentY += 25;
  renderSlider(ctx, leftMargin, currentY, settings.musicVolume, 'music');
  currentY += 35;
  
  // SFX Volume
  ctx.fillText('SFX VOLUME', leftMargin, currentY);
  currentY += 25;
  renderSlider(ctx, leftMargin, currentY, settings.sfxVolume, 'sfx');
  currentY += 40;
  
  // ─────────────────────────────────────────────────────────────────────────
  // CATEGORY TOGGLES
  // ─────────────────────────────────────────────────────────────────────────
  
  ctx.fillStyle = AudioGUI.accentColor;
  ctx.fillText('─ SOUND CATEGORIES ─', leftMargin, currentY);
  currentY += 30;
  
  const categories = [
    { key: 'laserEnabled', label: 'LASER FIRE' },
    { key: 'ricochetEnabled', label: 'RICOCHET' },
    { key: 'boostEnabled', label: 'BOOST' },
    { key: 'explosionEnabled', label: 'EXPLOSION' },
    { key: 'menuEnabled', label: 'MENU SOUNDS' },
    { key: 'musicEnabled', label: 'MUSIC' },
  ];
  
  categories.forEach(({ key, label }) => {
    renderToggle(ctx, leftMargin, currentY, label, settings[key], key);
    currentY += 35;
  });
  
  currentY += 10;
  
  // ─────────────────────────────────────────────────────────────────────────
  // ADVANCED FEATURES
  // ─────────────────────────────────────────────────────────────────────────
  
  ctx.fillStyle = AudioGUI.accentColor;
  ctx.fillText('─ ADVANCED ─', leftMargin, currentY);
  currentY += 30;
  
  const advanced = [
    { key: 'spatialAudio', label: '3D SPATIAL AUDIO' },
    { key: 'audioDucking', label: 'MUSIC DUCKING' },
    { key: 'crossfade', label: 'CROSSFADE' },
    { key: 'allowIncomingMusic', label: 'NETWORK MUSIC' },
  ];
  
  advanced.forEach(({ key, label }) => {
    renderToggle(ctx, leftMargin, currentY, label, settings[key], key);
    currentY += 35;
  });
  
  // Close button
  ctx.fillStyle = AudioGUI.textColor;
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  const closeY = panelY + AudioGUI.panelHeight - 25;
  ctx.fillText('Press [ESC] or [S] to close', panelX + AudioGUI.panelWidth / 2, closeY);
  
  ctx.restore();
}

/**
 * Render volume slider
 * 
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} value - Current value (0.0 to 1.0)
 * @param {string} type - Slider type ('master', 'music', 'sfx')
 */
function renderSlider(ctx, x, y, value, type) {
  const w = AudioGUI.sliderWidth;
  const h = AudioGUI.sliderHeight;
  
  // Track background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(x, y, w, h);
  
  // Track fill (neon gradient)
  const gradient = ctx.createLinearGradient(x, y, x + w * value, y);
  gradient.addColorStop(0, AudioGUI.borderColor);
  gradient.addColorStop(1, AudioGUI.accentColor);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w * value, h);
  
  // Thumb
  const thumbX = x + w * value;
  ctx.fillStyle = AudioGUI.textColor;
  ctx.beginPath();
  ctx.arc(thumbX, y + h / 2, AudioGUI.sliderThumbSize / 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Glow on thumb
  ctx.save();
  ctx.shadowColor = AudioGUI.accentColor;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(thumbX, y + h / 2, AudioGUI.sliderThumbSize / 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  
  // Value percentage
  ctx.fillStyle = AudioGUI.textColor;
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(value * 100)}%`, x + w + 50, y + h);
}

/**
 * Render toggle switch
 * 
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} label - Toggle label
 * @param {boolean} enabled - Current state
 * @param {string} key - Settings key
 */
function renderToggle(ctx, x, y, label, enabled, key) {
  // Label
  ctx.fillStyle = enabled ? AudioGUI.textColor : AudioGUI.disabledColor;
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y + 16);
  
  // Toggle switch
  const toggleX = x + 250;
  const w = AudioGUI.toggleWidth;
  const h = AudioGUI.toggleHeight;
  
  // Background
  ctx.fillStyle = enabled ? AudioGUI.accentColor : AudioGUI.disabledColor;
  ctx.beginPath();
  ctx.arc(toggleX + h / 2, y + h / 2, h / 2, Math.PI / 2, -Math.PI / 2);
  ctx.arc(toggleX + w - h / 2, y + h / 2, h / 2, -Math.PI / 2, Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  
  // Thumb
  const thumbX = enabled ? toggleX + w - h / 2 : toggleX + h / 2;
  ctx.fillStyle = AudioGUI.textColor;
  ctx.beginPath();
  ctx.arc(thumbX, y + h / 2, h / 2 - 3, 0, Math.PI * 2);
  ctx.fill();
  
  // Glow when enabled
  if (enabled) {
    ctx.save();
    ctx.shadowColor = AudioGUI.accentColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(thumbX, y + h / 2, h / 2 - 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INPUT HANDLING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Handle mouse/touch input for audio GUI
 * Call this from your input handler
 * 
 * @param {number} x - Mouse/touch X position
 * @param {number} y - Mouse/touch Y position
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @returns {boolean} - True if input was handled by GUI
 */
function handleAudioGUIClick(x, y, canvasWidth, canvasHeight) {
  // Handle music player clicks
  if (AudioGUIState.musicPlayerVisible) {
    const playerHandled = handleMusicPlayerClick(x, y, canvasWidth, canvasHeight);
    if (playerHandled) return true;
  }
  
  // Handle settings panel clicks
  if (AudioGUIState.isVisible) {
    return handleSettingsPanelClick(x, y, canvasWidth, canvasHeight);
  }
  
  return false;
}

/**
 * Handle music player clicks
 */
function handleMusicPlayerClick(x, y, canvasWidth, canvasHeight) {
  const px = canvasWidth - AudioGUI.playerWidth - 20;
  const py = 20;
  const buttonY = py + 65;
  const buttonSize = 12;
  const buttonSpacing = 40;
  const centerX = px + AudioGUI.playerWidth / 2;
  
  // Check if click is in player area
  if (x < px || x > px + AudioGUI.playerWidth || y < py || y > py + AudioGUI.playerHeight) {
    return false;
  }
  
  // Previous button
  if (Math.abs(x - (centerX - buttonSpacing)) < buttonSize && Math.abs(y - buttonY) < buttonSize) {
    window.AudioControl?.playPreviousTrack();
    return true;
  }
  
  // Play/Pause button
  if (Math.abs(x - centerX) < buttonSize && Math.abs(y - buttonY) < buttonSize) {
    const musicState = window.AudioControl?.getMusicState();
    if (musicState?.isPaused) {
      window.AudioControl?.resumeMusic();
    } else {
      window.AudioControl?.pauseMusic();
    }
    return true;
  }
  
  // Next button
  if (Math.abs(x - (centerX + buttonSpacing)) < buttonSize && Math.abs(y - buttonY) < buttonSize) {
    window.AudioControl?.playNextTrack();
    return true;
  }
  
  return true; // Consumed click (inside player area)
}

/**
 * Handle settings panel clicks
 */
function handleSettingsPanelClick(x, y, canvasWidth, canvasHeight) {
  const panelX = (canvasWidth - AudioGUI.panelWidth) / 2;
  const panelY = (canvasHeight - AudioGUI.panelHeight) / 2;
  
  // Check if click is in panel area
  if (x < panelX || x > panelX + AudioGUI.panelWidth || 
      y < panelY || y > panelY + AudioGUI.panelHeight) {
    return false;
  }
  
  const leftMargin = panelX + AudioGUI.panelPadding;
  let currentY = panelY + 95; // Start of sliders
  
  // Check sliders (master, music, sfx)
  const sliders = ['master', 'music', 'sfx'];
  for (const slider of sliders) {
    currentY += 25;
    if (y >= currentY - 10 && y <= currentY + 10) {
      handleSliderDrag(x, leftMargin, slider);
      return true;
    }
    currentY += 35;
  }
  
  // Check toggles
  currentY += 40;
  const toggles = [
    'laserEnabled', 'ricochetEnabled', 'boostEnabled', 'explosionEnabled', 'menuEnabled', 'musicEnabled',
  ];
  
  for (const toggle of toggles) {
    if (y >= currentY && y <= currentY + 30) {
      window.AudioControl?.toggleCategory(toggle.replace('Enabled', ''));
      return true;
    }
    currentY += 35;
  }
  
  // Check advanced toggles
  currentY += 40;
  const advanced = ['spatialAudio', 'audioDucking', 'crossfade', 'allowIncomingMusic'];
  
  for (const toggle of advanced) {
    if (y >= currentY && y <= currentY + 30) {
      window.AudioControl?.toggleCategory(toggle);
      return true;
    }
    currentY += 35;
  }
  
  return true; // Consumed click (inside panel)
}

/**
 * Handle slider drag
 */
function handleSliderDrag(x, leftMargin, type) {
  const sliderX = leftMargin;
  const sliderWidth = AudioGUI.sliderWidth;
  
  const value = Math.max(0, Math.min(1, (x - sliderX) / sliderWidth));
  
  if (type === 'master') {
    window.AudioControl?.setMasterVolume(value);
  } else if (type === 'music') {
    window.AudioControl?.setMusicVolume(value);
  } else if (type === 'sfx') {
    window.AudioControl?.setSFXVolume(value);
  }
}

/**
 * Toggle settings panel visibility
 * Call this from keyboard handler (e.g., 'S' key)
 */
function toggleAudioSettings() {
  AudioGUIState.isVisible = !AudioGUIState.isVisible;
}

/**
 * Toggle music player visibility
 */
function toggleMusicPlayer() {
  AudioGUIState.musicPlayerVisible = !AudioGUIState.musicPlayerVisible;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

window.AudioGUI = {
  // Rendering
  render: renderAudioGUI,
  
  // Input handling
  handleClick: handleAudioGUIClick,
  
  // Visibility
  toggleSettings: toggleAudioSettings,
  togglePlayer: toggleMusicPlayer,
  
  // State
  isVisible: () => AudioGUIState.isVisible,
  setVisible: (visible) => { AudioGUIState.isVisible = visible; },
};
