/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NEO-VECTR ∞SNIP3 - SYSTEM CHECKER & DEBUG OVERLAY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Comprehensive system validation and debugging:
 * - File integrity checking during boot
 * - Version management with update notifications
 * - Cross-screen debug overlay (CapsLock+Tab toggle)
 * - Auto-hide after boot, manual toggle anytime
 * - Network status, performance metrics, error tracking
 * - Issue reporting and diagnostics
 * 
 * Features:
 * - Validates all game files (JS, audio, assets)
 * - Checks for new versions from server/manifest
 * - Displays version info and update prompts on menu
 * - Debug overlay works on BOOT, MENU, and GAME screens
 * - CapsLock + Tab hotkey to show/hide
 * - Auto-hides after successful boot
 * - Shows network status, FPS, memory, errors
 * - Export diagnostics for troubleshooting
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// VERSION & FILE MANIFEST
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Current game version
 * Format: MAJOR.MINOR.PATCH
 */
const GAME_VERSION = {
  major: 1,
  minor: 0,
  patch: 0,
  build: '2026.01.22',
  string: '1.0.0',
  fullString: 'v1.0.0 (Build 2026.01.22)',
};

/**
 * File manifest - all critical files that must load
 */
const FILE_MANIFEST = {
  // Core game files
  core: [
    { path: 'index.html', type: 'html', required: true },
  ],
  
  // JavaScript modules
  scripts: [
    { path: 'network.js', type: 'js', required: false, description: 'Multiplayer networking' },
    { path: 'network-input.js', type: 'js', required: false, description: 'Input synchronization' },
    { path: 'network-state.js', type: 'js', required: false, description: 'State broadcasting' },
    { path: 'audio-control.js', type: 'js', required: false, description: 'Audio engine' },
    { path: 'audio-gui.js', type: 'js', required: false, description: 'Audio controls GUI' },
    { path: 'menu-arrow-3d.js', type: 'js', required: false, description: '3D menu arrow' },
    { path: 'enhanced-menu.js', type: 'js', required: false, description: 'Enhanced menu system' },
    { path: 'system-checker.js', type: 'js', required: true, description: 'System checker (this file)' },
  ],
  
  // Audio files
  audio: [
    { path: 'audio/laser-45816.mp3', type: 'audio', required: false, description: 'Ricochet SFX' },
    { path: 'audio/laser-gun-81720.mp3', type: 'audio', required: false, description: 'Shoot SFX' },
    { path: 'audio/rayo-laser-101851.mp3', type: 'audio', required: false, description: 'Boost SFX' },
    { path: 'audio/laser-zap-2-90669.mp3', type: 'audio', required: false, description: 'Zap SFX' },
    { path: 'audio/the-moses-laser-cannon-182841.mp3', type: 'audio', required: false, description: 'Boot theme (TRNDSTR)' },
  ],
  
  // Documentation (optional)
  docs: [
    { path: 'CREDITS.md', type: 'doc', required: false, description: 'Credits & attribution' },
    { path: 'INTEGRATION_GUIDE.md', type: 'doc', required: false, description: 'Network integration guide' },
    { path: 'AUDIO_INTEGRATION_GUIDE.md', type: 'doc', required: false, description: 'Audio integration guide' },
  ],
};

/**
 * System check results
 */
const SystemCheck = {
  // File validation
  filesChecked: false,
  fileResults: [],
  missingFiles: [],
  loadedFiles: [],
  
  // Version checking
  versionChecked: false,
  currentVersion: GAME_VERSION.string,
  latestVersion: null,
  updateAvailable: false,
  updateURL: null,
  
  // Issues
  errors: [],
  warnings: [],
  
  // Status
  bootComplete: false,
  allCriticalFilesOK: true,
};

// ═══════════════════════════════════════════════════════════════════════════
// FILE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a file exists and is accessible
 * @param {string} path - File path
 * @returns {Promise<boolean>}
 */
