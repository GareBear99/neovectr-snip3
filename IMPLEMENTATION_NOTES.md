# NEO-VECTR ∞SNIP3 - CRITICAL IMPLEMENTATION NOTES

## IMMEDIATE ACTIONS COMPLETED
✅ Moved `game song AMEN BREAK - 172BPM AMajor (1).wav` → `audio/game-loop-172bpm.wav`
✅ Moved `MenuOptionSelectSound.mp3` → `audio/menu-select.mp3`
✅ Moved `menuoptionswitchingsound.mp3` → `audio/menu-switch.mp3`
✅ **FIXED: Motto text positioning** - "FORGED IN SILENCE • BORN OF NEON" now positioned at top of screen, above HUD overlay (lines 2334-2339, 2363-2367, 2770-2776)

## CRITICAL CODE FIXES NEEDED

### 1. SEAMLESS AUDIO LOOPING (Priority 1)

**Location:** Line ~1358-1392 in audio/index_pie_slice_production_pause_settings_final_v3_spawnfix_v5.html

**Problem:** Current HTML5 Audio has gap on loop restart due to decode/reload

**Solution:** Use WebAudio BufferSource for gapless loops

```javascript
// Add after line 1226 (after menuMusicEl declaration)
let gameLoopBuffer = null;
let gameLoopSource = null;
let gameLoopGain = null;
let gameLoopStartTime = 0;

async function loadGameLoop() {
  if (!AUDIO.ctx) AUDIO.ensureCtx();
  if (gameLoopBuffer) return gameLoopBuffer;
  
  try {
    const res = await fetch('audio/game-loop-172bpm.wav');
    const arrayBuffer = await res.arrayBuffer();
    gameLoopBuffer = await AUDIO.ctx.decodeAudioData(arrayBuffer);
    log('INFO', `Game loop loaded: ${gameLoopBuffer.duration.toFixed(2)}s`);
    return gameLoopBuffer;
  } catch(e) {
    log('ERROR', `Game loop load failed: ${e}`);
    return null;
  }
}

function startGameLoop() {
  if (!_audioUnlocked || !AUDIO.ctx) return;
  stopGameLoop(); // Clean stop any existing
  
  loadGameLoop().then(buffer => {
    if (!buffer) return;
    
    gameLoopSource = AUDIO.ctx.createBufferSource();
    gameLoopSource.buffer = buffer;
    gameLoopSource.loop = true; // Seamless loop!
    gameLoopSource.loopStart = 0;
    gameLoopSource.loopEnd = buffer.duration;
    
    gameLoopGain = AUDIO.ctx.createGain();
    gameLoopGain.gain.value = settings.musicVol || 0.70;
    
    gameLoopSource.connect(gameLoopGain);
    gameLoopGain.connect(AUDIO.masterGain);
    
    gameLoopStartTime = AUDIO.ctx.currentTime;
    gameLoopSource.start(0);
    log('INFO', 'Game loop started (seamless)');
  });
}

function stopGameLoop() {
  if (gameLoopSource) {
    try { gameLoopSource.stop(); } catch {}
    gameLoopSource = null;
  }
}

function pauseGameLoop() {
  if (gameLoopGain) gameLoopGain.gain.value = 0;
}

function resumeGameLoop() {
  if (gameLoopGain) gameLoopGain.gain.value = settings.musicVol || 0.70;
}
```

**Usage:**
```javascript
// In menuItemsMain() ∞SNIP3 action (line ~2375):
{ labelFn: (now) => snip3MenuLabel(now), action: () => { 
  stopMenuMusic(); 
  startGameLoop(); // ADD THIS
  gameMode = 'SNIP3'; 
  appMode = 'GAME'; 
  // ... rest
}}

// In pause mode (line ~3524):
if (appMode === 'PAUSE') {
  // Don't stop music, just duck volume
  if (keys.has('Escape') && !prevEsc) {
    appMode = 'GAME';
    resumeGameLoop(); // ADD THIS
  }
}

// When entering pause (line ~3658):
if (keys.has('Escape')) {
  appMode = 'PAUSE';
  pauseGameLoop(); // ADD THIS - don't stop, just mute
  // ...
}
```

### 2. FIX SEED SYSTEM FOR PER-SLICE DETERMINISM (Priority 2)

**Location:** Line 948-975 in audio/index_pie_slice_production_pause_settings_final_v3_spawnfix_v5.html

**Problem:** Barriers use global `rand()`, so changing player count changes ALL barrier positions

**Solution:** Seed per-slice using slice index

