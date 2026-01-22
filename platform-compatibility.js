/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NEO-VECTR ∞SNIP3 - PLATFORM COMPATIBILITY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Universal cross-platform support:
 * - Desktop (Windows, Mac, Linux)
 * - Mobile (iOS, Android, old devices)
 * - Tablets (iPad, Android tablets)
 * - Raspberry Pi (all versions 1-5)
 * - Game Consoles (PS5, Xbox, Switch via browser)
 * - Old browsers (IE11+, Safari 9+, Chrome 30+)
 * 
 * Lightweight optimizations:
 * - Auto-detect device capabilities
 * - Adaptive quality settings
 * - Low-power mode for Raspberry Pi
 * - Touch/gamepad/keyboard/mouse support
 * - Graceful degradation
 * 
 * Perfect for:
 * - LAN parties (any device mix)
 * - Chat room arcade systems
 * - Cross-play multiplayer
 * - Low-weight devices
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// DEVICE DETECTION
// ═══════════════════════════════════════════════════════════════════════════

const PlatformInfo = {
  // Device Type
  isDesktop: false,
  isMobile: false,
  isTablet: false,
  isRaspberryPi: false,
  isConsole: false,
  isOldDevice: false,
  
  // Platform
  os: 'unknown',
  osVersion: 'unknown',
  browser: 'unknown',
  browserVersion: 0,
  
  // Capabilities
  hasTouch: false,
  hasGamepad: false,
  hasWebGL: false,
  hasWebRTC: false,
  hasWebAudio: false,
  hasLocalStorage: false,
  
  // Performance
  cpuCores: 1,
  memory: 0, // GB estimate
  gpu: 'unknown',
  screen: { width: 0, height: 0, dpi: 1 },
  
  // Quality Profile
  recommendedQuality: 'medium',
  maxPlayers: 8,
  enableEffects: true,
  enableShadows: false,
  enableParticles: true,
};

/**
 * Detect device type and capabilities
 */
function detectPlatform() {
  const ua = navigator.userAgent.toLowerCase();
  const platform = navigator.platform ? navigator.platform.toLowerCase() : '';
  
  // Device Type Detection
  PlatformInfo.hasTouch = ('ontouchstart' in window) || 
                          (navigator.maxTouchPoints > 0) ||
                          (navigator.msMaxTouchPoints > 0);
  
  // Mobile Detection
  PlatformInfo.isMobile = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua);
  
  // Tablet Detection
  PlatformInfo.isTablet = /ipad|android(?!.*mobile)|tablet/i.test(ua);
  
  // Raspberry Pi Detection
  PlatformInfo.isRaspberryPi = /raspberry|armv7l|armv6l|arm64/i.test(ua) || 
                                /linux armv/i.test(ua) ||
                                (platform.includes('linux') && screen.width <= 1920 && navigator.hardwareConcurrency <= 4);
  
  // Console Detection (PS5, Xbox, Switch browser)
  PlatformInfo.isConsole = /playstation|xbox|nintendo/i.test(ua);
  
  // Desktop
  PlatformInfo.isDesktop = !PlatformInfo.isMobile && !PlatformInfo.isTablet && !PlatformInfo.isRaspberryPi;
  
  // OS Detection
  if (/windows|win32|win64/i.test(ua)) {
    PlatformInfo.os = 'Windows';
  } else if (/macintosh|mac os x/i.test(ua)) {
    PlatformInfo.os = 'macOS';
  } else if (/linux/i.test(ua)) {
    PlatformInfo.os = 'Linux';
  } else if (/android/i.test(ua)) {
    PlatformInfo.os = 'Android';
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    PlatformInfo.os = 'iOS';
  }
  
  // Browser Detection
  if (/firefox/i.test(ua)) {
    PlatformInfo.browser = 'Firefox';
    const match = ua.match(/firefox\/(\d+)/);
    PlatformInfo.browserVersion = match ? parseInt(match[1]) : 0;
  } else if (/chrome/i.test(ua) && !/edge|edg/i.test(ua)) {
    PlatformInfo.browser = 'Chrome';
    const match = ua.match(/chrome\/(\d+)/);
    PlatformInfo.browserVersion = match ? parseInt(match[1]) : 0;
  } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
    PlatformInfo.browser = 'Safari';
    const match = ua.match(/version\/(\d+)/);
    PlatformInfo.browserVersion = match ? parseInt(match[1]) : 0;
  } else if (/edge|edg/i.test(ua)) {
    PlatformInfo.browser = 'Edge';
    const match = ua.match(/edg?\/(\d+)/);
    PlatformInfo.browserVersion = match ? parseInt(match[1]) : 0;
  } else if (/msie|trident/i.test(ua)) {
    PlatformInfo.browser = 'IE';
    const match = ua.match(/(?:msie |rv:)(\d+)/);
    PlatformInfo.browserVersion = match ? parseInt(match[1]) : 0;
  }
  
  // Old Device Detection
  PlatformInfo.isOldDevice = PlatformInfo.browserVersion < 60 || 
                             (PlatformInfo.browser === 'Safari' && PlatformInfo.browserVersion < 12) ||
                             (PlatformInfo.browser === 'IE');
  
  // Capabilities
  PlatformInfo.hasGamepad = 'getGamepads' in navigator;
  PlatformInfo.hasWebGL = detectWebGL();
  PlatformInfo.hasWebRTC = detectWebRTC();
  PlatformInfo.hasWebAudio = detectWebAudio();
  PlatformInfo.hasLocalStorage = detectLocalStorage();
  
  // Performance
  PlatformInfo.cpuCores = navigator.hardwareConcurrency || 1;
  PlatformInfo.memory = estimateMemory();
  PlatformInfo.screen = {
    width: window.screen.width,
    height: window.screen.height,
    dpi: window.devicePixelRatio || 1,
  };
  
  // Set Quality Profile
  setQualityProfile();
  
  console.log('[Platform] Detection complete:', PlatformInfo);
}

