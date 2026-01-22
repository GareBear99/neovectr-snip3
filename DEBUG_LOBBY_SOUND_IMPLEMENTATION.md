# DEBUG HUD + LOBBY OVERLAY + GRANULAR SOUND CONTROLS
## Complete Implementation Guide

---

## PART 1: DEBUG HUD AUTO-HIDE & CAPSLOCK+TAB TOGGLE

### 1.1 Update Settings Object (Line ~247-261)
```javascript
const settings = {
  brightness: 0.00,
  musicVol: 0.70,
  sfxVol: 0.85,
  
  // NEW: Granular sound controls
  sfxLaserFire: true,      // Your laser shots
  sfxLaserRicochet: true,  // Bounce sounds
  sfxBoost: true,          // Boost dash
  sfxExplosions: true,      // Zap/boom
  sfxMenu: true,            // Menu click/select
  
  coop: false,
  lobbyPrivate: false,
  lobbyPassword: '',
  snip3Hud: true,
  seedStr: '',
  seedOverlay: true,
  debugOnMenu: true,       // Show debug during menus
  debugHudVisible: true,   // NEW: Current HUD visibility state
};
```

### 1.2 Enhanced setDebugVisible Function (Replace line ~451-455)
```javascript
let debugVisible = true;

function setDebugVisible(v){
  debugVisible = !!v;
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = debugVisible ? 'block' : 'none';
  settings.debugHudVisible = debugVisible;
  saveSettings(); // Persist state
  log('INFO', `Debug HUD: ${debugVisible ? 'VISIBLE' : 'HIDDEN'}`);
}
```

### 1.3 Auto-Hide on Gameplay Start (Add to game mode transitions)
```javascript
// In menuItemsMain() ∞SNIP3 action (line ~2375):
{ labelFn: (now) => snip3MenuLabel(now), action: () => { 
  stopMenuMusic(); 
  gameMode = 'SNIP3'; 
  appMode = 'GAME'; 
  menuPage='MAIN'; 
  setPlayerCount(1); 
  resetP1Systems(); 
  setDebugVisible(false); // AUTO-HIDE when entering game
  setSeed(settings.seedStr); 
  initPlayers(); 
  log('INFO','Mode: ∞ SNIP3 (infinite sniper)'); 
}},

// In menuItemsVSPre() LOCAL VS action (line ~2385):
{ label: 'LOCAL VS', action: () => { 
  stopMenuMusic(); 
  gameMode = 'VS'; 
  appMode = 'GAME'; 
  menuPage = 'MAIN'; 
  resetP1Systems(); 
  setDebugVisible(false); // AUTO-HIDE when entering game
  setSeed(settings.seedStr); 
  initPlayers(); 
  log('INFO','Mode: VS (Local)'); 
}},
```

### 1.4 CapsLock+Tab Toggle (Replace existing CapsLock handler, line ~776-796)
```javascript
// CapsLock tracking (some browsers can be flaky if we only check inside one chord)
let capsLockOn = false;
let prevTabHeld = false;

function refreshCapsLock(e){
  try{
    capsLockOn = !!(e && e.getModifierState && e.getModifierState('CapsLock'));
  }catch(_){
    // ignore
  }
}

window.addEventListener('keydown', (e) => {
  refreshCapsLock(e);

  // CapsLock + Tab toggles debug HUD (ONLY when CapsLock is ON)
  const tabPressed = (e.key === 'Tab' || e.code === 'Tab');
  
  if (tabPressed && capsLockOn && !prevTabHeld) {
    e.preventDefault(); // Prevent browser tab switching
    setDebugVisible(!debugVisible);
    settings.debugOnMenu = debugVisible;
    saveSettings();
    log('INFO', `Debug HUD: ${debugVisible ? 'ON' : 'OFF'} (CapsLock+Tab)`);
    prevTabHeld = true;
    return;
  }
  
  // Tab WITHOUT CapsLock = Lobby overlay (handled separately, see Part 2)
  if (tabPressed && !capsLockOn) {
    e.preventDefault();
    // Show lobby overlay (implemented in Part 2)
    showLobbyOverlay();
    prevTabHeld = true;
    return;
  }

  // Optional: pressing CapsLock itself logs the state once (useful on macOS)
  if (e.key === 'CapsLock') {
    log('INFO', `CapsLock: ${capsLockOn ? 'ON' : 'OFF'}`);
  }

  keys.add(e.code);
}, { capture: true });

window.addEventListener('keyup', (e) => {
  refreshCapsLock(e);
  const tabReleased = (e.key === 'Tab' || e.code === 'Tab');
  if (tabReleased) {
    prevTabHeld = false;
    hideLobbyOverlay(); // Hide lobby when Tab released
  }
  keys.delete(e.code);
}, { capture: true });
```

