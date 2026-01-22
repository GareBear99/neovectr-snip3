/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NEO-VECTR ∞SNIP3 - CREDITS & DOCUMENTATION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Credits screen with:
 * - Development team credits
 * - TRNDSTR music attribution
 * - Technology stack information
 * - Documentation access buttons
 * - API reference links
 * - Modding guides
 * - Version information
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// CREDITS STATE
// ═══════════════════════════════════════════════════════════════════════════

const CreditsState = {
  isOpen: false,
  scrollOffset: 0,
  scrollSpeed: 50, // pixels per second
  autoScroll: false,
  selectedDocIndex: -1,
};

// ═══════════════════════════════════════════════════════════════════════════
// CREDITS CONTENT
// ═══════════════════════════════════════════════════════════════════════════

const CreditsContent = {
  game: {
    title: 'NEO-VECTR ∞SNIP3',
    subtitle: 'Neon Arena Combat',
    version: 'v1.0.0',
    build: '2026.01.22',
  },
  
  team: {
    development: 'NEO-VECTR Development Team',
    design: 'Master Control Design',
    audio: 'TRNDSTR (Music Composer)',
    testing: 'Community Beta Testers',
  },
  
  music: {
    composer: 'TRNDSTR',
    tracks: [
      'Main Theme',
      'Battle Theme',
      'Victory Theme',
      'Menu Ambience',
    ],
    attribution: '♫ All music composed by TRNDSTR',
  },
  
  tech: {
    engine: 'HTML5 Canvas + WebGL',
    audio: 'Web Audio API',
    networking: 'WebRTC P2P',
    physics: 'Custom 2D Physics',
    platform: 'Cross-Platform (Web)',
  },
  
  features: [
    'Multiplayer (1-8 players)',
    'Battle Royale (up to 99 players)',
    'Custom Shape Editor',
    'Advanced Audio System',
    'Touch Controls',
    'Gamepad Support',
    'Network Play (P2P)',
    'AI Opponents',
  ],
  
  specialThanks: [
    'Community Feedback',
    'Open Source Libraries',
    'Beta Testing Team',
    'TRNDSTR for Amazing Music',
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTATION LINKS
// ═══════════════════════════════════════════════════════════════════════════

const DocumentationLinks = [
  {
    title: 'SHAPE EDITOR GUIDE',
    file: 'SHAPE_EDITOR_GUIDE.md',
    description: 'Learn to create custom ship shapes',
    icon: '🎨',
  },
  {
    title: 'AUDIO INTEGRATION',
    file: 'AUDIO_INTEGRATION_GUIDE.md',
    description: 'Audio system and music attribution',
    icon: '🎵',
  },
  {
    title: 'NETWORK API',
    file: 'NETWORK_QUICK_REFERENCE.md',
    description: 'Multiplayer networking documentation',
    icon: '🌐',
  },
  {
    title: 'HOST MIGRATION',
    file: 'HOST_MIGRATION_SYSTEM.md',
    description: 'Advanced network hosting guide',
    icon: '🔄',
  },
  {
    title: 'INTEGRATION GUIDE',
    file: 'INTEGRATION_GUIDE.md',
    description: 'Complete system integration',
    icon: '📘',
  },
  {
    title: 'NETWORKED AUDIO',
    file: 'NETWORKED_INPUT_AUDIO_SYSTEM.md',
    description: 'Custom music streaming guide',
    icon: '🎧',
  },
  {
    title: 'CREDITS',
    file: 'CREDITS.md',
    description: 'Full credits and attributions',
    icon: '⭐',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Render credits screen
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {number} deltaTime - For auto-scroll
 */
function renderCredits(ctx, canvasWidth, canvasHeight, deltaTime) {
  if (!CreditsState.isOpen) return;
  
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  
  // Dark background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // Auto-scroll
  if (CreditsState.autoScroll) {
    CreditsState.scrollOffset += CreditsState.scrollSpeed * deltaTime;
  }
  
  const centerX = canvasWidth / 2;
  let currentY = 50 - CreditsState.scrollOffset;
  const lineHeight = 25;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TITLE
  // ═══════════════════════════════════════════════════════════════════════════
  
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  // Game title
  ctx.font = 'bold 48px monospace';
  ctx.fillStyle = '#00ffff';
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
  ctx.lineWidth = 10;
  ctx.strokeText(CreditsContent.game.title, centerX, currentY);
  ctx.fillText(CreditsContent.game.title, centerX, currentY);
  currentY += 60;
  
  // Subtitle
  ctx.globalCompositeOperation = 'source-over';
  ctx.font = '20px monospace';
  ctx.fillStyle = '#ff00ff';
  ctx.fillText(CreditsContent.game.subtitle, centerX, currentY);
  currentY += 40;
  
  // Version
  ctx.font = '14px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText(`${CreditsContent.game.version} • Build ${CreditsContent.game.build}`, centerX, currentY);
  currentY += 60;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TEAM
  // ═══════════════════════════════════════════════════════════════════════════
  
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = '#00ffff';
  ctx.fillText('DEVELOPMENT TEAM', centerX, currentY);
  currentY += 40;
  
  ctx.font = '16px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  
  const teamEntries = Object.entries(CreditsContent.team);
  for (const [role, name] of teamEntries) {
    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText(roleLabel, centerX - 150, currentY);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(name, centerX + 150, currentY);
    currentY += lineHeight;
  }
  currentY += 40;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MUSIC
  // ═══════════════════════════════════════════════════════════════════════════
  
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = '#ff00ff';
  ctx.textAlign = 'center';
  ctx.fillText('♫ MUSIC BY TRNDSTR ♫', centerX, currentY);
  currentY += 40;
  
  ctx.font = '16px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText(CreditsContent.music.attribution, centerX, currentY);
  currentY += 35;
  
  ctx.font = '14px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText('Tracks:', centerX, currentY);
  currentY += 25;
  
  for (const track of CreditsContent.music.tracks) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText(`• ${track}`, centerX, currentY);
    currentY += 20;
  }
  currentY += 40;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TECHNOLOGY
  // ═══════════════════════════════════════════════════════════════════════════
  
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = '#00ffff';
  ctx.fillText('TECHNOLOGY STACK', centerX, currentY);
  currentY += 40;
  
  ctx.font = '15px monospace';
  const techEntries = Object.entries(CreditsContent.tech);
  for (const [key, value] of techEntries) {
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText(label, centerX - 150, currentY);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(value, centerX + 150, currentY);
    currentY += lineHeight;
  }
  currentY += 40;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FEATURES
  // ═══════════════════════════════════════════════════════════════════════════
  
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = '#ff00ff';
  ctx.fillText('FEATURES', centerX, currentY);
  currentY += 40;
  
  ctx.font = '14px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  
  // Two columns
  const featureCount = CreditsContent.features.length;
  const mid = Math.ceil(featureCount / 2);
  const leftX = centerX - 200;
  const rightX = centerX + 50;
  let leftY = currentY;
  let rightY = currentY;
  
  for (let i = 0; i < featureCount; i++) {
    const feature = CreditsContent.features[i];
    if (i < mid) {
      ctx.textAlign = 'left';
      ctx.fillText(`• ${feature}`, leftX, leftY);
      leftY += 22;
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(`• ${feature}`, rightX, rightY);
      rightY += 22;
    }
  }
  currentY = Math.max(leftY, rightY) + 40;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DOCUMENTATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  ctx.font = 'bold 24px monospace';
  ctx.fillStyle = '#00ffff';
  ctx.textAlign = 'center';
  ctx.fillText('📚 DOCUMENTATION', centerX, currentY);
  currentY += 50;
  
  // Render documentation buttons
  const buttonWidth = 400;
  const buttonHeight = 60;
  const buttonPadding = 10;
  
  for (let i = 0; i < DocumentationLinks.length; i++) {
    const doc = DocumentationLinks[i];
    const buttonX = centerX - buttonWidth / 2;
    const buttonY = currentY;
    
    const isHovered = CreditsState.selectedDocIndex === i;
    
    // Button background
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = isHovered ? 'rgba(0, 255, 255, 0.2)' : 'rgba(0, 255, 255, 0.08)';
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    // Button border
    ctx.strokeStyle = isHovered ? 'rgba(0, 255, 255, 0.8)' : 'rgba(0, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    // Icon
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = '28px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(doc.icon, buttonX + 15, buttonY + 22);
    
    // Title
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = isHovered ? '#00ffff' : '#ffffff';
    ctx.fillText(doc.title, buttonX + 60, buttonY + 18);
    
    // Description
    ctx.font = '12px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(doc.description, buttonX + 60, buttonY + 38);
    
    currentY += buttonHeight + buttonPadding;
  }
  
  currentY += 40;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIAL THANKS
  // ═══════════════════════════════════════════════════════════════════════════
  
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = '#ff00ff';
  ctx.textAlign = 'center';
  ctx.fillText('SPECIAL THANKS', centerX, currentY);
  currentY += 40;
  
  ctx.font = '15px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  for (const thanks of CreditsContent.specialThanks) {
    ctx.fillText(thanks, centerX, currentY);
    currentY += 25;
  }
  currentY += 60;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════════════════
  
  ctx.font = 'bold 28px monospace';
  ctx.fillStyle = '#00ffff';
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillText('NEO-VECTR™ INC', centerX, currentY);
  currentY += 40;
  
  ctx.font = '14px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText('© 2026 All Rights Reserved', centerX, currentY);
  currentY += 60;
  
  // Controls hint
  ctx.globalCompositeOperation = 'source-over';
  ctx.font = '12px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillText('ESC: Back • Scroll: Navigate • Click: Open Documentation', centerX, canvasHeight - 20);
  
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// INPUT HANDLING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Handle keyboard input
 * @param {KeyboardEvent} event
 */
function handleCreditsKeyboard(event) {
  if (!CreditsState.isOpen) return;
  
  if (event.key === 'Escape') {
    closeCredits();
    event.preventDefault();
  } else if (event.key === 'ArrowUp') {
    CreditsState.scrollOffset = Math.max(0, CreditsState.scrollOffset - 50);
    CreditsState.autoScroll = false;
    event.preventDefault();
  } else if (event.key === 'ArrowDown') {
    CreditsState.scrollOffset += 50;
    CreditsState.autoScroll = false;
    event.preventDefault();
  } else if (event.key === 'Home') {
    CreditsState.scrollOffset = 0;
    CreditsState.autoScroll = false;
    event.preventDefault();
  } else if (event.key === 'End') {
    CreditsState.scrollOffset = 2000; // Scroll to bottom
    CreditsState.autoScroll = false;
    event.preventDefault();
  }
}

/**
 * Handle mouse click on documentation buttons
 * @param {number} mouseX
 * @param {number} mouseY
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 */
function handleCreditsClick(mouseX, mouseY, canvasWidth, canvasHeight) {
  if (!CreditsState.isOpen) return;
  
  // Convert to canvas coordinates
  const centerX = canvasWidth / 2;
  const buttonWidth = 400;
  const buttonHeight = 60;
  const buttonPadding = 10;
  const startY = 50 - CreditsState.scrollOffset + 800; // Approximate docs section start
  
  for (let i = 0; i < DocumentationLinks.length; i++) {
    const buttonX = centerX - buttonWidth / 2;
    const buttonY = startY + i * (buttonHeight + buttonPadding);
    
    if (mouseX >= buttonX && mouseX <= buttonX + buttonWidth &&
        mouseY >= buttonY && mouseY <= buttonY + buttonHeight) {
      openDocumentation(DocumentationLinks[i]);
      return;
    }
  }
}

/**
 * Handle mouse move for hover effects
 * @param {number} mouseX
 * @param {number} mouseY
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 */
function handleCreditsMouseMove(mouseX, mouseY, canvasWidth, canvasHeight) {
  if (!CreditsState.isOpen) return;
  
  const centerX = canvasWidth / 2;
  const buttonWidth = 400;
  const buttonHeight = 60;
  const buttonPadding = 10;
  const startY = 50 - CreditsState.scrollOffset + 800;
  
  CreditsState.selectedDocIndex = -1;
  
  for (let i = 0; i < DocumentationLinks.length; i++) {
    const buttonX = centerX - buttonWidth / 2;
    const buttonY = startY + i * (buttonHeight + buttonPadding);
    
    if (mouseX >= buttonX && mouseX <= buttonX + buttonWidth &&
        mouseY >= buttonY && mouseY <= buttonY + buttonHeight) {
      CreditsState.selectedDocIndex = i;
      return;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTATION ACCESS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Open documentation file
 * @param {Object} doc - Documentation link object
 */
function openDocumentation(doc) {
  const fullPath = `/Users/TheRustySpoon/Desktop/Projects/Main projects/Games/Infinity_SNIP3/NeoVECTR_Startup/${doc.file}`;
  
  console.log(`[Credits] Opening documentation: ${doc.title}`);
  console.log(`[Credits] File: ${doc.file}`);
  
  // Try to open in new window/tab
  try {
    // For web context, open as URL
    const url = doc.file;
    window.open(url, '_blank');
  } catch (e) {
    console.error(`[Credits] Failed to open documentation:`, e);
    alert(`Documentation: ${doc.title}\nFile: ${doc.file}\n\nPlease open this file manually in the project directory.`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CREDITS CONTROL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Open credits screen
 */
function openCredits() {
  CreditsState.isOpen = true;
  CreditsState.scrollOffset = 0;
  CreditsState.autoScroll = false;
  CreditsState.selectedDocIndex = -1;
  console.log('[Credits] Credits opened');
}

/**
 * Close credits screen
 */
function closeCredits() {
  CreditsState.isOpen = false;
  console.log('[Credits] Credits closed');
}

/**
 * Toggle auto-scroll
 */
function toggleAutoScroll() {
  CreditsState.autoScroll = !CreditsState.autoScroll;
  console.log(`[Credits] Auto-scroll: ${CreditsState.autoScroll ? 'ON' : 'OFF'}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

window.Credits = {
  // State
  state: CreditsState,
  content: CreditsContent,
  docs: DocumentationLinks,
  
  // Rendering
  render: renderCredits,
  
  // Input
  handleKeyboard: handleCreditsKeyboard,
  handleClick: handleCreditsClick,
  handleMouseMove: handleCreditsMouseMove,
  
  // Control
  open: openCredits,
  close: closeCredits,
  toggleAutoScroll,
  
  // Documentation
  openDoc: openDocumentation,
};

console.log('[Credits] Credits system loaded');
console.log('[Credits] Documentation links: ' + DocumentationLinks.length);
