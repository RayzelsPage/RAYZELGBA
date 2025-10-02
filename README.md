# RayzelsGBA — Deluxe v4.1

Everything from v4 + a **multi‑CDN loader** and a clear **self‑host fallback** so the emulator boots even on restrictive networks.

## Deploy
1. Upload `index.html`, `style.css`, `script.js`, `README.md` to your repo root.
2. Settings → **Pages** → Source: `main` (root).
3. Open your Pages link → Browse ROM → pick a legal `.gba`.

## If the emulator core fails to load
Some networks or extensions block CDNs. The page now tries multiple sources:
- `cdn.jsdelivr.net/npm/gbajs@latest/dist/gba.min.js`
- `unpkg.com/gbajs@latest/dist/gba.min.js`
- `cdn.jsdelivr.net/gh/endrift/gbajs/gba.min.js`

If those fail, download the file locally and place it next to `index.html` as `gba.min.js`, then make sure your `index.html` includes:
```html
<script src="./gba.min.js"></script>
```
(Deluxe v4.1 will try this local file automatically as a last resort.)

## Notes
- Default screen is **4×** (set 2×–8× in the top bar).
- Cheats: simple 16‑bit memory writes (not full GameShark parsing).
- Save states depend on the exposed core build.