async function checkFileExists(path) {
  try {
    const response = await fetch(path, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Validate all game files
 * @returns {Promise<void>}
 */
async function validateGameFiles() {
  SystemCheck.fileResults = [];
  SystemCheck.missingFiles = [];
  SystemCheck.loadedFiles = [];
  
  // Combine all file lists
  const allFiles = [
    ...FILE_MANIFEST.scripts,
    ...FILE_MANIFEST.audio,
    ...FILE_MANIFEST.docs,
  ];
  
  console.log('[SystemCheck] Validating', allFiles.length, 'files...');
  
  // Check each file
  for (const file of allFiles) {
    const exists = await checkFileExists(file.path);
    
    const result = {
      path: file.path,
      type: file.type,
      required: file.required,
      description: file.description,
      exists: exists,
      status: exists ? 'OK' : (file.required ? 'MISSING (CRITICAL)' : 'MISSING (OPTIONAL)'),
    };
    
    SystemCheck.fileResults.push(result);
    
    if (exists) {
      SystemCheck.loadedFiles.push(file.path);
    } else {
      SystemCheck.missingFiles.push(file.path);
      
      if (file.required) {
        SystemCheck.errors.push(`Critical file missing: ${file.path}`);
        SystemCheck.allCriticalFilesOK = false;
      } else {
        SystemCheck.warnings.push(`Optional file missing: ${file.path} (${file.description})`);
      }
    }
  }
  
  SystemCheck.filesChecked = true;
  
  console.log('[SystemCheck] Files loaded:', SystemCheck.loadedFiles.length);
  console.log('[SystemCheck] Files missing:', SystemCheck.missingFiles.length);
  if (SystemCheck.missingFiles.length > 0) {
    console.warn('[SystemCheck] Missing files:', SystemCheck.missingFiles);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// VERSION CHECKING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check for new version from server
 * @param {string} manifestURL - URL to version manifest (JSON)
 * @returns {Promise<void>}
 */
async function checkForUpdates(manifestURL = 'version.json') {
  try {
    const response = await fetch(manifestURL + '?t=' + Date.now());
    if (!response.ok) {
      console.log('[SystemCheck] Version manifest not found (this is OK for local dev)');
      SystemCheck.versionChecked = true;
      return;
    }
    
    const manifest = await response.json();
    SystemCheck.latestVersion = manifest.version;
    SystemCheck.updateURL = manifest.downloadURL || null;
    
    // Compare versions
    if (compareVersions(GAME_VERSION.string, manifest.version) < 0) {
      SystemCheck.updateAvailable = true;
      console.log('[SystemCheck] Update available:', manifest.version, '(current:', GAME_VERSION.string + ')');
    } else {
      console.log('[SystemCheck] You have the latest version:', GAME_VERSION.string);
    }
    
    SystemCheck.versionChecked = true;
  } catch (error) {
    console.log('[SystemCheck] Version check skipped (offline or no manifest)');
    SystemCheck.versionChecked = true;
  }
}

/**
 * Compare two semantic version strings
 * @param {string} v1 - Version 1 (e.g., "1.0.0")
 * @param {string} v2 - Version 2 (e.g., "1.1.0")
 * @returns {number} - -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    
    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }
  
  return 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// BOOT SEQUENCE INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run all system checks during boot
 * Call this at the start of boot sequence
 * @returns {Promise<void>}
 */
async function runBootSystemChecks() {
  console.log('[SystemCheck] ═══════════════════════════════════════════');
  console.log('[SystemCheck] NEO-VECTR ∞SNIP3', GAME_VERSION.fullString);
  console.log('[SystemCheck] ═══════════════════════════════════════════');
  
  // File validation
  await validateGameFiles();
  
  // Version checking
  await checkForUpdates();
  
  // Summary
  console.log('[SystemCheck] Boot checks complete');
  console.log('[SystemCheck] - Files OK:', SystemCheck.loadedFiles.length);
  console.log('[SystemCheck] - Errors:', SystemCheck.errors.length);
  console.log('[SystemCheck] - Warnings:', SystemCheck.warnings.length);
  
  if (SystemCheck.updateAvailable) {
    console.log('[SystemCheck] ⚠️  UPDATE AVAILABLE:', SystemCheck.latestVersion);
  }
  
  SystemCheck.bootComplete = true;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEBUG OVERLAY SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Debug overlay state
 */
const DebugOverlay = {
  visible: true,              // Starts visible, auto-hides after boot
  autoHidden: false,          // Tracks if we auto-hid after boot
  
  // Toggle keys
  capsLockActive: false,
  tabPressed: false,
  lastToggleTime: 0,
  
  // Display sections
  showPerformance: true,
  showNetwork: true,
  showFiles: true,
  showVersion: true,
  showErrors: true,
  
  // Performance tracking
  fps: 0,
  frameTime: 0,
  memoryUsage: 0,
  
  // Network tracking
  networkStatus: 'Offline',
  connectedPeers: 0,
  bandwidth: { up: 0, down: 0 },
};

/**
 * Initialize debug overlay
 * Sets up keyboard listeners for CapsLock + Tab toggle
 */
function initDebugOverlay() {
  // CapsLock detection (tricky - we use a workaround)
  document.addEventListener('keydown', (e) => {
    // Detect CapsLock state via getModifierState
    DebugOverlay.capsLockActive = e.getModifierState && e.getModifierState('CapsLock');
    
    // Tab key
    if (e.key === 'Tab') {
      e.preventDefault(); // Prevent default tab behavior
      DebugOverlay.tabPressed = true;
      
      // Toggle if CapsLock is active
      if (DebugOverlay.capsLockActive) {
        const now = Date.now();
        if (now - DebugOverlay.lastToggleTime > 200) { // Debounce
          DebugOverlay.visible = !DebugOverlay.visible;
          DebugOverlay.lastToggleTime = now;
          console.log('[DebugOverlay]', DebugOverlay.visible ? 'Shown' : 'Hidden');
        }
      }
    }
  });
  
  document.addEventListener('keyup', (e) => {
    if (e.key === 'Tab') {
      DebugOverlay.tabPressed = false;
    }
  });
  
  console.log('[DebugOverlay] Initialized (CapsLock + Tab to toggle)');
}

/**
 * Auto-hide debug overlay after successful boot
 * Call this when transitioning from BOOT to MENU
 */
function autoHideDebugAfterBoot() {
  if (!DebugOverlay.autoHidden && SystemCheck.bootComplete) {
    DebugOverlay.visible = false;
    DebugOverlay.autoHidden = true;
    console.log('[DebugOverlay] Auto-hidden after boot (CapsLock + Tab to show)');
  }
}

/**
 * Update debug overlay metrics
 * Call this every frame
 * @param {number} dt - Delta time
 * @param {number} fps - Current FPS
 * @param {Object} gameState - Current game state (optional)
 */
function updateDebugMetrics(dt, fps, gameState = {}) {
  DebugOverlay.fps = Math.round(fps);
  DebugOverlay.frameTime = Math.round(dt * 1000 * 10) / 10; // ms, 1 decimal
  
  // Memory usage (if available)
  if (performance.memory) {
    DebugOverlay.memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1048576); // MB
  }
  
  // Network status (from multiplayer system if available)
  if (window.NetworkState) {
    DebugOverlay.networkStatus = window.NetworkState.isConnected ? 'Online' : 'Offline';
    DebugOverlay.connectedPeers = window.NetworkState.connectedPeers || 0;
  }
}

/**
 * Render debug overlay on canvas
 * Call this after all game rendering (so it's on top)
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {string} appMode - Current app mode ('BOOT', 'MENU', 'GAME')
 */
function renderDebugOverlay(ctx, canvasWidth, canvasHeight, appMode) {
  if (!DebugOverlay.visible) return;
  
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  
  // Panel background
  const panelX = 10;
  const panelY = 10;
  const panelWidth = 340;
  const lineHeight = 18;
  let currentY = panelY + 20;
  
  // Calculate panel height based on visible sections
  let contentLines = 2; // Title + mode
  if (DebugOverlay.showVersion) contentLines += 3;
  if (DebugOverlay.showFiles) contentLines += 3;
  if (DebugOverlay.showPerformance) contentLines += 4;
  if (DebugOverlay.showNetwork) contentLines += 3;
  if (DebugOverlay.showErrors && (SystemCheck.errors.length > 0 || SystemCheck.warnings.length > 0)) {
    contentLines += 2 + SystemCheck.errors.length + Math.min(SystemCheck.warnings.length, 3);
  }
  
  const panelHeight = contentLines * lineHeight + 20;
  
  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
  
  // Border (neon cyan)
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
  
  // Text rendering helper
  const drawText = (text, color = '#ffffff', bold = false) => {
    ctx.fillStyle = color;
    ctx.font = `${bold ? 'bold ' : ''}12px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text, panelX + 10, currentY);
    currentY += lineHeight;
  };
  
  // Title
  drawText('NEO-VECTR DEBUG OVERLAY', '#00ffff', true);
  drawText(`Mode: ${appMode} | CapsLock+Tab to toggle`, '#aaaaaa');
  currentY += 5;
  
  // Version info
  if (DebugOverlay.showVersion) {
    drawText('VERSION:', '#ff00ff', true);
    drawText(`  Current: ${GAME_VERSION.fullString}`, '#ffffff');
    if (SystemCheck.versionChecked) {
      if (SystemCheck.updateAvailable) {
        drawText(`  Latest: ${SystemCheck.latestVersion} [UPDATE!]`, '#ffff00');
      } else {
        drawText(`  Status: Up to date ✓`, '#00ff00');
      }
    }
    currentY += 5;
  }
  
  // File status
  if (DebugOverlay.showFiles) {
    drawText('FILES:', '#ff00ff', true);
    drawText(`  Loaded: ${SystemCheck.loadedFiles.length}`, '#00ff00');
    drawText(`  Missing: ${SystemCheck.missingFiles.length}`, 
      SystemCheck.missingFiles.length > 0 ? '#ffaa00' : '#00ff00');
    currentY += 5;
  }
  
  // Performance
  if (DebugOverlay.showPerformance) {
    drawText('PERFORMANCE:', '#ff00ff', true);
    const fpsColor = DebugOverlay.fps >= 55 ? '#00ff00' : (DebugOverlay.fps >= 30 ? '#ffaa00' : '#ff0000');
    drawText(`  FPS: ${DebugOverlay.fps}`, fpsColor);
    drawText(`  Frame: ${DebugOverlay.frameTime}ms`, '#ffffff');
    if (DebugOverlay.memoryUsage > 0) {
      drawText(`  Memory: ${DebugOverlay.memoryUsage}MB`, '#ffffff');
    }
    currentY += 5;
  }
  
  // Network
  if (DebugOverlay.showNetwork) {
    drawText('NETWORK:', '#ff00ff', true);
    const statusColor = DebugOverlay.networkStatus === 'Online' ? '#00ff00' : '#aaaaaa';
    drawText(`  Status: ${DebugOverlay.networkStatus}`, statusColor);
    if (DebugOverlay.connectedPeers > 0) {
      drawText(`  Peers: ${DebugOverlay.connectedPeers}`, '#00ffff');
    }
    currentY += 5;
  }
  
  // Errors & Warnings
  if (DebugOverlay.showErrors && (SystemCheck.errors.length > 0 || SystemCheck.warnings.length > 0)) {
    if (SystemCheck.errors.length > 0) {
      drawText('ERRORS:', '#ff0000', true);
      SystemCheck.errors.forEach(err => {
        const shortErr = err.length > 40 ? err.substring(0, 37) + '...' : err;
        drawText(`  • ${shortErr}`, '#ff6666');
      });
    }
    
    if (SystemCheck.warnings.length > 0) {
      drawText('WARNINGS:', '#ffaa00', true);
      const maxWarnings = 3;
      SystemCheck.warnings.slice(0, maxWarnings).forEach(warn => {
        const shortWarn = warn.length > 40 ? warn.substring(0, 37) + '...' : warn;
        drawText(`  • ${shortWarn}`, '#ffcc66');
      });
      if (SystemCheck.warnings.length > maxWarnings) {
        drawText(`  + ${SystemCheck.warnings.length - maxWarnings} more...`, '#ffcc66');
      }
    }
  }
  
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// MENU VERSION DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Render version info and update notification on menu
 * Call this in your menu rendering code
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 */
function renderMenuVersionInfo(ctx, canvasWidth, canvasHeight) {
  ctx.save();
  
  // Bottom-left: Version
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.font = '12px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillText(GAME_VERSION.fullString, 15, canvasHeight - 15);
  
  // If update available, show notification
  if (SystemCheck.updateAvailable && SystemCheck.latestVersion) {
    const notifY = canvasHeight - 50;
    
    // Background
    ctx.fillStyle = 'rgba(255, 170, 0, 0.15)';
    ctx.fillRect(10, notifY - 5, 250, 30);
    
    // Border
    ctx.strokeStyle = 'rgba(255, 170, 0, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, notifY - 5, 250, 30);
    
    // Text
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#ffaa00';
    ctx.fillText(`⚠ Update available: v${SystemCheck.latestVersion}`, 20, notifY);
    
    if (SystemCheck.updateURL) {
      ctx.font = '10px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Visit website to download', 20, notifY + 14);
    }
  }
  
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// DIAGNOSTICS EXPORT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Export diagnostic report
 * @returns {Object} - Diagnostic data
 */
function exportDiagnostics() {
  return {
    version: GAME_VERSION,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    
    systemCheck: {
      filesChecked: SystemCheck.filesChecked,
      loadedFiles: SystemCheck.loadedFiles,
      missingFiles: SystemCheck.missingFiles,
      errors: SystemCheck.errors,
      warnings: SystemCheck.warnings,
    },
    
    performance: {
      fps: DebugOverlay.fps,
      frameTime: DebugOverlay.frameTime,
      memoryUsage: DebugOverlay.memoryUsage,
    },
    
    network: {
      status: DebugOverlay.networkStatus,
      peers: DebugOverlay.connectedPeers,
    },
  };
}

/**
 * Download diagnostics as JSON file
 */
function downloadDiagnostics() {
  const data = exportDiagnostics();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `neovectr-diagnostics-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log('[SystemCheck] Diagnostics exported');
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS & INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

// Global API
window.SystemChecker = {
  // Version info
  version: GAME_VERSION,
  
  // Boot checks
  runBootChecks: runBootSystemChecks,
  validateFiles: validateGameFiles,
  checkUpdates: checkForUpdates,
  
  // Debug overlay
  initDebug: initDebugOverlay,
  updateMetrics: updateDebugMetrics,
  renderDebug: renderDebugOverlay,
  autoHideAfterBoot: autoHideDebugAfterBoot,
  toggleDebug: () => { DebugOverlay.visible = !DebugOverlay.visible; },
  
  // Menu integration
  renderMenuVersion: renderMenuVersionInfo,
  
  // Diagnostics
  exportDiagnostics: exportDiagnostics,
  downloadDiagnostics: downloadDiagnostics,
  
  // State access
  getSystemCheck: () => ({ ...SystemCheck }),
  getDebugState: () => ({ ...DebugOverlay }),
};

// Auto-initialize debug overlay
initDebugOverlay();

console.log('[SystemChecker] Loaded', GAME_VERSION.fullString);
console.log('[SystemChecker] CapsLock + Tab to toggle debug overlay');

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION EXAMPLE
// ═══════════════════════════════════════════════════════════════════════════

/*

INTEGRATION INTO index.html:

1. Add script tag:
   <script src="system-checker.js"></script>

2. At start of boot (in startBoot() or firstInteraction()):
   
   async function startBoot() {
     if (appMode !== 'BOOT_WAIT') return;
     appMode = 'BOOT';
     
     // Run system checks
     await SystemChecker.runBootChecks();
     
     // Start boot audio/visuals
     bootT0 = performance.now();
     // ... existing boot code ...
   }

3. In frameLoop(), add debug rendering for all modes:
   
   // After all rendering (so debug is on top)
   SystemChecker.updateMetrics(dt, fps, gameState);
   SystemChecker.renderDebug(ctx, canvas.width, canvas.height, appMode);
   
   // Auto-hide after boot complete
   if (appMode === 'MENU' && !DebugOverlay.autoHidden) {
     SystemChecker.autoHideAfterBoot();
   }

4. In menu rendering, add version display:
   
   function drawMenuScreen(now) {
     // ... existing menu rendering ...
     
     // Add version info and update notification
     SystemChecker.renderMenuVersion(ctx, canvas.width, canvas.height);
   }

5. Track FPS for debug display:
   
   let fpsFrames = 0;
   let fpsTimer = 0;
   let currentFPS = 60;
   
   function frameLoop() {
     const now = performance.now();
     let dt = (now - last) / 1000;
     // ...
     
     fpsFrames++;
     fpsTimer += dt;
     if (fpsTimer >= 0.5) {
       currentFPS = fpsFrames / fpsTimer;
       fpsFrames = 0;
       fpsTimer = 0;
     }
     
     // Update debug metrics
     SystemChecker.updateMetrics(dt, currentFPS);
   }

6. OPTIONAL - Add diagnostics button to debug HUD:
   
   document.getElementById('exportDiag').addEventListener('click', () => {
     SystemChecker.downloadDiagnostics();
   });

FEATURES:
- Debug overlay visible during boot
- Auto-hides when entering menu
- CapsLock + Tab to show/hide anytime
- Works on BOOT, MENU, and GAME screens
- Shows version, files, performance, network, errors
- Menu displays version + update notification
- Export diagnostics for troubleshooting

*/
