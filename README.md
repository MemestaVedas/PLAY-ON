<div align="center">
  <img src="public/assets/app-icon-new.png" alt="PLAY-ON! Logo" width="128" />
  <h1>PLAY-ON!</h1>
  <p><strong>The Ultimate Desktop Companion for Anime & Manga</strong></p>
  <p>Seamlessly track local anime playback, sync with AniList, and read manga—all in one beautiful app.</p>

  <p>
    <a href="https://tauri.app">
      <img src="https://img.shields.io/badge/Built_with-Tauri_2.0-blue?style=flat-square&logo=tauri" alt="Tauri" />
    </a>
    <a href="https://react.dev">
      <img src="https://img.shields.io/badge/Frontend-React_19-cyan?style=flat-square&logo=react" alt="React" />
    </a>
    <a href="https://www.rust-lang.org">
      <img src="https://img.shields.io/badge/Backend-Rust-orange?style=flat-square&logo=rust" alt="Rust" />
    </a>
  </p>
</div>

---

## Overview

**PLAY-ON!** is a modern desktop application designed to bridge the gap between your local media library and your online anime tracking. By detecting what you're watching in players like **VLC** or **MPV**, it automatically updates your **AniList** progress, keeping your watch history perfectly in sync without manual input.

With **v0.2.0**, PLAY-ON! expands into a full-featured entertainment hub with the addition of a built-in **Manga Reader** and a comprehensive **Settings** system.

## Key Features

### 🎬 Automatic Anime Tracking
- **Smart Detection**: automatically recognizes anime titles and episode numbers from your media player's window title.
- **Background Sync**: Updates your AniList status to "Watching" and increments episode counts as you finish them.
- **Supported Players**: Optimized for VLC Media Player, MPV, and MPC-HC.

### 📖 Integrated Manga Reader
- **WeebCentral Extension**: Browse, search, and read manga directly within the app.
- **Webtoon & Page Modes**: Read in continuous vertical scroll or classic single-page view.
- **Library Management**: Search for new series, view chapter lists, and track your reading progress.

### 🎮 Discord Rich Presence
- **Live Status**: Show your friends exactly what you're watching or reading in real-time.
- **Rich Metadata**: Displays cover art, episode/chapter numbers, and "View on AniList" buttons on your Discord profile.

### 🎨 Modern Experience
- **Local Library**: Organize your local anime folders (D:/Anime, etc.) in a sleek sidebar interface.
- **Glassmorphic UI**: A beautiful, responsive interface with smooth animations and dark mode support.
- **Floating Mini-Player**: A persistent pill-shaped indicator shows you active tracking status while you multitask.

## Quick Start

### Prerequisites
- **Node.js** (v18+)
- **Rust** (Latest Stable)
- **Tauri Dependencies**: [Setup Guide](https://v2.tauri.app/start/prerequisites/) (e.g., C++ Build Tools on Windows)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/play-on.git
    cd play-on
    ```

2.  **Configure Environment**
    Create a `.env` file in the root directory:
    ```bash
    VITE_ANILIST_CLIENT_ID=your_client_id
    VITE_ANILIST_CLIENT_SECRET=your_client_secret
    ```

3.  **Install & Run**
    ```bash
    npm install
    npm run tauri dev
    ```

### macOS Setup

For **automatic anime tracking** to work on macOS (detecting what's playing in VLC, MPV, or browser-based players), you need to grant **Screen Recording** permission:

1. Open **System Settings** → **Privacy & Security** → **Screen Recording**
2. Click the **+** button and add **PLAY-ON!** to the list
3. Restart the app for changes to take effect

> ⚠️ Without this permission, the app cannot read window titles from other applications, and anime detection will not function.

## Technology Stack

- **Frontend**: React 19, Vite, Apollo Client (GraphQL), TailwindCSS v4
- **Backend**: Rust, Tauri 2.0 (Plugin System)
- **State**: Context API, Apollo Cache Persistence

---

<div align="center">
  <p>Built with ❤️ for the anime community.</p>
</div>
