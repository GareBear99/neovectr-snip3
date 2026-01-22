/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NEO-VECTR ∞SNIP3 - ENHANCED MENU SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Drop-in replacement for existing menu system with:
 * - 3D spinning arrow pointing at selected option
 * - Dramatic boot sequence with Big Bang power-up from "off"
 * - Full theme song playback during boot
 * - Particle effects synchronized to audio
 * - Smooth transitions and captivating visuals
 * - Professional polish that grips players
 * 
 * INTEGRATION:
 * Replace the menu-related functions in index.html with this enhanced version.
 * Keep all existing variables and game logic unchanged.
 * 
 * Music by: TRNDSTR
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCED BOOT SEQUENCE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Boot state - tracks power-up sequence
 */
const BootEnhanced = {
  // Timeline phases
  phase: 'OFF',              // 'OFF' → 'SPARK' → 'IGNITE' → 'POWERUP' → 'COMPLETE'
  phaseTime: 0,              // Time in current phase
  totalTime: 0,              // Total boot time
  
  // Big Bang particles
  bangParticles: [],
  bangMaxParticles: 300,
  
  // Energy visualization
  energyRings: [],
  energyPulse: 0,
  
  // Power-on effect
  scanlineY: 0,
  powerLevel: 0,             // 0 to 1, controls brightness/intensity
  
  // Audio sync
  audioEnergy: 0,
  audioEnergySmooth: 0,
  audioBeat: false,
  beatCooldown: 0,
};

/**
 * Initialize boot particles for Big Bang effect
 */
function initBootParticles() {
  BootEnhanced.bangParticles = [];
  const centerX = canvas.width * 0.5;
  const centerY = canvas.height * 0.5;
  
  // Create explosion particles radiating from center
  for (let i = 0; i < BootEnhanced.bangMaxParticles; i++) {
    const angle = (Math.PI * 2 * i) / BootEnhanced.bangMaxParticles + (Math.random() * 0.3);
    const speed = 200 + Math.random() * 600;
    const size = 0.5 + Math.random() * 2.5;
    const life = 0.5 + Math.random() * 1.5;
    
    BootEnhanced.bangParticles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: size,
      life: 0,
      maxLife: life,
      color: Math.random() > 0.5 ? 0 : 1, // 0=cyan, 1=magenta
      brightness: 0.5 + Math.random() * 0.5,
    });
  }
}

/**
 * Update boot particles
 * @param {number} dt - Delta time in seconds
 */
function updateBootParticles(dt) {
  for (let i = BootEnhanced.bangParticles.length - 1; i >= 0; i--) {
    const p = BootEnhanced.bangParticles[i];
    
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(0.4, dt); // Decelerate
    p.vy *= Math.pow(0.4, dt);
    p.life += dt;
    
    if (p.life >= p.maxLife) {
      BootEnhanced.bangParticles.splice(i, 1);
    }
  }
}

/**
 * Draw boot particles with glow
 * @param {CanvasRenderingContext2D} ctx
 */
function drawBootParticles(ctx) {
  ctx.globalCompositeOperation = 'lighter';
  
  for (const p of BootEnhanced.bangParticles) {
    const t = p.life / p.maxLife;
    const fade = (1 - t) * p.brightness;
    
    // Color based on particle type
    const color = p.color === 0
      ? { r: 0, g: 255, b: 255 }    // Cyan
      : { r: 255, g: 0, b: 255 };   // Magenta
    
    // Glow halo
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${fade * 0.2})`;
    ctx.fill();
    
    // Core
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${fade * 0.9})`;
    ctx.fill();
  }
}

/**
 * Enhanced boot screen with dramatic power-up sequence
 * @param {number} now - Current timestamp
 */