### 1.5 Load Persisted State on Init (Add after line ~458)
```javascript
// Initialize persisted settings (must occur after settings + setDebugVisible exist)
loadSettings();

// Restore debug HUD visibility from saved state
if (settings.hasOwnProperty('debugHudVisible')) {
  setDebugVisible(settings.debugHudVisible);
} else {
  setDebugVisible(true); // Default: visible
}

// Auto-hide after boot completes unless user enables debugOnMenu
let _bootAutoHideTimer = null;
function scheduleBootAutoHide(){
  if(_bootAutoHideTimer) return;
  _bootAutoHideTimer = setTimeout(()=>{ 
    try{ 
      if(!settings.debugOnMenu && appMode === 'MENU') {
        setDebugVisible(false); 
      }
    }catch(e){} 
  }, 2500);
}
```

---

## PART 2: LOBBY OVERLAY (TAB IN-GAME)

### 2.1 Lobby Overlay State Variables (Add after line ~490)
```javascript
// Lobby overlay (Tab during gameplay)
let lobbyOverlayVisible = false;
let lobbyOverlayTimer = 0;
const LOBBY_OVERLAY_DURATION = 3.0; // seconds
```

### 2.2 Simulated Ping System (Add before showLobbyOverlay)
```javascript
// Simulated ping for local players (realistic 20-80ms range)
function getPlayerPing(playerId) {
  // In real online game, this would query actual network latency
  // For now, simulate based on player ID (deterministic)
  const basePing = 25;
  const variance = playerId * 7; // Slight variation per player
  return basePing + variance + Math.floor(Math.random() * 15);
}
```

### 2.3 Show/Hide Lobby Overlay Functions (Add after line ~520)
```javascript
function showLobbyOverlay(){
  if (appMode !== 'GAME') return; // Only in gameplay
  lobbyOverlayVisible = true;
  lobbyOverlayTimer = LOBBY_OVERLAY_DURATION;
  log('INFO', 'Lobby overlay: SHOWN');
}

function hideLobbyOverlay(){
  lobbyOverlayVisible = false;
  log('INFO', 'Lobby overlay: HIDDEN');
}

function updateLobbyOverlay(dt){
  if (!lobbyOverlayVisible) return;
  
  lobbyOverlayTimer -= dt;
  if (lobbyOverlayTimer <= 0) {
    hideLobbyOverlay();
  }
}
```

### 2.4 Draw Lobby Overlay (Add after drawTouchSticks, line ~1872)
```javascript
function drawLobbyOverlay(){
  if (!lobbyOverlayVisible || appMode !== 'GAME') return;
  
  const a = arena();
  const w = Math.min(canvas.width * 0.28, 320);
  const h = Math.min(canvas.height * 0.55, playerCount * 45 + 80);
  const x = canvas.width - w - 20; // Top-right corner
  const y = 20;
  
  // Semi-transparent background
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(x, y, w, h);
  
  // Border glow
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(120,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  
  // Header
  ctx.globalCompositeOperation = 'source-over';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `700 18px system-ui`;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fillText(`LOBBY (${playerCount}/8)`, x + w/2, y + 12);
  
  // Divider line
  ctx.strokeStyle = 'rgba(120,255,255,0.20)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 40);
  ctx.lineTo(x + w - 10, y + 40);
  ctx.stroke();
  
  // Player list
  ctx.textAlign = 'left';
  ctx.font = `600 14px ui-monospace, monospace`;
  const aliveCount = players.filter(p => p.alive).length;
  
  for (let i = 0; i < playerCount; i++) {
    const p = players[i];
    const py = y + 50 + i * 35;
    
    // Player number
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(`P${i+1}`, x + 15, py);
    
    // Color indicator (circle)
    ctx.fillStyle = `rgb(${p.color.r},${p.color.g},${p.color.b})`;
    ctx.beginPath();
    ctx.arc(x + 50, py + 7, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Ping (simulated)
    const ping = getPlayerPing(i);
    ctx.fillStyle = ping < 50 ? 'rgba(80,255,140,0.85)' : 
                    ping < 80 ? 'rgba(255,220,80,0.85)' : 
                    'rgba(255,90,90,0.85)';
    ctx.fillText(`${ping}ms`, x + 70, py);
    
    // Status
    const status = p.alive ? 'ALIVE' : 'DEAD';
    ctx.fillStyle = p.alive ? 'rgba(80,255,140,0.85)' : 'rgba(255,90,90,0.65)';
    ctx.fillText(status, x + 130, py);
  }
  
  // Footer hint
  ctx.textAlign = 'center';
  ctx.font = `500 11px system-ui`;
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('Hold TAB to view', x + w/2, y + h - 18);
}
```

