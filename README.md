# RayzelsGBA — Deluxe v4

**Deluxe look + fixed boot + big screen.** Beautiful glass UI, rounded transparent controls, pause overlay, FPS meter, recent ROMs, cheats, haptics—now with **robust multi‑API boot logic** so ROMs actually run across different CDN builds of `gba.js`. Default **4×** screen with a scale selector up to **8×**.

## Quick start
- Open `index.html` locally, or
- Serve locally:
  ```bash
  python -m http.server 8000
  ```
- Click **Browse ROM**, pick a **legal** `.gba`, and play.

## GitHub Pages
1. Create a repo (e.g., `rayzelsgba-deluxe-v4`).
2. Upload `index.html`, `style.css`, `script.js`, `README.md`.
3. Settings → **Pages** → Source: `main` (root).  
4. Open your Pages URL. Done.

## Notes
- The emulator `<script>` uses a fallback: primary `jsDelivr (gh)` then `npm` if needed.
- Cheats write 16‑bit values to addresses (simple mode). Not a GameShark parser.
- Save state availability depends on the loaded core build.

## Legal
Emulators are legal; distributing/downloading copyrighted ROMs you don’t own isn’t. Please use only lawful ROMs.
