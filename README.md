# The House — room zoom MVP

This is the barebones zoom prototype built around **the exact approved house composition**. No sprites, character animation, multiplayer or unrelated room art is used here.

## What works
- One original illustrated house on a white background.
- Three selectable rooms (Maya's reading room, Jay's creative room, the shared lounge).
- Smooth SVG camera zoom to the same image, with clickable polygons staying aligned.
- Two object hotspots per room, with short demo story cards.
- Return to whole-house view, Escape key, responsive layout, reduced-motion support.

## Deploy
Static app: Vercel Framework Preset **Other**, Root Directory **./**, Output Directory **./**, no custom build command. `index.html` is the entry point.

Run locally: `python3 -m http.server 3000` and open http://localhost:3000.

## Next visual iteration
Approve the zoom/camera framing first. Then make aligned high-resolution room layers, transparent object assets, and original sprite characters separately. Do not animate characters baked into the scene.