### 2.5 Integrate into Game Loop (Add to step() function, line ~2975)
```javascript
function step(dt){
  tSec += dt;
  
  // Update lobby overlay timer
  updateLobbyOverlay(dt);
  
  // ... rest of step function
}
```

### 2.6 Render Lobby Overlay (Add to main render loop, after drawTouchSticks, line ~3654)
```javascript
drawTouchSticks();
drawLobbyOverlay(); // NEW: Draw lobby overlay if visible

applyBrightnessPass();
```

---

## PART 3: GRANULAR SOUND SETTINGS

### 3.1 Update SFX Play Functions (Replace existing, lines ~1559-1605)
```javascript
function playRicochetSfx(){
  if (!_audioUnlocked || !settings.sfxLaserRicochet) return; // Check setting
  initSfxPools();
  const a = _ricPool[_ricIdx++ % _ricPool.length];
  try { 
    a.volume = Math.max(0, Math.min(1, 0.60 * (settings.sfxVol || 0.85))); // Apply master SFX vol
    a.pause(); 
    a.currentTime = 0; 
    a.play().catch(()=>{}); 
  } catch {}
}

function playShootSfx(){
  if (!_audioUnlocked || !settings.sfxLaserFire) return; // Check setting
  initSfxPools();
  const a = _shootPool[_shootIdx++ % _shootPool.length];
  try { 
    a.volume = Math.max(0, Math.min(1, 0.55 * (settings.sfxVol || 0.85)));
    a.pause(); 
    a.currentTime = 0; 
    a.play().catch(()=>{}); 
  } catch {}
}

function playBoostSfx(){
  if (!_audioUnlocked || !settings.sfxBoost) return; // Check setting
  initSfxPools();
  const a = _boostPool[_boostIdx++ % _boostPool.length];
  try { 
    a.volume = Math.max(0, Math.min(1, 0.65 * (settings.sfxVol || 0.85)));
    a.pause(); 
    a.currentTime = 0; 
    a.play().catch(()=>{}); 
  } catch {}
}

function playZapSfx(){
  if (!_audioUnlocked || !settings.sfxExplosions) return; // Check setting
  initSfxPools();
  const a = _zapPool[_zapIdx++ % _zapPool.length];
  try { 
    a.volume = Math.max(0, Math.min(1, 0.70 * (settings.sfxVol || 0.85)));
    a.pause(); 
    a.currentTime = 0; 
    a.play().catch(()=>{}); 
  } catch {}
}

// Menu SFX: switch vs select (semantic split)
function _menuSfxOk(){
  if (!_audioUnlocked || !settings.sfxMenu) return false; // Check setting
  const now = performance.now();
  if (now - _menuSfxLastT < _MENU_SFX_DEBOUNCE_MS) return false;
  _menuSfxLastT = now;
  return true;
}

function playMenuSwitchSfx(){
  if (!_menuSfxOk()) return;
  initSfxPools();
  const a = _menuSwitchPool[_menuSwitchIdx++ % _menuSwitchPool.length];
  try { 
    a.volume = Math.max(0, Math.min(1, 0.55 * (settings.sfxVol || 0.85)));
    a.pause(); 
    a.currentTime = 0; 
    a.play().catch(()=>{}); 
  } catch {}
}

function playMenuSelectSfx(){
  if (!_menuSfxOk()) return;
  initSfxPools();
  const a = _menuSelectPool[_menuSelectIdx++ % _menuSelectPool.length];
  try { 
    a.volume = Math.max(0, Math.min(1, 0.60 * (settings.sfxVol || 0.85)));
    a.pause(); 
    a.currentTime = 0; 
    a.play().catch(()=>{}); 
  } catch {}
}

function playBoost(){ playBoostSfx(); }
```