```javascript
function initBarriers(){
  barriers.length = 0;
  const a = arena();
  
  // Save global RNG state
  const savedRandState = rand;
  
  for (let i=0;i<playerCount;i++){
    const angMin = (TAU * i) / playerCount;
    const angMax = (TAU * (i+1)) / playerCount;
    const mid = (angMin + angMax) * 0.5;
    const span = (angMax - angMin);
    
    // CRITICAL: Reseed RNG for THIS slice using deterministic hash
    const sliceSeed = currentSeed + `-SLICE${i}`;
    const h = xmur3(sliceSeed);
    rand = mulberry32(h());
    
    // Now rand() is deterministic for this slice
    const baseR = a.r * randRange(0.52, 0.62);
    const rot = randRange(-span*0.12, span*0.12);
    const delta = span * randRange(0.16, 0.28);
    const r = baseR * randRange(0.92, 1.06);
    
    const a0 = mid - delta + rot;
    const a1 = mid + delta + rot;
    
    // Clamp to slice bounds (critical for visual correctness)
    const margin = span * 0.05;
    const clampedA0 = clamp(a0, angMin + margin, angMax - margin - (a1-a0));
    const clampedA1 = clampedA0 + (a1 - a0);
    
    const x0 = a.cx + Math.cos(clampedA0)*r;
    const y0 = a.cy + Math.sin(clampedA0)*r;
    const x1 = a.cx + Math.cos(clampedA1)*r;
    const y1 = a.cy + Math.sin(clampedA1)*r;
    
    barriers.push({ slice:i, x0,y0,x1,y1, r });
  }
  
  // Restore global RNG
  rand = savedRandState;
}
```

**Testing:**
```javascript
// Add to log on init (line ~1065):
log('INFO', `Barriers: ${barriers.map(b => `S${b.slice}:${b.x0.toFixed(0)},${b.y0.toFixed(0)}`).join(' | ')}`);
```

### 3. ADD PAUSE MENU ITEMS (Priority 3)

**Location:** Add after line 2503 (after menuItemsCredits)

```javascript
function pauseItems(){
  return [
    { label: 'RESUME', action: ()=> { 
      appMode = 'GAME'; 
      resumeGameLoop(); 
      keys.delete('Escape'); 
      playMenuSelectSfx(); 
    }},
    { label: 'RESTART (SAME SEED)', action: ()=> { 
      playMenuSelectSfx();
      // Reset game with current seed
      resetP1Systems(); 
      setSeed(currentSeed); // Keep same seed!
      initBarriers();
      initPlayers(); 
      appMode = 'GAME'; 
      resumeGameLoop();
      log('INFO', `Restarted with seed: ${currentSeed}`);
    }},
    { label: 'SETTINGS', action: ()=> { 
      appMode = 'PAUSE_SETTINGS'; 
      menuSel = 0; 
      playMenuSwitchSfx(); 
    }},
    { label: 'QUIT TO MENU', action: ()=> { 
      stopGameLoop(); 
      startMenuMusic(); 
      appMode = 'MENU'; 
      menuPage = 'MAIN'; 
      menuSel = 0; 
      playMenuSelectSfx(); 
    }},
  ];
}
```