/**
 * Detect WebGL support
 */
function detectWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch (e) {
    return false;
  }
}

/**
 * Detect WebRTC support
 */
function detectWebRTC() {
  return !!(window.RTCPeerConnection || 
            window.webkitRTCPeerConnection || 
            window.mozRTCPeerConnection);
}

/**
 * Detect Web Audio API support
 */
function detectWebAudio() {
  return !!(window.AudioContext || window.webkitAudioContext);
}

/**
 * Detect localStorage support
 */
function detectLocalStorage() {
  try {
    const test = '__test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Estimate device memory (GB)
 */
function estimateMemory() {
  // navigator.deviceMemory (GB) - Chrome only
  if (navigator.deviceMemory) {
    return navigator.deviceMemory;
  }
  
  // Estimate based on other factors
  if (PlatformInfo.isRaspberryPi) {
    return 1; // Assume 1-4GB for Pi
  }
  
  if (PlatformInfo.isMobile) {
    return 2; // Assume 2-4GB for mobile
  }
  
  return 4; // Assume 4GB+ for desktop
}

// ═══════════════════════════════════════════════════════════════════════════
// QUALITY PROFILES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Set quality profile based on device capabilities
 */
function setQualityProfile() {
  // Raspberry Pi / Old Devices - Low Quality
  if (PlatformInfo.isRaspberryPi || PlatformInfo.isOldDevice) {
    PlatformInfo.recommendedQuality = 'low';
    PlatformInfo.maxPlayers = 4;
    PlatformInfo.enableEffects = false;
    PlatformInfo.enableShadows = false;
    PlatformInfo.enableParticles = false;
  }
  // Mobile - Medium Quality
  else if (PlatformInfo.isMobile) {
    PlatformInfo.recommendedQuality = 'medium';
    PlatformInfo.maxPlayers = 6;
    PlatformInfo.enableEffects = true;
    PlatformInfo.enableShadows = false;
    PlatformInfo.enableParticles = true;
  }
  // Tablet - Medium/High
  else if (PlatformInfo.isTablet) {
    PlatformInfo.recommendedQuality = 'medium';
    PlatformInfo.maxPlayers = 8;
    PlatformInfo.enableEffects = true;
    PlatformInfo.enableShadows = false;
    PlatformInfo.enableParticles = true;
  }
  // Desktop - High Quality
  else {
    PlatformInfo.recommendedQuality = 'high';
    PlatformInfo.maxPlayers = 8;
    PlatformInfo.enableEffects = true;
    PlatformInfo.enableShadows = true;
    PlatformInfo.enableParticles = true;
  }
  
  // Override for low-end devices
  if (PlatformInfo.cpuCores < 2 || PlatformInfo.memory < 2) {
    PlatformInfo.recommendedQuality = 'low';
    PlatformInfo.maxPlayers = 4;
    PlatformInfo.enableEffects = false;
  }
}

/**
 * Get rendering scale based on quality
 */
function getRenderScale(quality) {
  switch (quality) {
    case 'low':
      return 0.5; // 50% resolution
    case 'medium':
      return 0.75; // 75% resolution
    case 'high':
      return 1.0; // 100% resolution
    case 'ultra':
      return 1.25; // 125% resolution
    default:
      return 0.75;
  }
}

/**
 * Get FPS target based on device
 */
function getTargetFPS() {
  if (PlatformInfo.isRaspberryPi || PlatformInfo.isOldDevice) {
    return 30; // 30 FPS for low-end
  }
  
  if (PlatformInfo.isMobile) {
    return 60; // 60 FPS for mobile
  }
  
  return 60; // 60 FPS for desktop
}

// ═══════════════════════════════════════════════════════════════════════════
// POLYFILLS & COMPATIBILITY LAYER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Add polyfills for old browsers
 */
function addPolyfills() {
  // requestAnimationFrame polyfill
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (function() {
      return window.webkitRequestAnimationFrame ||
             window.mozRequestAnimationFrame ||
             window.oRequestAnimationFrame ||
             window.msRequestAnimationFrame ||
             function(callback) {
               window.setTimeout(callback, 1000 / 60);
             };
    })();
  }
  
  // performance.now() polyfill
  if (!window.performance || !window.performance.now) {
    window.performance = window.performance || {};
    window.performance.now = function() {
      return Date.now();
    };
  }
  
  // Array.from polyfill
  if (!Array.from) {
    Array.from = function(arrayLike) {
      return Array.prototype.slice.call(arrayLike);
    };
  }
  
  // Object.assign polyfill
  if (typeof Object.assign !== 'function') {
    Object.assign = function(target) {
      if (target == null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }
      const to = Object(target);
      for (let i = 1; i < arguments.length; i++) {
        const nextSource = arguments[i];
        if (nextSource != null) {
          for (const nextKey in nextSource) {
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    };
  }
  
  // Promise polyfill (simple version)
  if (typeof Promise === 'undefined') {
    console.warn('[Platform] Promise not available - some features may not work');
  }
  
  console.log('[Platform] Polyfills applied');
}

// ═══════════════════════════════════════════════════════════════════════════
// OPTIMIZATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Optimize canvas for device
 */
function optimizeCanvas(canvas, quality) {
  const scale = getRenderScale(quality);
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  
  // For low-end devices, use lower DPR
  const effectiveDPR = PlatformInfo.isRaspberryPi || PlatformInfo.isOldDevice 
    ? 1 
    : Math.min(dpr, 2);
  
  const width = Math.floor(window.innerWidth * effectiveDPR * scale);
  const height = Math.floor(window.innerHeight * effectiveDPR * scale);
  
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  
  // Disable image smoothing for pixel art on low-end
  const ctx = canvas.getContext('2d');
  if (ctx && (PlatformInfo.isRaspberryPi || quality === 'low')) {
    ctx.imageSmoothingEnabled = false;
  }
  
  return { width, height, scale, dpr: effectiveDPR };
}

/**
 * Check if device can handle feature
 */
function canHandle(feature) {
  const features = {
    'particles': PlatformInfo.enableParticles,
    'shadows': PlatformInfo.enableShadows,
    'effects': PlatformInfo.enableEffects,
    'webrtc': PlatformInfo.hasWebRTC,
    'webaudio': PlatformInfo.hasWebAudio,
    'gamepad': PlatformInfo.hasGamepad,
    'touch': PlatformInfo.hasTouch,
  };
  
  return features[feature] !== false;
}

// ═══════════════════════════════════════════════════════════════════════════
// RASPBERRY PI OPTIMIZATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Apply Raspberry Pi specific optimizations
 */
function applyRaspberryPiOptimizations() {
  if (!PlatformInfo.isRaspberryPi) return;
  
  console.log('[Platform] Applying Raspberry Pi optimizations');
  
  // Force low quality
  PlatformInfo.recommendedQuality = 'low';
  
  // Limit frame rate
  window.TARGET_FPS = 30;
  
  // Disable expensive features
  PlatformInfo.enableEffects = false;
  PlatformInfo.enableShadows = false;
  PlatformInfo.enableParticles = false;
  
  // Reduce max players
  PlatformInfo.maxPlayers = 4;
  
  console.log('[Platform] Raspberry Pi mode: 30 FPS, low quality, 4 players max');
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

window.PlatformCompat = {
  // Info
  info: PlatformInfo,
  
  // Detection
  detect: detectPlatform,
  
  // Capabilities
  canHandle,
  
  // Optimization
  optimizeCanvas,
  getRenderScale,
  getTargetFPS,
  
  // Polyfills
  addPolyfills,
  
  // Raspberry Pi
  applyRaspberryPiOptimizations,
  
  // Checks
  isLowEnd: () => PlatformInfo.isRaspberryPi || PlatformInfo.isOldDevice || PlatformInfo.memory < 2,
  isMobile: () => PlatformInfo.isMobile || PlatformInfo.isTablet,
  hasTouch: () => PlatformInfo.hasTouch,
  hasGamepad: () => PlatformInfo.hasGamepad,
  
  // Quality
  getRecommendedQuality: () => PlatformInfo.recommendedQuality,
  getMaxPlayers: () => PlatformInfo.maxPlayers,
};

// Auto-detect on load
detectPlatform();
addPolyfills();

// Apply Raspberry Pi optimizations if detected
if (PlatformInfo.isRaspberryPi) {
  applyRaspberryPiOptimizations();
}

console.log('[Platform] Compatibility layer loaded');
console.log('[Platform] Device:', PlatformInfo.os, PlatformInfo.browser);
console.log('[Platform] Quality:', PlatformInfo.recommendedQuality);
console.log('[Platform] Max Players:', PlatformInfo.maxPlayers);

// Display compatibility info
console.log('═══════════════════════════════════════════════════════');
console.log('NEO-VECTR ∞SNIP3 - PLATFORM COMPATIBILITY');
console.log('═══════════════════════════════════════════════════════');
console.log('Device Type:', PlatformInfo.isDesktop ? 'Desktop' : 
                          PlatformInfo.isMobile ? 'Mobile' :
                          PlatformInfo.isTablet ? 'Tablet' :
                          PlatformInfo.isRaspberryPi ? 'Raspberry Pi' :
                          PlatformInfo.isConsole ? 'Console' : 'Unknown');
console.log('OS:', PlatformInfo.os);
console.log('Browser:', PlatformInfo.browser, PlatformInfo.browserVersion);
console.log('Touch:', PlatformInfo.hasTouch ? 'YES' : 'NO');
console.log('Gamepad:', PlatformInfo.hasGamepad ? 'YES' : 'NO');
console.log('WebRTC:', PlatformInfo.hasWebRTC ? 'YES' : 'NO');
console.log('Web Audio:', PlatformInfo.hasWebAudio ? 'YES' : 'NO');
console.log('Recommended Quality:', PlatformInfo.recommendedQuality);
console.log('═══════════════════════════════════════════════════════');