function drawEnhancedBootScreen(now) {
  const a = arena();
  const dt = 1 / 60; // Approximate
  
  BootEnhanced.totalTime += dt;
  BootEnhanced.phaseTime += dt;
  
  // Calculate audio energy
  if (bootAnalyser && bootFreq) {
    bootAnalyser.getByteFrequencyData(bootFreq);
    let sum = 0;
    const bins = Math.min(32, bootFreq.length);
    for (let i = 0; i < bins; i++) sum += bootFreq[i];
    BootEnhanced.audioEnergy = (sum / bins) / 255;
    BootEnhanced.audioEnergySmooth = BootEnhanced.audioEnergySmooth * 0.85 + BootEnhanced.audioEnergy * 0.15;
    
    // Beat detection
    const rise = BootEnhanced.audioEnergy - BootEnhanced.audioEnergySmooth;
    BootEnhanced.beatCooldown = Math.max(0, BootEnhanced.beatCooldown - dt);
    if (rise > 0.12 && BootEnhanced.beatCooldown <= 0) {
      BootEnhanced.audioBeat = true;
      BootEnhanced.beatCooldown = 0.15;
    } else {
      BootEnhanced.audioBeat = false;
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // PHASE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────
  
  // OFF → SPARK: Initial click, show static
  if (BootEnhanced.phase === 'OFF' && BootEnhanced.totalTime > 0.1) {
    BootEnhanced.phase = 'SPARK';
    BootEnhanced.phaseTime = 0;
  }
  
  // SPARK → IGNITE: First audio energy spike
  if (BootEnhanced.phase === 'SPARK' && BootEnhanced.audioEnergy > 0.08) {
    BootEnhanced.phase = 'IGNITE';
    BootEnhanced.phaseTime = 0;
    initBootParticles(); // Big Bang!
  }
  
  // IGNITE → POWERUP: After particles spawn
  if (BootEnhanced.phase === 'IGNITE' && BootEnhanced.phaseTime > 0.5) {
    BootEnhanced.phase = 'POWERUP';
    BootEnhanced.phaseTime = 0;
  }
  
  // POWERUP → COMPLETE: When power level reaches 100%
  if (BootEnhanced.phase === 'POWERUP' && BootEnhanced.powerLevel >= 1.0) {
    BootEnhanced.phase = 'COMPLETE';
    BootEnhanced.phaseTime = 0;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // POWER LEVEL RAMP
  // ─────────────────────────────────────────────────────────────────────────
  
  if (BootEnhanced.phase === 'POWERUP') {
    // Power up gradually, accelerating with audio energy
    const baseRate = 0.15; // Takes ~6.7 seconds to reach 100%
    const audioBoost = BootEnhanced.audioEnergy * 0.3;
    BootEnhanced.powerLevel += (baseRate + audioBoost) * dt;
    BootEnhanced.powerLevel = Math.min(1.0, BootEnhanced.powerLevel);
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // RENDERING
  // ─────────────────────────────────────────────────────────────────────────
  
  // Black background
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // OFF phase: Complete darkness
  if (BootEnhanced.phase === 'OFF') {
    return;
  }
  
  // SPARK phase: Static and initial glow
  if (BootEnhanced.phase === 'SPARK') {
    const sparkIntensity = Math.min(1, BootEnhanced.phaseTime * 3);
    
    // Static noise
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = 1 + Math.random() * 2;
      ctx.fillStyle = `rgba(120, 255, 255, ${sparkIntensity * 0.3 * Math.random()})`;
      ctx.fillRect(x, y, size, size);
    }
    
    // Center glow starting to form
    const grd = ctx.createRadialGradient(a.cx, a.cy, 0, a.cx, a.cy, a.r * 0.5);
    grd.addColorStop(0, `rgba(175, 75, 255, ${sparkIntensity * 0.2})`);
    grd.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    return;
  }
  
  // IGNITE phase: Big Bang explosion
  if (BootEnhanced.phase === 'IGNITE') {
    updateBootParticles(dt);
    drawBootParticles(ctx);
    
    // Shockwave rings
    const shockwaveT = BootEnhanced.phaseTime;
    for (let i = 0; i < 3; i++) {
      const delay = i * 0.08;
      if (shockwaveT > delay) {
        const t = (shockwaveT - delay) / 0.6;
        if (t <= 1) {
          const radius = a.r * t * 1.5;
          const alpha = (1 - t) * 0.4;
          ctx.globalCompositeOperation = 'lighter';
          ctx.beginPath();
          ctx.arc(a.cx, a.cy, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = 10 * (1 - t);
          ctx.stroke();
        }
      }
    }
    
    // Flash
    const flashAlpha = Math.max(0, 1 - BootEnhanced.phaseTime * 4);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.3})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    return;
  }
  
  // POWERUP & COMPLETE phases: Full visualization
  updateBootParticles(dt);
  drawBootParticles(ctx);
  
  // Vignette (grows with power level)
  const vignetteAlpha = BootEnhanced.powerLevel * 0.4;
  const grd = ctx.createRadialGradient(a.cx, a.cy, a.r * 0.1, a.cx, a.cy, a.r * 1.25);
  grd.addColorStop(0, `rgba(40, 0, 55, ${vignetteAlpha})`);
  grd.addColorStop(1, `rgba(0, 0, 0, ${0.95 * BootEnhanced.powerLevel})`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Audio spectrum (bottom of screen)
  if (bootAnalyser && bootFreq && BootEnhanced.powerLevel > 0.2) {
    bootAnalyser.getByteFrequencyData(bootFreq);
    
    const bottom = canvas.height * 0.88;
    const left = canvas.width * 0.12;
    const right = canvas.width * 0.88;
    const w = right - left;
    const bins = 64;
    
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < bins; i++) {
      const idx = Math.floor((i / bins) * Math.min(bootFreq.length, 256));
      const v = (bootFreq[idx] / 255) * BootEnhanced.powerLevel;
      const h = v * canvas.height * 0.14;
      const x = left + (i / bins) * w;
      
      // Color shifts with power level
      const r = Math.floor(175 + 80 * BootEnhanced.powerLevel);
      const g = Math.floor(75 + 180 * BootEnhanced.powerLevel);
      const b = 255;
      const alpha = (0.08 + 0.25 * v) * BootEnhanced.powerLevel;
      
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.fillRect(x, bottom - h, Math.max(1, w / bins - 2), h);
    }
  }
  
  // Logo with power-up effect
  const title = 'Neo-VECTR™ INC';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fs = Math.floor(Math.min(canvas.width, canvas.height) * 0.11);
  ctx.font = `700 ${fs}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  
  const x = a.cx;
  const y = a.cy * 0.92;
  
  // Flicker effect (settles as power increases)
  const flickerAmt = Math.max(0, 1 - BootEnhanced.powerLevel);
  const flicker = 1 - flickerAmt * 0.3 * Math.sin(now * 0.05);
  
  // Beat pulse
  const beatPulse = BootEnhanced.audioBeat ? 1.15 : 1.0;
  const currentPower = BootEnhanced.powerLevel * flicker * beatPulse;
  
  // Halo strokes (cyan/magenta neon)
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const alpha = (0.03 + 0.06 * i) * currentPower;
    const hue = i % 2 === 0 ? 'rgba(0, 255, 255,' : 'rgba(255, 0, 255,';
    ctx.strokeStyle = hue + alpha + ')';
    ctx.lineWidth = 10 + i * 9;
    ctx.strokeText(title, x, y);
  }
  
  // Core text
  ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + 0.9 * currentPower})`;
  ctx.fillText(title, x, y);
  
  // Power-up status text
  const percentage = Math.floor(BootEnhanced.powerLevel * 100);
  ctx.font = `500 ${Math.floor(fs * 0.32)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = `rgba(255, 255, 255, ${0.25 + 0.45 * BootEnhanced.powerLevel})`;
  
  if (BootEnhanced.powerLevel < 1.0) {
    ctx.fillText(`POWERING UP... ${percentage}%`, x, y + fs * 0.85);
  } else {
    // Pulsing "READY" text
    const readyPulse = 0.7 + 0.3 * Math.sin(BootEnhanced.phaseTime * 4);
    ctx.fillStyle = `rgba(0, 255, 255, ${readyPulse})`;
    ctx.fillText('SYSTEM READY', x, y + fs * 0.85);
  }
  
  // Progress bar
  const barWidth = canvas.width * 0.6;
  const barHeight = 8;
  const barX = (canvas.width - barWidth) * 0.5;
  const barY = canvas.height * 0.75;
  
  // Background
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(barX, barY, barWidth, barHeight);
  
  // Fill (gradient cyan to magenta)
  const fillWidth = barWidth * BootEnhanced.powerLevel;
  const fillGrd = ctx.createLinearGradient(barX, barY, barX + fillWidth, barY);
  fillGrd.addColorStop(0, 'rgba(0, 255, 255, 0.8)');
  fillGrd.addColorStop(1, 'rgba(255, 0, 255, 0.8)');
  ctx.fillStyle = fillGrd;
  ctx.fillRect(barX, barY, fillWidth, barHeight);
  
  // Glow on progress bar
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * BootEnhanced.audioEnergy})`;
  ctx.fillRect(barX, barY, fillWidth, barHeight);
}

// ═══════════════════════════════════════════════════════════════════════════
// 3D SPINNING MENU ARROW
// ═══════════════════════════════════════════════════════════════════════════

const MenuArrow = {
  // Position
  x: 0,
  y: 0,
  targetX: 0,
  targetY: 0,
  
  // 3D spin
  spinAngle: 0,
  depth: 0,
  
  // Animation
  scale: 1.0,
  targetScale: 1.0,
  glowIntensity: 0,
  
  // Config
  length: 35,
  spinSpeed: 3.5,
  moveSpeed: 600,
};

/**
 * Update menu arrow animation
 * @param {number} dt - Delta time
 */
function updateMenuArrow(dt) {
  // Smooth movement to target
  const dx = MenuArrow.targetX - MenuArrow.x;
  const dy = MenuArrow.targetY - MenuArrow.y;
  const dist = Math.hypot(dx, dy);
  
  if (dist > 1) {
    const move = Math.min(MenuArrow.moveSpeed * dt, dist);
    MenuArrow.x += (dx / dist) * move;
    MenuArrow.y += (dy / dist) * move;
  }
  
  // 3D spin
  MenuArrow.spinAngle += MenuArrow.spinSpeed * dt;
  if (MenuArrow.spinAngle > Math.PI * 2) MenuArrow.spinAngle -= Math.PI * 2;
  MenuArrow.depth = Math.sin(MenuArrow.spinAngle);
  
  // Glow pulse
  MenuArrow.glowIntensity = (Math.sin(Date.now() * 0.003) + 1) * 0.5;
  
  // Scale animation
  const scaleDiff = MenuArrow.targetScale - MenuArrow.scale;
  MenuArrow.scale += scaleDiff * 5 * dt;
  
  if (MenuArrow.scale > 1.05) {
    MenuArrow.targetScale = 1.0;
  }
}

/**
 * Draw 3D spinning arrow
 * @param {CanvasRenderingContext2D} ctx
 */
function drawMenuArrow(ctx) {
  ctx.save();
  ctx.translate(MenuArrow.x, MenuArrow.y);
  
  // 3D scale based on depth
  const depthScale = 1 + MenuArrow.depth * 0.25;
  ctx.scale(MenuArrow.scale * depthScale, MenuArrow.scale);
  
  // Colors
  const cyan = { r: 0, g: 255, b: 255 };
  const magenta = { r: 255, g: 0, b: 255 };
  const color = MenuArrow.depth > 0 ? cyan : magenta;
  
  // Glow layers
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 3; i > 0; i--) {
    const alpha = (0.05 + 0.08 * i) * MenuArrow.glowIntensity;
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
    ctx.lineWidth = 4 + i * 3;
    drawArrowShape(ctx);
  }
  
  // Core arrow
  ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.9)`;
  ctx.lineWidth = 3;
  drawArrowShape(ctx);
  
  // Fill
  ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.25)`;
  ctx.fill();
  
  ctx.restore();
}