### 3.2 Add Granular Settings Menu Items (Add to menuItemsSettings, after line ~2493)
```javascript
function menuItemsSettings(){
  const onOff = (v) => v ? 'ON' : 'OFF';
  const pubPriv = (v) => v ? 'PRIVATE' : 'PUBLIC';
  const pct = (v) => `${Math.round((v||0)*100)}%`;
  const brightPct = () => {
    const b = Math.max(-0.30, Math.min(0.30, settings.brightness||0));
    const sign = b>=0 ? '+' : '−';
    return `${sign}${Math.round(Math.abs(b)*100)}%`;
  };

  return [
    { kind:'action', key:'seed', labelFn: () => `SEED: ${settings.seedStr ? settings.seedStr : 'AUTO'}  (ENTER)`,
      action: ()=> {
        const cur = settings.seedStr || '';
        const v = prompt('Set map/run seed (shared across all modes). Leave blank for AUTO.', cur);
        if (v === null) return;
        const s = String(v).trim();
        settings.seedStr = s;
        setSeed(s || '');
        initPlayers();
        resetP1Systems();
        saveSettings();
        log('INFO', `Seed set: ${currentSeed}`);
      }
    },
    { kind:'toggle', key:'seedOverlay', labelFn: () => `SHOW SEED ON START: ${onOff(settings.seedOverlay)}`,
      action: ()=> { settings.seedOverlay = !settings.seedOverlay; saveSettings(); log('INFO',`Seed overlay: ${onOff(settings.seedOverlay)}`); }
    },
    { kind:'slider', key:'players', labelFn: () => `PLAYERS: ${playerCount}`, min:1, max:8, step:1,
      onLeft: ()=> setPlayerCount(playerCount-1),
      onRight: ()=> setPlayerCount(playerCount+1),
      dragFn: (t)=> { const v = 1 + Math.round(t*7); setPlayerCount(v); },
      action: ()=> { /* no-op */ }
    },
    { kind:'toggle', key:'coop', labelFn: () => `CO-OP: ${onOff(settings.coop)}`,
      action: ()=> { settings.coop = !settings.coop; if (settings.coop && playerCount < 2) setPlayerCount(2); saveSettings(); log('INFO',`CO-OP: ${onOff(settings.coop)}`); }
    },
    { kind:'slider', key:'brightness', labelFn: () => `BRIGHTNESS: ${brightPct()}`,
      onLeft: ()=> { settings.brightness = Math.max(-0.30, (settings.brightness||0) - 0.02); saveSettings(); },
      onRight: ()=> { settings.brightness = Math.min( 0.30, (settings.brightness||0) + 0.02); saveSettings(); },
      dragFn: (t)=> { settings.brightness = -0.30 + 0.60*t; saveSettings(); },
      action: ()=> {}
    },
    { kind:'slider', key:'music', labelFn: () => `MUSIC VOL: ${pct(settings.musicVol)}`,
      onLeft: ()=> { settings.musicVol = Math.max(0, (settings.musicVol||0) - 0.05); if (menuMusicEl) menuMusicEl.volume = settings.musicVol; saveSettings(); },
      onRight: ()=> { settings.musicVol = Math.min(1, (settings.musicVol||0) + 0.05); if (menuMusicEl) menuMusicEl.volume = settings.musicVol; saveSettings(); },
      dragFn: (t)=> { settings.musicVol = clamp(t,0,1); if (menuMusicEl) menuMusicEl.volume = settings.musicVol; saveSettings(); },
      action: ()=> {}
    },
    { kind:'slider', key:'sfx', labelFn: () => `SFX MASTER: ${pct(settings.sfxVol)}`,
      onLeft: ()=> { settings.sfxVol = Math.max(0, (settings.sfxVol||0) - 0.05); refreshSfxVolumes(); saveSettings(); },
      onRight: ()=> { settings.sfxVol = Math.min(1, (settings.sfxVol||0) + 0.05); refreshSfxVolumes(); saveSettings(); },
      dragFn: (t)=> { settings.sfxVol = clamp(t,0,1); refreshSfxVolumes(); saveSettings(); },
      action: ()=> {}
    },
    
    // NEW: Granular SFX controls
    { kind:'toggle', key:'sfxLaserFire', labelFn: () => `  ↳ LASER FIRE: ${onOff(settings.sfxLaserFire)}`,
      action: ()=> { settings.sfxLaserFire = !settings.sfxLaserFire; saveSettings(); log('INFO',`Laser fire SFX: ${onOff(settings.sfxLaserFire)}`); }
    },
    { kind:'toggle', key:'sfxLaserRicochet', labelFn: () => `  ↳ RICOCHET: ${onOff(settings.sfxLaserRicochet)}`,
      action: ()=> { settings.sfxLaserRicochet = !settings.sfxLaserRicochet; saveSettings(); log('INFO',`Ricochet SFX: ${onOff(settings.sfxLaserRicochet)}`); }
    },
    { kind:'toggle', key:'sfxBoost', labelFn: () => `  ↳ BOOST DASH: ${onOff(settings.sfxBoost)}`,
      action: ()=> { settings.sfxBoost = !settings.sfxBoost; saveSettings(); log('INFO',`Boost SFX: ${onOff(settings.sfxBoost)}`); }
    },
    { kind:'toggle', key:'sfxExplosions', labelFn: () => `  ↳ EXPLOSIONS: ${onOff(settings.sfxExplosions)}`,
      action: ()=> { settings.sfxExplosions = !settings.sfxExplosions; saveSettings(); log('INFO',`Explosion SFX: ${onOff(settings.sfxExplosions)}`); }
    },
    { kind:'toggle', key:'sfxMenu', labelFn: () => `  ↳ MENU SOUNDS: ${onOff(settings.sfxMenu)}`,
      action: ()=> { settings.sfxMenu = !settings.sfxMenu; saveSettings(); log('INFO',`Menu SFX: ${onOff(settings.sfxMenu)}`); }
    },
    
    { kind:'toggle', key:'snip3', labelFn: () => `SNIP3 TELEMETRY: ${onOff(settings.snip3Hud)}`,
      action: ()=> { settings.snip3Hud = !settings.snip3Hud; const hud = document.getElementById('hud'); if (hud) hud.style.display = settings.snip3Hud ? 'block' : 'none'; saveSettings(); log('INFO',`SNIP3 Telemetry: ${onOff(settings.snip3Hud)}`); }
    },
    { kind:'back', key:'back', label: 'BACK', action: ()=> { menuPage='MAIN'; menuSel=0; menuPageEnterT0 = performance.now(); } },
  ];
}
```