**Update pause rendering (line ~3524-3584):**
```javascript
if (appMode === 'PAUSE') {
  const items = pauseItems();
  
  // Navigation (same as menu)
  const up = keys.has('ArrowUp');
  const down = keys.has('ArrowDown');
  const enter = keys.has('Enter');
  const esc = keys.has('Escape');
  
  if (up && !prevMenuUp) pauseSel = (pauseSel - 1 + items.length) % items.length;
  if (down && !prevMenuDown) pauseSel = (pauseSel + 1) % items.length;
  if (enter && !prevMenuEnter) items[pauseSel].action();
  if (esc && !prevMenuEsc) items[0].action(); // ESC = Resume
  
  prevMenuUp = up; prevMenuDown = down; prevMenuEnter = enter; prevMenuEsc = esc;
  
  // Render frozen game + overlay
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000';
  ctx.fillRect(0,0,canvas.width, canvas.height);
  
  drawCrosshair();
  drawArenaRing();
  drawPlayerSlices();
  drawBarriers();
  
  for (const p of players) drawPlayerTrail(p);
  drawLasers();
  drawSparks();
  for (let i=0;i<players.length;i++) drawPlayerShip(players[i], i===0);
  
  // Dark overlay
  ctx.fillStyle = 'rgba(0,0,0,0.70)';
  ctx.fillRect(0,0,canvas.width, canvas.height);
  
  // Draw pause menu (reuse menu rendering)
  const a = arena();
  const fs = Math.floor(Math.min(canvas.width, canvas.height) * 0.10);
  
  drawTubeText('PAUSED', a.cx, a.cy*0.40, fs*0.80, 'rgba(175,75,255,ALPHA)', 1.0, 0.14, TITLE_INNER_PALETTE);
  
  const layout = menuLayout('PAUSE', items.length);
  const baseY = layout.baseY;
  const stepY = layout.stepY;
  const t = performance.now() * 0.001;
  
  for (let i=0;i<items.length;i++){
    const y = baseY + i*stepY;
    const isSel = i === pauseSel;
    const glow = isSel ? 0.35 + 0.25*Math.sin(t*6.0) : 0.10;
    
    ctx.globalCompositeOperation = 'lighter';
    ctx.font = `${isSel ? 800 : 650} ${Math.floor(fs*0.36)}px system-ui`;
    ctx.fillStyle = `rgba(120,255,255,${glow})`;
    if (isSel) ctx.fillText('▶', a.cx - fs*2.0, y);
    ctx.fillText(items[i].label, a.cx, y);
  }
  
  ctx.globalCompositeOperation = 'source-over';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font = `500 ${Math.floor(fs*0.22)}px system-ui`;
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillText('↑/↓ navigate • ENTER select • ESC resume', a.cx, canvas.height - fs*0.22);
  
  applyBrightnessPass();
  requestAnimationFrame(frameLoop);
  return;
}
```

### 4. FIX AUDIO PATHS (Priority 4)

**Location:** Lines 1192-1208

**Change:**
```javascript
// OLD:
const RICOCHET_SOUND_SRC = 'laser-45816.mp3';
const MENU_SWITCH_SOUND_SRC = 'menuoptionswitchingsound.mp3';
const MENU_SELECT_SOUND_SRC = 'MenuOptionSelectSound.mp3';

// NEW:
const RICOCHET_SOUND_SRC = 'audio/laser-45816.mp3';
const SHOOT_SOUND_SRC    = 'audio/laser-gun-81720.mp3';
const BOOST_SOUND_SRC    = 'audio/rayo-laser-101851.mp3';
const ZAP_SOUND_SRC      = 'audio/laser-zap-2-90669.mp3';
const MENU_SWITCH_SOUND_SRC = 'audio/menu-switch.mp3';
const MENU_SELECT_SOUND_SRC = 'audio/menu-select.mp3';
const BOOT_SOUND_SRC     = 'audio/the-moses-laser-cannon-182841.mp3';
const MENU_MUSIC_SRC_PRIMARY   = 'audio/53679.mp3';
const MENU_MUSIC_SRC_FALLBACK  = 'audio/53679.mp3'; // Same file
```

### 5. UNIFIED MENU SYSTEM (Priority 5)

**Location:** Add before line 2567 (before drawSettingsScreen)

