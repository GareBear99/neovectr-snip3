/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NEO-VECTR ∞SNIP3 - ENHANCED TOUCH CONTROLS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Professional touch control system for mobile/tablet:
 * - WASD-like directional movement (left side)
 * - Responsive tap-to-fire (right side)
 * - Dual-stick aiming support
 * - Visual feedback with neon effects
 * - Multi-touch gesture support
 * - Auto-fire on hold
 * 
 * Features:
 * - Separate movement and aim zones
 * - Tap-to-fire with 150ms threshold
 * - Hold for continuous fire
 * - Visual joystick rendering
 * - Smooth dead zone handling
 * - Touch-friendly sensitivity
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// TOUCH CONTROL STATE
// ═══════════════════════════════════════════════════════════════════════════

const TouchControls = {
  // Enable/disable
  enabled: true,
  
  // Movement stick (left side)
  moveStick: {
    active: false,
    touchId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    angle: 0,
    magnitude: 0,
  },
  
  // Aim stick (right side)
  aimStick: {
    active: false,
    touchId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    angle: 0,
    magnitude: 0,
  },
  
  // Tap-to-fire
  tapFire: {
    enabled: true,
    lastTapTime: 0,
    tapThreshold: 150, // ms for tap vs hold
    holdThreshold: 250, // ms to start continuous fire
    fireRate: 0.15, // seconds between shots
    lastFireTime: 0,
    isHolding: false,
    touchStartTime: 0,
  },
  
  // Visual
  joystickRadius: 60,
  joystickOpacity: 0.3,
  deadZone: 0.15,
  
  // Screen zones
  splitRatio: 0.5, // Left 50% = move, right 50% = aim
};

// ═══════════════════════════════════════════════════════════════════════════
// TOUCH EVENT HANDLING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize touch event listeners
 */
function initTouchControls() {
  if (!TouchControls.enabled) return;
  
  // Touch start
  window.addEventListener('touchstart', handleTouchStart, { passive: false });
  
  // Touch move
  window.addEventListener('touchmove', handleTouchMove, { passive: false });
  
  // Touch end
  window.addEventListener('touchend', handleTouchEnd, { passive: false });
  window.addEventListener('touchcancel', handleTouchEnd, { passive: false });
  
  console.log('[TouchControls] Touch controls initialized');
}

/**
 * Handle touch start
 * @param {TouchEvent} event
 */
function handleTouchStart(event) {
  if (!TouchControls.enabled) return;
  
  const now = performance.now();
  
  for (let i = 0; i < event.changedTouches.length; i++) {
    const touch = event.changedTouches[i];
    const x = touch.clientX;
    const y = touch.clientY;
    const isLeftSide = x < window.innerWidth * TouchControls.splitRatio;
    
    if (isLeftSide && !TouchControls.moveStick.active) {
      // Movement stick
      TouchControls.moveStick.active = true;
      TouchControls.moveStick.touchId = touch.identifier;
      TouchControls.moveStick.startX = x;
      TouchControls.moveStick.startY = y;
      TouchControls.moveStick.currentX = x;
      TouchControls.moveStick.currentY = y;
      
      console.log('[TouchControls] Move stick activated');
    } else if (!isLeftSide && !TouchControls.aimStick.active) {
      // Aim stick / Tap-to-fire
      TouchControls.aimStick.active = true;
      TouchControls.aimStick.touchId = touch.identifier;
      TouchControls.aimStick.startX = x;
      TouchControls.aimStick.startY = y;
      TouchControls.aimStick.currentX = x;
      TouchControls.aimStick.currentY = y;
      
      // Track for tap-to-fire
      TouchControls.tapFire.touchStartTime = now;
      TouchControls.tapFire.isHolding = false;
      
      console.log('[TouchControls] Aim stick activated');
    }
  }
  
  // Prevent default to avoid scrolling
  if (event.cancelable) {
    event.preventDefault();
  }
}

/**
 * Handle touch move
 * @param {TouchEvent} event
 */
function handleTouchMove(event) {
  if (!TouchControls.enabled) return;
  
  for (let i = 0; i < event.changedTouches.length; i++) {
    const touch = event.changedTouches[i];
    
    // Update movement stick
    if (TouchControls.moveStick.active && touch.identifier === TouchControls.moveStick.touchId) {
      TouchControls.moveStick.currentX = touch.clientX;
      TouchControls.moveStick.currentY = touch.clientY;
      updateStickState(TouchControls.moveStick);
    }
    
    // Update aim stick
    if (TouchControls.aimStick.active && touch.identifier === TouchControls.aimStick.touchId) {
      TouchControls.aimStick.currentX = touch.clientX;
      TouchControls.aimStick.currentY = touch.clientY;
      updateStickState(TouchControls.aimStick);
    }
  }
  
  if (event.cancelable) {
    event.preventDefault();
  }
}