---

## TESTING CHECKLIST

### Debug HUD Tests
- [ ] Boot game → HUD visible
- [ ] Enter ∞SNIP3 → HUD auto-hides
- [ ] Press Tab (CapsLock OFF) → Nothing happens
- [ ] Enable CapsLock → Press Tab → HUD toggles
- [ ] Reload page → HUD state persists

### Lobby Overlay Tests
- [ ] In gameplay, press Tab → Lobby overlay appears (top-right)
- [ ] Shows all 1-8 players with color dots
- [ ] Shows simulated ping (25-80ms range)
- [ ] Shows ALIVE/DEAD status
- [ ] Auto-closes after 3 seconds
- [ ] Closes immediately when Tab released

### Granular Sound Tests
- [ ] Settings → SFX Master → Adjust → All sounds scale
- [ ] Settings → Laser Fire → OFF → No shoot sounds
- [ ] Settings → Ricochet → OFF → No bounce sounds
- [ ] Settings → Boost Dash → OFF → No boost whoosh
- [ ] Settings → Explosions → OFF → No zap sounds
- [ ] Settings → Menu Sounds → OFF → No click/select sounds
- [ ] Reload page → All settings persist

---

## SUMMARY OF CHANGES

### Files Modified
- `audio/index_pie_slice_production_pause_settings_final_v3_spawnfix_v5.html`

### Lines Added/Modified
- **Settings object** (line ~247): Added sfxLaserFire, sfxLaserRicochet, sfxBoost, sfxExplosions, sfxMenu, debugHudVisible
- **CapsLock+Tab handler** (line ~776): Enhanced with CapsLock detection + lobby overlay trigger
- **setDebugVisible** (line ~451): Now persists state to localStorage
- **Auto-hide on game start** (lines ~2375, ~2385): Hides HUD when entering gameplay
- **Lobby overlay functions** (new, after line ~520): showLobbyOverlay, hideLobbyOverlay, updateLobbyOverlay, drawLobbyOverlay
- **SFX play functions** (lines ~1559-1605): Added per-sound toggle checks + master volume scaling
- **Settings menu** (line ~2420): Added 5 new granular SFX toggle items
- **Game loop integration** (line ~2975): Added updateLobbyOverlay(dt) call
- **Render integration** (line ~3654): Added drawLobbyOverlay() call

### Total Lines Added: ~400
### Total Complexity: Medium-High
### Implementation Time: 4-6 hours
