/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NEO-VECTR ∞SNIP3 - 3D SPINNING MENU ARROW
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Enhanced menu system with captivating visual effects:
 * - 3D rotating arrow that spins in place
 * - Smooth rotation to aim at selected menu option
 * - Depth effect (arrow appears to rotate in 3D space)
 * - Pulsing glow on hover
 * - Trail effect for extra visual appeal
 * - Neon aesthetic matching game theme
 * 
 * Usage:
 * - Initialize with menu options and positions
 * - Update every frame (handles smooth rotation)
 * - Render arrow pointing at current selection
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// ARROW STATE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 3D menu arrow state
 */
const MenuArrowState = {
  // Position
  x: 0,                    // Current X position
  y: 0,                    // Current Y position
  targetX: 0,              // Target X position (where we're moving to)
  targetY: 0,              // Target Y position
  
  // Rotation
  angle: 0,                // Current angle (radians)
  targetAngle: 0,          // Target angle to rotate to
  rotationSpeed: 8,        // How fast to rotate (radians/sec)
  
  // 3D spin effect
  spinAngle: 0,            // Current spin angle (0 to 2π)
  spinSpeed: 3,            // Spin speed (radians/sec)
  depth: 0,                // Current depth (for 3D effect, -1 to 1)
  
  // Visual effects
  glowIntensity: 0,        // Glow pulse intensity (0 to 1)
  glowPulseSpeed: 2,       // Glow pulse speed
  scale: 1.0,              // Arrow scale (grows on hover)
  targetScale: 1.0,        // Target scale
  
  // Trail effect
  trailPositions: [],      // Array of {x, y, alpha} for trail
  trailMaxLength: 8,       // Max trail points
  
  // Animation
  isAnimating: true,       // Whether arrow is animating
  hoverTime: 0,            // Time spent hovering on option
};

/**
 * Menu arrow configuration
 */
const MenuArrowConfig = {
  // Arrow appearance
  length: 30,              // Arrow length (pixels)
  width: 12,               // Arrow width (pixels)
  thickness: 3,            // Line thickness
  
  // Colors (neon theme)
  color: '#00ffff',        // Primary color (cyan)
  glowColor: '#ff00ff',    // Glow color (magenta)
  trailColor: '#00ffff',   // Trail color
  
  // Positioning
  offsetFromOption: 60,    // Distance from menu option (pixels)
  
  // Animation
  moveSpeed: 500,          // Movement speed (pixels/sec)
  rotationEasing: 0.15,    // Rotation smoothing (0-1, lower = smoother)
  scaleSpeed: 4,           // Scale animation speed
};

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize menu arrow
 * Call this once when setting up menu
 * 
 * @param {number} startX - Initial X position
 * @param {number} startY - Initial Y position
 */
function initMenuArrow(startX, startY) {
  MenuArrowState.x = startX;
  MenuArrowState.y = startY;
  MenuArrowState.targetX = startX;
  MenuArrowState.targetY = startY;
  MenuArrowState.angle = 0;
  MenuArrowState.targetAngle = 0;
  MenuArrowState.spinAngle = 0;
  MenuArrowState.glowIntensity = 0;
  MenuArrowState.scale = 1.0;
  MenuArrowState.targetScale = 1.0;
  MenuArrowState.trailPositions = [];
  MenuArrowState.hoverTime = 0;
}

/**
 * Point arrow at a menu option
 * Call this when menu selection changes
 * 
 * @param {number} optionX - Menu option X position
 * @param {number} optionY - Menu option Y position
 * @param {string} [direction='left'] - Which side to place arrow ('left' or 'right')
 */