/**
 * Draw arrow shape
 * @param {CanvasRenderingContext2D} ctx
 */
function drawArrowShape(ctx) {
  const len = MenuArrow.length;
  
  ctx.beginPath();
  // Shaft
  ctx.moveTo(-len * 0.5, 0);
  ctx.lineTo(len * 0.3, 0);
  // Head
  ctx.moveTo(len * 0.3, -len * 0.35);
  ctx.lineTo(len * 0.5, 0);
  ctx.lineTo(len * 0.3, len * 0.35);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
}

/**
 * Point arrow at menu option
 * @param {number} optionY - Y position of option
 * @param {number} offsetX - X offset from option
 */
function pointArrowAt(optionY, offsetX) {
  MenuArrow.targetX = offsetX;
  MenuArrow.targetY = optionY;
  MenuArrow.targetScale = 1.25; // Pulse on change
}

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCED MENU SCREEN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Draw enhanced menu with 3D arrow
 * @param {number} now - Current timestamp
 * @param {number} menuSel - Selected menu index
 */
function drawEnhancedMenuScreen(now, menuSel) {
  const a = arena();
  const dt = 1 / 60;
  
  // Update arrow
  updateMenuArrow(dt);
  
  // Background
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const t = now * 0.001;
  const pulse = 0.12 + 0.06 * Math.sin(t * 2.0);
  
  // Vignette
  const grd = ctx.createRadialGradient(a.cx, a.cy, a.r * 0.1, a.cx, a.cy, a.r * 1.25);
  grd.addColorStop(0, 'rgba(70, 0, 95, 0.35)');
  grd.addColorStop(1, 'rgba(0, 0, 0, 0.98)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Title
  const fs = Math.floor(Math.min(canvas.width, canvas.height) * 0.10);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${fs}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(175, 75, 255, ${0.18 + pulse})`;
  ctx.lineWidth = 18;
  ctx.strokeText('Neo-VECTR', a.cx, a.cy * 0.62);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.fillText('Neo-VECTR', a.cx, a.cy * 0.62);
  
  ctx.font = `600 ${Math.floor(fs * 0.28)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillText('INC • ARCADE SYSTEMS', a.cx, a.cy * 0.62 + fs * 0.78);
  
  // Menu options
  const items = [
    'START GAME',
    'MULTIPLAYER',
    'SETTINGS',
    'CREDITS',
  ];
  
  const baseY = a.cy * 0.92;
  const stepY = fs * 0.52;
  const arrowOffsetX = a.cx - fs * 2.5;
  
  for (let i = 0; i < items.length; i++) {
    const y = baseY + i * stepY;
    const isSel = i === menuSel;
    
    // Update arrow target when selection changes
    if (isSel && Math.abs(MenuArrow.targetY - y) > 1) {
      pointArrowAt(y, arrowOffsetX);
    }
    
    const glow = isSel ? 0.35 + 0.25 * Math.sin(t * 6.0) : 0.10;
    ctx.globalCompositeOperation = 'lighter';
    ctx.font = `${isSel ? 800 : 650} ${Math.floor(fs * 0.42)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    ctx.fillStyle = `rgba(120, 255, 255, ${glow})`;
    ctx.fillText(items[i], a.cx, y);
    ctx.globalCompositeOperation = 'source-over';
  }
  
  // Draw spinning arrow
  drawMenuArrow(ctx);
  
  // Help text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font = `500 ${Math.floor(fs * 0.24)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillText('ENTER/CLICK: select • ↑/↓: navigate • ESC: back', a.cx, canvas.height - fs * 0.25);
  
  // Music credit (bottom right)
  ctx.textAlign = 'right';
  ctx.font = `400 ${Math.floor(fs * 0.18)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  ctx.fillStyle = 'rgba(175, 75, 255, 0.45)';
  ctx.fillText('♫ Music by TRNDSTR', canvas.width - 20, canvas.height - 15);
}

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION NOTES
// ═══════════════════════════════════════════════════════════════════════════

/*
TO INTEGRATE INTO index.html:

1. Replace drawBootScreen() with drawEnhancedBootScreen()
2. Replace drawMenuScreen() with drawEnhancedMenuScreen()
3. Initialize MenuArrow position when entering menu:
   
   if (appMode === 'MENU' && !MenuArrow.initialized) {
     const layout = menuLayout();
     MenuArrow.x = layout.left - 100;
     MenuArrow.y = layout.baseY;
     MenuArrow.targetX = layout.left - 100;
     MenuArrow.targetY = layout.baseY;
     MenuArrow.initialized = true;
   }

4. Update BootEnhanced phase tracking:
   - When starting boot, reset: BootEnhanced.phase = 'OFF', BootEnhanced.powerLevel = 0
   - Audio automatically triggers phase progression
   - Song plays to completion before menu appears

5. The boot sequence now:
   - Starts completely OFF (black screen)
   - Shows static/sparks on first audio
   - BIG BANG explosion when beat hits
   - Powers up gradually from 0% to 100%
   - Displays "SYSTEM READY" when complete
   - Transitions to menu after song finishes

EXAMPLE MODIFICATION in frameLoop():

if (appMode === 'BOOT') {
  drawEnhancedBootScreen(now);
  
  // Transition to menu when boot complete AND audio finished
  if (BootEnhanced.phase === 'COMPLETE' && bootAudioEl && bootAudioEl.ended) {
    appMode = 'MENU';
  }
  
  requestAnimationFrame(frameLoop);
  return;
}

if (appMode === 'MENU') {
  // Initialize arrow on first frame
  if (!MenuArrow.initialized) {
    const layout = menuLayout();
    MenuArrow.x = layout.left - 100;
    MenuArrow.y = layout.baseY;
    MenuArrow.targetX = layout.left - 100;
    MenuArrow.targetY = layout.baseY;
    MenuArrow.initialized = true;
  }
  
  // ... existing menu input handling ...
  
  drawEnhancedMenuScreen(now, menuSel);
  requestAnimationFrame(frameLoop);
  return;
}

*/

console.log('[EnhancedMenu] 3D spinning arrow + dramatic boot sequence loaded');
console.log('[EnhancedMenu] Music by TRNDSTR • Powers up from OFF with Big Bang effects');
