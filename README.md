# NEO-VECTR ∞SNIP3

<div align="center">

**Neon Arena Combat Shooter**

[![Version](https://img.shields.io/badge/version-1.0.0-00ffff.svg)](https://github.com)
[![License](https://img.shields.io/badge/license-Private-ff00ff.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Web-00ffff.svg)](https://github.com)

*An HTML5 multiplayer arena shooter with neon aesthetics, Battle Royale mode, and advanced networking*

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Support-yellow?style=flat&logo=buy-me-a-coffee)](https://buymeacoffee.com/garebear99)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support-ff5e5b?style=flat&logo=ko-fi)](https://ko-fi.com/luciferai)
[![Sponsor](https://img.shields.io/badge/Sponsor-u2764ufe0f-red?style=flat&logo=github-sponsors)](https://github.com/sponsors/GareBear99)
</div>

---

## 🎮 Overview

NEO-VECTR ∞SNIP3 is a production-grade multiplayer arena shooter built with HTML5 Canvas. Features include WebRTC P2P networking for up to 8 players, Battle Royale mode supporting 99 players (8 human + 91 AI), custom shape editor, advanced audio system with TRNDSTR music, and comprehensive touch controls for mobile/tablet devices.

## ✨ Features

- 🎯 **Multiple Game Modes**: FFA, Battle Royale (99 players), Custom
- 🎨 **Shape Editor**: Create custom ships with mathematical precision
- 🎵 **Audio System**: TRNDSTR-composed music with spatial audio
- 📱 **Touch Controls**: WASD-like movement with tap-to-fire
- 🎮 **Gamepad Support**: Up to 8 controllers
- 🌐 **Network Multiplayer**: WebRTC P2P with delta compression
- 🤖 **AI Opponents**: Skill-based AI with dynamic difficulty
- ⚡ **60 FPS Performance**: Fixed timestep physics
- 📚 **Full Documentation**: Comprehensive guides for players and modders

## 🚀 Quick Start

```bash
# Serve with any HTTP server
python3 -m http.server 8000
```

## 📁 Project Structure

```
├── Core Systems (4 files, ~2,359 lines)
│   ├── game-modes.js (469 lines) - Game mode manager
│   ├── touch-controls.js (543 lines) - Touch input system
│   ├── shape-editor.js (773 lines) - Shape editor
│   └── credits.js (574 lines) - Credits & documentation
│
├── Audio Systems (2 files, ~1,299 lines)
│   ├── audio-control.js (677 lines) - Audio engine
│   └── audio-gui.js (622 lines) - Audio UI
│
├── Network Systems (3 files, ~1,771 lines)
│   ├── network.js (599 lines) - WebRTC P2P
│   ├── network-state.js (629 lines) - State sync
│   └── network-input.js (543 lines) - Input packing
│
├── Advanced Systems (3 files, ~2,121 lines)
│   ├── battle-royale-system.js (707 lines) - 99-player BR
│   ├── system-checker.js (736 lines) - File validation
│   └── enhanced-menu.js (678 lines) - Boot sequence
│
└── Documentation (8 files, ~4,500+ lines)
    ├── README.md - This file
    ├── GAME_SYSTEMS_INTEGRATION.md (668 lines)
    ├── SHAPE_EDITOR_GUIDE.md (489 lines)
    ├── AUDIO_INTEGRATION_GUIDE.md (621 lines)
    ├── NETWORK_QUICK_REFERENCE.md
    ├── HOST_MIGRATION_SYSTEM.md (695 lines)
    ├── NETWORKED_INPUT_AUDIO_SYSTEM.md (1020 lines)
    ├── INTEGRATION_GUIDE.md (348 lines)
    └── CREDITS.md (95 lines)
```

**Total**: ~9,000+ lines of JavaScript, ~4,500+ lines of documentation

## 🛠️ Technology Stack

| Component | Technology |
|-----------|-----------|
| **Engine** | HTML5 Canvas + JavaScript |
| **Audio** | Web Audio API |
| **Networking** | WebRTC (P2P) |
| **Physics** | Custom 2D (pie slice collision) |
| **Input** | Keyboard, Mouse, Touch, Gamepad |
| **Storage** | localStorage |

## 📖 Documentation

### For Players
- [Shape Editor Guide](SHAPE_EDITOR_GUIDE.md)
- [Audio Integration](AUDIO_INTEGRATION_GUIDE.md)
- [Credits](CREDITS.md)

### For Developers
- [Game Systems Integration](GAME_SYSTEMS_INTEGRATION.md) - Complete API
- [Network Quick Reference](NETWORK_QUICK_REFERENCE.md)
- [Host Migration System](HOST_MIGRATION_SYSTEM.md)
- [Networked Audio](NETWORKED_INPUT_AUDIO_SYSTEM.md)

## 🎮 Controls

**Desktop**: WASD (move), Mouse (aim/fire), Space (charge), Shift (boost), E (shape editor)  
**Mobile**: Left joystick (move), Right side (tap-to-fire), Hold (auto-fire)  
**Debug**: CapsLock + Tab (debug overlay)

## 📊 Performance

| Metric | Target | Achieved |
|--------|--------|----------|
| FPS | 60 | ✅ 60 |
| Network | <10 KB/s | ✅ ~5 KB/s |
| Latency | <16ms | ✅ <10ms |

## 🙏 Credits

**Music**: TRNDSTR  
**Development**: NEO-VECTR Development Team  
**© 2026 NEO-VECTR™ INC**

---

<div align="center">

**Built with 💙 by NEO-VECTR™ INC**

</div>