/**
 * Handle touch end
 * @param {TouchEvent} event
 */
function handleTouchEnd(event) {
  if (!TouchControls.enabled) return;
  
  const now = performance.now();
  
  for (let i = 0; i < event.changedTouches.length; i++) {
    const touch = event.changedTouches[i];
    
    // Release movement stick
    if (TouchControls.moveStick.active && touch.identifier === TouchControls.moveStick.touchId) {
      TouchControls.moveStick.active = false;
      TouchControls.moveStick.touchId = null;
      TouchControls.moveStick.magnitude = 0;
      console.log('[TouchControls] Move stick released');
    }
    
    // Release aim stick / Check tap-to-fire
    if (TouchControls.aimStick.active && touch.identifier === TouchControls.aimStick.touchId) {
      const touchDuration = now - TouchControls.tapFire.touchStartTime;
      const movement = Math.hypot(
        touch.clientX - TouchControls.aimStick.startX,
        touch.clientY - TouchControls.aimStick.startY
      );
      
      // Tap detected (short duration, minimal movement)
      if (touchDuration < TouchControls.tapFire.tapThreshold && movement < 20) {
        fireTapShot();
        console.log('[TouchControls] Tap-to-fire');
      }
      
      TouchControls.aimStick.active = false;
      TouchControls.aimStick.touchId = null;
      TouchControls.aimStick.magnitude = 0;
      TouchControls.tapFire.isHolding = false;
      
      console.log('[TouchControls] Aim stick released');
    }
  }
  
  if (event.cancelable) {
    event.preventDefault();
  }
}

/**
 * Update stick state (angle, magnitude)
 * @param {Object} stick - Stick object
 */
