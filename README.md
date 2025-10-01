# GBA Emulator (Web)
> Legal use only: load your own homebrew or open-source ROMs. Do **not** use copyrighted ROMs you don't own.

## Features
- Drag & drop `.gba` ROM
- Keyboard controls (↑ ↓ ← →, Z/X = A/B, A/S = L/R, Enter = Start, Right Shift = Select)
- Touch controls (on-screen D-pad + A/B/L/R/Start/Select)
- Save/Load state (in-memory during session)
- Simple cheat manager (enable/disable; writes 16-bit values to addresses)

## How to run locally
Just open `index.html` in a browser that allows cross-origin module loads from a CDN. If your browser blocks it, use a static server:
```bash
# Python 3
python -m http.server 8080
# then visit http://localhost:8080
```

## Deploy on GitHub Pages
1. Create a new repo (e.g., `gba-emulator`).
2. Upload `index.html`, `style.css`, and `script.js`.
3. In repo settings, enable **Pages** → Source: `main`/`/root`. Your site will be live at the provided URL.

## Cheats format
This UI writes a 16-bit value to a memory address each frame when enabled. It's not a full GameShark parser. Example:
- Address: `03007E0C`
- Value: `0001`

## Notes
- Emulator script is pulled from: `https://cdn.jsdelivr.net/gh/endrift/gbajs/gba.min.js`
- If the CDN is unavailable, download that file and serve locally, then replace the `<script src=...>` with your local path.
- Save states are in-memory only; extend `saveState()` to persist to `localStorage` if desired.