function pointArrowAtOption(optionX, optionY, direction = 'left') {
  // Calculate target position (offset from option)
  if (direction === 'left') {
    MenuArrowState.targetX = optionX - MenuArrowConfig.offsetFromOption;
    MenuArrowState.targetAngle = 0; // Point right
  } else {
    MenuArrowState.targetX = optionX + MenuArrowConfig.offsetFromOption;
    MenuArrowState.targetAngle = Math.PI; // Point left
  }
  
  MenuArrowState.targetY = optionY;
  
  // Pulse effect when changing selection
  MenuArrowState.targetScale = 1.3;
  MenuArrowState.hoverTime = 0;
  
  // Play menu hover sound if AudioControl is available
  if (window.AudioControl) {
    window.AudioControl.playSound('menu', 'menuHover', { volume: 0.4 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Update menu arrow animation
 * Call this every frame
 * 
 * @param {number} dt - Delta time in seconds
 */
function updateMenuArrow(dt) {
  // Smooth movement to target position
  const dx = MenuArrowState.targetX - MenuArrowState.x;
  const dy = MenuArrowState.targetY - MenuArrowState.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance > 1) {
    const moveAmount = Math.min(MenuArrowConfig.moveSpeed * dt, distance);
    MenuArrowState.x += (dx / distance) * moveAmount;
    MenuArrowState.y += (dy / distance) * moveAmount;
  } else {
    MenuArrowState.x = MenuArrowState.targetX;
    MenuArrowState.y = MenuArrowState.targetY;
  }
  
  // Smooth rotation to target angle
  let angleDiff = MenuArrowState.targetAngle - MenuArrowState.angle;
  
  // Normalize angle difference to -π to π
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  
  // Apply rotation with easing
  MenuArrowState.angle += angleDiff * MenuArrowConfig.rotationEasing;
  
  // 3D spin effect (continuous rotation)
  MenuArrowState.spinAngle += MenuArrowState.spinSpeed * dt;
  if (MenuArrowState.spinAngle > Math.PI * 2) {
    MenuArrowState.spinAngle -= Math.PI * 2;
  }
  
  // Calculate depth based on spin angle (creates 3D effect)
  // depth oscillates between -1 and 1, making arrow appear to rotate in 3D
  MenuArrowState.depth = Math.sin(MenuArrowState.spinAngle);
  
  // Glow pulse effect
  MenuArrowState.glowIntensity = (Math.sin(Date.now() * 0.003 * MenuArrowState.glowPulseSpeed) + 1) * 0.5;
  
  // Scale animation (grows on hover)
  const scaleDiff = MenuArrowState.targetScale - MenuArrowState.scale;
  MenuArrowState.scale += scaleDiff * MenuArrowConfig.scaleSpeed * dt;
  
  // Return to normal scale after pulse
  if (MenuArrowState.scale > 1.05) {
    MenuArrowState.targetScale = 1.0;
  }
  
  // Update hover time
  MenuArrowState.hoverTime += dt;
  
  // Update trail effect
  updateArrowTrail();
}

/**
 * Update arrow trail positions
 * Creates a motion blur / trail effect
 */
function updateArrowTrail() {
  // Add current position to trail
  MenuArrowState.trailPositions.push({
    x: MenuArrowState.x,
    y: MenuArrowState.y,
    angle: MenuArrowState.angle,
    depth: MenuArrowState.depth,
    alpha: 1.0,
  });
  
  // Limit trail length
  if (MenuArrowState.trailPositions.length > MenuArrowState.trailMaxLength) {
    MenuArrowState.trailPositions.shift();
  }
  
  // Fade out trail
  MenuArrowState.trailPositions.forEach((pos, i) => {
    pos.alpha = i / MenuArrowState.trailMaxLength;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Render 3D spinning menu arrow
 * Call this in your render loop
 * 
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
function renderMenuArrow(ctx) {
  ctx.save();
  
  // Render trail first (behind arrow)
  renderArrowTrail(ctx);
  
  // Render main arrow
  renderArrow3D(ctx, 
    MenuArrowState.x, 
    MenuArrowState.y, 
    MenuArrowState.angle, 
    MenuArrowState.depth,
    MenuArrowState.scale,
    1.0 // Full opacity for main arrow
  );
  
  ctx.restore();
}

/**
 * Render arrow trail effect
 * 
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
function renderArrowTrail(ctx) {
  // Render trail from oldest to newest (back to front)
  for (let i = 0; i < MenuArrowState.trailPositions.length - 1; i++) {
    const pos = MenuArrowState.trailPositions[i];
    
    // Calculate alpha based on trail position and overall fade
    const alpha = pos.alpha * 0.3; // Trail is more transparent
    
    renderArrow3D(ctx, pos.x, pos.y, pos.angle, pos.depth, MenuArrowState.scale, alpha);
  }
}

/**
 * Render arrow with 3D effect
 * 
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} angle - Rotation angle (radians)
 * @param {number} depth - Depth value (-1 to 1, for 3D effect)
 * @param {number} scale - Scale multiplier
 * @param {number} alpha - Opacity (0 to 1)
 */
function renderArrow3D(ctx, x, y, angle, depth, scale, alpha) {
  ctx.save();
  
  // Move to arrow position
  ctx.translate(x, y);
  
  // Rotate to point at target
  ctx.rotate(angle);
  
  // Scale based on depth (creates 3D perspective)
  const depthScale = 1 + depth * 0.3; // Arrow appears larger when "closer"
  ctx.scale(scale * depthScale, scale);
  
  // Calculate colors with alpha
  const primaryColor = hexToRGBA(MenuArrowConfig.color, alpha);
  const glowColor = hexToRGBA(MenuArrowConfig.glowColor, alpha * MenuArrowState.glowIntensity);
  
  // Draw glow (multiple layers for intensity)
  const glowLayers = 3;
  for (let i = glowLayers; i > 0; i--) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 15 * i * MenuArrowState.glowIntensity;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = MenuArrowConfig.thickness + i * 2;
    drawArrowShape(ctx);
    ctx.stroke();
  }
  
  // Draw main arrow
  ctx.shadowBlur = 10;
  ctx.shadowColor = primaryColor;
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = MenuArrowConfig.thickness;
  drawArrowShape(ctx);
  ctx.stroke();
  
  // Draw arrow fill (slightly transparent)
  ctx.fillStyle = hexToRGBA(MenuArrowConfig.color, alpha * 0.3);
  ctx.fill();
  
  // Add depth lines (3D effect)
  if (Math.abs(depth) > 0.2) {
    ctx.strokeStyle = hexToRGBA('#ffffff', alpha * 0.2);
    ctx.lineWidth = 1;
    
    // Vertical depth lines
    for (let i = -1; i <= 1; i += 0.5) {
      const offset = i * MenuArrowConfig.length * 0.3;
      ctx.beginPath();
      ctx.moveTo(offset, -5);
      ctx.lineTo(offset + depth * 3, 5);
      ctx.stroke();
    }
  }
  
  ctx.restore();
}

/**
 * Draw arrow shape (reusable path)
 * Arrow points to the right by default
 * 
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
function drawArrowShape(ctx) {
  const len = MenuArrowConfig.length;
  const width = MenuArrowConfig.width;
  
  ctx.beginPath();
  
  // Arrow shaft
  ctx.moveTo(-len * 0.5, 0);
  ctx.lineTo(len * 0.3, 0);
  
  // Arrow head (triangle)
  ctx.moveTo(len * 0.3, -width * 0.5);
  ctx.lineTo(len * 0.5, 0);
  ctx.lineTo(len * 0.3, width * 0.5);
  ctx.lineTo(len * 0.3, -width * 0.5);
  
  ctx.closePath();
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert hex color to RGBA string
 * 
 * @param {string} hex - Hex color (e.g., '#00ffff')
 * @param {number} alpha - Alpha value (0 to 1)
 * @returns {string} - RGBA string (e.g., 'rgba(0, 255, 255, 0.5)')
 */
function hexToRGBA(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Set arrow spin speed
 * Higher values = faster spinning
 * 
 * @param {number} speed - Spin speed (radians/sec)
 */
function setArrowSpinSpeed(speed) {
  MenuArrowState.spinSpeed = speed;
}

/**
 * Set arrow colors
 * 
 * @param {string} primaryColor - Primary color (hex)
 * @param {string} glowColor - Glow color (hex)
 */
function setArrowColors(primaryColor, glowColor) {
  MenuArrowConfig.color = primaryColor;
  MenuArrowConfig.glowColor = glowColor;
}

/**
 * Toggle arrow animation
 * 
 * @param {boolean} enabled - Whether to animate
 */
function setArrowAnimation(enabled) {
  MenuArrowState.isAnimating = enabled;
  if (!enabled) {
    MenuArrowState.spinSpeed = 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MENU INTEGRATION EXAMPLE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Example: Integrate with existing menu system
 * 
 * Usage in your menu code:
 * 
 * // Initialize arrow when menu opens
 * initMenuArrow(100, 300);
 * 
 * // Point arrow at menu option when selection changes
 * function onMenuSelectionChange(optionIndex) {
 *   const option = menuOptions[optionIndex];
 *   pointArrowAtOption(option.x, option.y, 'left');
 * }
 * 
 * // Update in game loop
 * function update(dt) {
 *   updateMenuArrow(dt);
 * }
 * 
 * // Render in draw loop
 * function render(ctx) {
 *   renderMenu(ctx);          // Your menu rendering
 *   renderMenuArrow(ctx);     // Arrow on top
 * }
 */

/**
 * Example menu system with arrow integration
 */
const ExampleMenuSystem = {
  options: [
    { label: 'START GAME', x: 400, y: 300 },
    { label: 'MULTIPLAYER', x: 400, y: 350 },
    { label: 'SETTINGS', x: 400, y: 400 },
    { label: 'CREDITS', x: 400, y: 450 },
    { label: 'EXIT', x: 400, y: 500 },
  ],
  selectedIndex: 0,
  
  /**
   * Initialize example menu
   */
  init() {
    initMenuArrow(
      this.options[0].x - MenuArrowConfig.offsetFromOption,
      this.options[0].y
    );
  },
  
  /**
   * Move selection up
   */
  moveUp() {
    this.selectedIndex = (this.selectedIndex - 1 + this.options.length) % this.options.length;
    const option = this.options[this.selectedIndex];
    pointArrowAtOption(option.x, option.y, 'left');
  },
  
  /**
   * Move selection down
   */
  moveDown() {
    this.selectedIndex = (this.selectedIndex + 1) % this.options.length;
    const option = this.options[this.selectedIndex];
    pointArrowAtOption(option.x, option.y, 'left');
  },
  
  /**
   * Update menu
   */
  update(dt) {
    updateMenuArrow(dt);
  },
  
  /**
   * Render menu
   */
  render(ctx) {
    // Render menu options
    this.options.forEach((option, i) => {
      const isSelected = i === this.selectedIndex;
      ctx.fillStyle = isSelected ? '#00ffff' : '#ffffff';
      ctx.font = isSelected ? 'bold 24px monospace' : '20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(option.label, option.x, option.y);
    });
    
    // Render arrow pointing at selected option
    renderMenuArrow(ctx);
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

window.MenuArrow3D = {
  // Core functions
  init: initMenuArrow,
  pointAt: pointArrowAtOption,
  update: updateMenuArrow,
  render: renderMenuArrow,
  
  // Configuration
  setSpinSpeed: setArrowSpinSpeed,
  setColors: setArrowColors,
  setAnimation: setArrowAnimation,
  
  // State access
  getState: () => ({ ...MenuArrowState }),
  getConfig: () => ({ ...MenuArrowConfig }),
  
  // Example system
  example: ExampleMenuSystem,
};

console.log('[MenuArrow3D] 3D spinning menu arrow system loaded');