function updateStickState(stick) {
  stick.deltaX = stick.currentX - stick.startX;
  stick.deltaY = stick.currentY - stick.startY;
  
  const dist = Math.hypot(stick.deltaX, stick.deltaY);
  const maxDist = TouchControls.joystickRadius;
  
  // Calculate magnitude with dead zone
  stick.magnitude = Math.min(dist / maxDist, 1.0);
  if (stick.magnitude < TouchControls.deadZone) {
    stick.magnitude = 0;
  } else {
    // Remap to 0-1 after dead zone
    stick.magnitude = (stick.magnitude - TouchControls.deadZone) / (1.0 - TouchControls.deadZone);
  }
  
  // Calculate angle
  if (dist > 0.1) {
    stick.angle = Math.atan2(stick.deltaY, stick.deltaX);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TOUCH INPUT SAMPLING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get movement input from touch
 * @returns {{x, y, magnitude}} - Normalized movement vector
 */
function getTouchMovement() {
  if (!TouchControls.enabled || !TouchControls.moveStick.active) {
    return { x: 0, y: 0, magnitude: 0 };
  }
  
  const stick = TouchControls.moveStick;
  if (stick.magnitude === 0) {
    return { x: 0, y: 0, magnitude: 0 };
  }
  
  return {
    x: Math.cos(stick.angle),
    y: Math.sin(stick.angle),
    magnitude: stick.magnitude,
  };
}

/**
 * Get aim input from touch
 * @returns {{x, y, active}} - Normalized aim vector
 */
function getTouchAim() {
  if (!TouchControls.enabled || !TouchControls.aimStick.active) {
    return { x: 0, y: 0, active: false };
  }
  
  const stick = TouchControls.aimStick;
  if (stick.magnitude < 0.25) {
    return { x: 0, y: 0, active: false };
  }
  
  return {
    x: Math.cos(stick.angle),
    y: Math.sin(stick.angle),
    active: true,
  };
}

/**
 * Check if fire button is held (for continuous fire)
 * @param {number} currentTime - Current time in seconds
 * @returns {boolean} - Should fire
 */
function getTouchFire(currentTime) {
  if (!TouchControls.enabled || !TouchControls.aimStick.active) {
    return false;
  }
  
  const now = performance.now();
  const touchDuration = now - TouchControls.tapFire.touchStartTime;
  
  // Hold for continuous fire
  if (touchDuration > TouchControls.tapFire.holdThreshold) {
    TouchControls.tapFire.isHolding = true;
    
    // Check fire rate
    const timeSinceLastFire = currentTime - TouchControls.tapFire.lastFireTime;
    if (timeSinceLastFire >= TouchControls.tapFire.fireRate) {
      TouchControls.tapFire.lastFireTime = currentTime;
      return true;
    }
  }
  
  return false;
}

/**
 * Fire single shot from tap
 */
function fireTapShot() {
  // This will be called from the game loop
  // Signal that a tap fire has been requested
  TouchControls.tapFire.lastTapTime = performance.now();
}

/**
 * Check if tap fire is pending
 * @param {number} currentTime - Current time in ms
 * @returns {boolean}
 */
function hasPendingTapFire(currentTime) {
  const timeSinceTap = currentTime - TouchControls.tapFire.lastTapTime;
  if (timeSinceTap < 50) { // 50ms window
    TouchControls.tapFire.lastTapTime = 0; // Consume
    return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// VISUAL RENDERING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Render touch joysticks with neon effects
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
function renderTouchControls(ctx) {
  if (!TouchControls.enabled) return;
  
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  
  // Render movement stick
  if (TouchControls.moveStick.active) {
    renderJoystick(
      ctx,
      TouchControls.moveStick,
      { r: 80, g: 255, b: 255 }, // Cyan
      'MOVE'
    );
  }
  
  // Render aim stick
  if (TouchControls.aimStick.active) {
    renderJoystick(
      ctx,
      TouchControls.aimStick,
      { r: 255, g: 90, b: 230 }, // Magenta
      'AIM'
    );
  }
  
  ctx.restore();
}

/**
 * Render single joystick
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} stick - Stick object
 * @param {Object} color - RGB color
 * @param {string} label - Label text
 */
function renderJoystick(ctx, stick, color, label) {
  const baseX = stick.startX;
  const baseY = stick.startY;
  const radius = TouchControls.joystickRadius;
  
  // Base circle (outer ring)
  ctx.beginPath();
  ctx.arc(baseX, baseY, radius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${TouchControls.joystickOpacity * 0.5})`;
  ctx.lineWidth = 3;
  ctx.stroke();
  
  // Base fill
  ctx.beginPath();
  ctx.arc(baseX, baseY, radius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${TouchControls.joystickOpacity * 0.15})`;
  ctx.fill();
  
  // Thumb position
  const clampedDist = Math.min(Math.hypot(stick.deltaX, stick.deltaY), radius);
  const angle = Math.atan2(stick.deltaY, stick.deltaX);
  const thumbX = baseX + Math.cos(angle) * clampedDist;
  const thumbY = baseY + Math.sin(angle) * clampedDist;
  
  // Thumb glow
  ctx.beginPath();
  ctx.arc(thumbX, thumbY, 25, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${TouchControls.joystickOpacity * 0.8})`;
  ctx.lineWidth = 8;
  ctx.stroke();
  
  // Thumb core
  ctx.beginPath();
  ctx.arc(thumbX, thumbY, 18, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${TouchControls.joystickOpacity + 0.3})`;
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(thumbX, thumbY, 18, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.9)`;
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Label
  ctx.globalCompositeOperation = 'source-over';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.6)`;
  ctx.fillText(label, baseX, baseY);
  
  // Magnitude indicator (if active)
  if (stick.magnitude > 0.1) {
    ctx.font = '9px monospace';
    ctx.fillStyle = `rgba(255, 255, 255, 0.5)`;
    ctx.fillText(`${(stick.magnitude * 100).toFixed(0)}%`, baseX, baseY + radius + 15);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Enable touch controls
 */
function enableTouchControls() {
  TouchControls.enabled = true;
  console.log('[TouchControls] Enabled');
}

/**
 * Disable touch controls
 */
function disableTouchControls() {
  TouchControls.enabled = false;
  TouchControls.moveStick.active = false;
  TouchControls.aimStick.active = false;
  console.log('[TouchControls] Disabled');
}

/**
 * Set joystick opacity
 * @param {number} opacity - 0-1
 */
function setJoystickOpacity(opacity) {
  TouchControls.joystickOpacity = Math.max(0, Math.min(1, opacity));
}

/**
 * Set dead zone
 * @param {number} deadZone - 0-0.5
 */
function setDeadZone(deadZone) {
  TouchControls.deadZone = Math.max(0, Math.min(0.5, deadZone));
}

/**
 * Detect if device has touch support
 * @returns {boolean}
 */
function isTouchDevice() {
  return ('ontouchstart' in window) || 
         (navigator.maxTouchPoints > 0) || 
         (navigator.msMaxTouchPoints > 0);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

window.TouchControls = {
  // State
  state: TouchControls,
  
  // Initialization
  init: initTouchControls,
  
  // Input sampling
  getMovement: getTouchMovement,
  getAim: getTouchAim,
  getFire: getTouchFire,
  hasPendingTapFire,
  
  // Rendering
  render: renderTouchControls,
  
  // Settings
  enable: enableTouchControls,
  disable: disableTouchControls,
  setOpacity: setJoystickOpacity,
  setDeadZone,
  
  // Utilities
  isTouchDevice,
};

// Auto-detect and initialize on touch devices
if (isTouchDevice()) {
  console.log('[TouchControls] Touch device detected, initializing...');
  initTouchControls();
} else {
  console.log('[TouchControls] Non-touch device, controls available but not auto-initialized');
}

console.log('[TouchControls] Touch control system loaded');
