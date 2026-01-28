<div align="center">
  <img src="public/assets/app-icon-new.png" alt="PLAY-ON! Logo" width="160" />
  
  # 🚀 PLAY-ON!
  
  ### **The High-Performance Unified Hub for Anime & Manga**
  
  *A precision-engineered desktop application to track, watch, read, and manage your entire entertainment library.*
  
  <p align="center">
    <a href="https://tauri.app"><img src="https://img.shields.io/badge/Built_with-Tauri_2.0-24C8D8?style=for-the-badge&logo=tauri&logoColor=white" alt="Tauri" /></a>
    <a href="https://react.dev"><img src="https://img.shields.io/badge/Frontend-React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" /></a>
    <a href="https://www.rust-lang.org"><img src="https://img.shields.io/badge/Backend-Rust-DEA584?style=for-the-badge&logo=rust&logoColor=white" alt="Rust" /></a>
    <a href="https://github.com/yourusername/play-on/stargazers"><img src="https://img.shields.io/github/stars/yourusername/play-on?style=for-the-badge&color=gold" alt="Stars" /></a>
  </p>

  <br />

  [**Explore Features**](#-key-capabilities) • [**Quick Start**](#-getting-started) • [**Tech Stack**](#-technical-foundation) • [**Discord**](#-social--sync)

  <br />

  <img src="public/assets/home.png" alt="PLAY-ON! Hero Mockup" width="100%" style="border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);" />
</div>

---

## 🏗️ Architecture & Philosophy

**PLAY-ON!** isn't just another tracker. It's a **technical blueprint** for how desktop media applications should feel. Built with the **Tauri 2.0** framework and **React 19**, it combines the memory efficiency of Rust with the dynamic versatility of modern web components.

Whether you're managing a 10TB local anime collection or keeping up with the latest manga releases, PLAY-ON! provides a unified, glassmorphic interface that synchronizes your progress across **AniList** and **Discord** in real-time.

---

## ✨ Key Capabilities

### 📺 Predictive Anime Tracking
- **Zero-Config Sync**: Automatically detects and maps playback from **VLC**, **MPV**, and **MPC-HC** with zero manual input.
- **Dynamic Meta-Mapping**: Intelligent title-resolution engine bridges the gap between local filenames and AniList entries.
- **Persistent Presence**: Background tracking with **Discord Rich Presence** support for showing off your current watch.

### 📖 The Infinite Manga Reader
- **Global Sources**: Integrated with **WeebCentral** and extensive community extensions for a limitless library.
- **Precision Reading**: Toggle between fluid **Webtoon vertical scroll** and high-fidelity **single-page** modes.
- **Local Collections**: Native support for local manga directories with automatic chapter and volume sorting.

### 🛠️ Neural Library Archive
- **Deep Metadata Engine**: Scans your hardware to build a stunning, metadata-rich encyclopedia of your local media.
- **Unified Control Plane**: Manage anime and manga in a single, high-performance interface with advanced filtering.
- **Data Insights**: Professional statistics and tracking trends visualized through the **MagicBento** dashboard.

### 🎨 High-Fidelity Technical UI
- **Glassmorphic Depth**: Multi-layered blurred surfaces and tonal hierarchies for a premium desktop feel.
- **8px Baseline Precision**: Every element is perfectly aligned to a strict technical grid for visual harmony.
- **GSAP & Motion**: Ultra-smooth transitions and micro-interactions powered by industry-leading animation engines.

---

## 🛠️ Technical Foundation

| Layer | Technologies |
| :--- | :--- |
| **Core Engine** | Rust, Tauri 2.0, Tokio |
| **Frontend Architecture** | React 19, Vite, TypeScript |
| **Data Orchestration** | Apollo Client, GraphQL (AniList API), RxJS |
| **Styling & UI** | Tailwind CSS 4, CSS Modules, HCT Tonal Hierarchy |
| **Motion** | GSAP, Framer Motion, OGL |
| **Plugins** | Deep Link Core, Autostart, RPC, Notification |

---

## 🚀 Getting Started

### 📋 Prerequisites
- **Node.js** (v18+)
- **Rust** (Latest Stable)
- **Tauri Ecosystem**: [Setup Guide](https://v2.tauri.app/start/prerequisites/)

### 🔧 Installation

1. **Clone the Project**
   ```bash
   git clone https://github.com/yourusername/play-on.git
   cd play-on
   ```

2. **Configure Environment**
   Create a `.env` in the root:
   ```env
   VITE_ANILIST_CLIENT_ID=your_id
   VITE_ANILIST_CLIENT_SECRET=your_secret
   VITE_MAL_CLIENT_ID=your_app_key
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Launch Development**
   ```bash
   npm run tauri dev
   ```

---

## 🔗 Social & Sync

- **AniList & MyAnimeList**: Full OAuth2 integration for real-time list updates.
- **Discord RPC**: Show off your current episode or chapter with rich metadata and cover art.
- **Deep Linking**: Open specific series or lists directly via `playon://` protocol.

---

<div align="center">
  <p>Created by <strong>MemestaVedas</strong></p>
  <p>Built for Otakus by an Otaku</p>
</div>