```javascript
// Generic menu renderer - DRY principle
function drawGenericMenu(options) {
  const {
    items,          // Array of menu items
    title,          // Title text (string or null)
    subtitle,       // Subtitle text (string or null)
    selectedIndex,  // Currently selected item index
    page,           // Page name for layout ('MENU', 'PAUSE', 'SETTINGS')
    showHelp = true // Show help text at bottom
  } = options;
  
  const a = arena();
  const now = performance.now();
  const t = now * 0.001;
  const pulse = 0.12 + 0.06*Math.sin(t*2.0);
  
  // Background
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000';
  ctx.fillRect(0,0,canvas.width, canvas.height);
  
  const grd = ctx.createRadialGradient(a.cx, a.cy, a.r*0.1, a.cx, a.cy, a.r*1.25);
  grd.addColorStop(0, 'rgba(40,0,70,0.40)');
  grd.addColorStop(1, 'rgba(0,0,0,0.98)');
  ctx.fillStyle = grd;
  ctx.fillRect(0,0,canvas.width, canvas.height);
  
  const fs = Math.floor(Math.min(canvas.width, canvas.height) * 0.10);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Title (neon tubes)
  if (title) {
    const titleSize = (page === 'PAUSE' ? fs*0.80 : fs*0.70);
    const titleY = (page === 'PAUSE' ? a.cy*0.40 : a.cy*0.52);
    drawTubeText(title, a.cx, titleY, titleSize, 'rgba(175,75,255,ALPHA)', 0.85 + 0.20*pulse, 0.14, TITLE_INNER_PALETTE);
  }
  
  // Subtitle (system font)
  if (subtitle) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = `600 ${Math.floor(fs*0.22)}px system-ui`;
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillText(subtitle, a.cx, a.cy*0.61);
  }
  
  // Menu items
  const layout = menuLayout(page, items.length);
  const baseY = layout.baseY;
  const stepY = layout.stepY;
  
  for (let i=0;i<items.length;i++){
    const y = baseY + i*stepY;
    const isSel = i === selectedIndex;
    const glow = isSel ? 0.35 + 0.25*Math.sin(t*6.0) : 0.10;
    
    ctx.globalCompositeOperation = 'lighter';
    ctx.font = `${isSel ? 800 : 650} ${Math.floor(fs*0.34)}px system-ui`;
    ctx.fillStyle = `rgba(120,255,255,${glow})`;
    
    const label = items[i].labelFn ? items[i].labelFn(now) : items[i].label;
    
    if (isSel) {
      const metrics = ctx.measureText(label);
      const leftEdge = a.cx - metrics.width*0.5;
      ctx.fillText('▶', leftEdge - fs*0.32, y);
    }
    
    ctx.fillText(label, a.cx, y);
    ctx.globalCompositeOperation = 'source-over';
  }
  
  // Help text
  if (showHelp) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = `500 ${Math.floor(fs*0.22)}px system-ui`;
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    const helpText = page === 'PAUSE' ? 
      '↑/↓ navigate • ENTER select • ESC resume' :
      'ENTER/CLICK: select • ↑/↓: navigate • ESC: back';
    ctx.fillText(helpText, a.cx, canvas.height - fs*0.22);
  }
  
  applyBrightnessPass();
}
```

**Then update all menu renderers to use this:**
```javascript
// drawMenuScreen becomes:
function drawMenuScreen(now){
  drawGenericMenu({
    items: menuItems(),
    title: 'NEO-VECTR',
    subtitle: 'INC • ARCADE SYSTEMS',
    selectedIndex: menuSel,
    page: 'MENU'
  });
}

// drawSettingsScreen becomes:
function drawSettingsScreen(now){
  drawGenericMenu({
    items: menuItems(),
    title: 'SETTINGS',
    subtitle: 'Advanced lighting & co-op configuration',
    selectedIndex: menuSel,
    page: 'SETTINGS'
  });
}

// Pause screen uses same system
```

## TESTING CHECKLIST

### Audio Loop Test
1. Open game in browser
2. Start ∞SNIP3 mode
3. Listen for 5 minutes - should be ZERO gaps/clicks on loop restart
4. Check browser console for "Game loop started (seamless)"

### Seed Determinism Test
1. Settings → Seed → Enter "TEST123"
2. Start 4-player VS, screenshot arena layout
3. ESC → Quit → Settings → Players → 8
4. Start 8-player VS with seed "TEST123"
5. Compare: First 4 slices should have identical barriers

### Pause Menu Test
1. Start any game mode
2. Press ESC → Should show "PAUSED" with 4 options
3. Navigate with arrows, select with Enter
4. Test "Restart" - should use same seed
5. Test "Settings" - should open settings submenu
6. Test "Resume" - music should continue from pause point

### Menu Navigation Test
1. Navigate Main → Settings → Back using only keyboard
2. Repeat using only mouse clicks
3. Repeat using only gamepad (D-pad + A)
4. All three methods should work identically

## KNOWN ISSUES AFTER FIXES

1. **∞SNIP3 mode still has no enemies** - Requires enemy system implementation
2. **VS mode win condition incomplete** - Requires round/match system
3. **No HUD for lives/score** - Requires gameplay HUD
4. **Slice resize on elimination not implemented** - Requires animation system

These are documented in the main plan and will be addressed in Phase 2.

## FILE STATUS
- ✅ `audio/game-loop-172bpm.wav` - Added (15MB)
- ✅ `audio/menu-select.mp3` - Moved from root
- ✅ `audio/menu-switch.mp3` - Moved from root
- ⚠️ `index.html` (root) - Needs update with all above fixes
- ⚠️ `audio/index_pie_slice_production_pause_settings_final_v3_spawnfix_v5.html` - Should be deprecated after fixes merged

## NEXT SESSION PRIORITIES
1. Apply all code fixes above to create new consolidated `index.html`
2. Test audio looping (most critical for feel)
3. Test seed determinism with multiple player counts
4. Add enemy spawn system (Phase 2, see main plan)
