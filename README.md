# The House

A first playable prototype of a close-friends storytelling world: four individual rooms, one shared lounge, and characters who move through them.

## Live prototype

This project is **plain static HTML, CSS, JavaScript, and SVG** (not Next.js). Vercel must be configured as **Other** with the repository root as the Root Directory. No build command or npm install is necessary; the site's entry point is `index.html`.

## Features in this prototype

- Click a personal room or the lounge to zoom in; use **Back** or Escape to return.
- Use **WASD / arrow keys** to walk an illustrated four-frame character around the selected room.
- Click bookcases, movie posters, and gallery photos to inspect sample content.
- Write a sample letter (stored **in your current browser only**).
- In the lounge, toggle Maya and Jay's participation to preview a changing shared space.

## Reality check

This is an early interactive proof of concept, **not** a finished product or the fully detailed building illustration in the design reference. No authentication, database, real-time presence, actual letter delivery, AI, free-roaming characters between rooms, collision detection, or production-quality sprite art is included. Friend/room content is fictional demo data.

## Run it locally

Open `index.html` through a local static server (rather than a `file://` URL, so linked SVG sprite files load consistently):

```bash
python3 -m http.server 3000
```

Then open http://localhost:3000.

## Deployment with Vercel

1. Import this repository from GitHub.
2. Framework Preset: **Other**.
3. Root Directory: **./** (repository root).
4. Build Command: **empty** / no override.
5. Output Directory: **./** (repository root).
6. Production Branch: **main**.
7. Deploy.

If the project was previously imported when `main` contained only a README, redeploy the latest `main` commit. The deployment must include `index.html`, `styles.css`, `app.js`, and the `sprites/` folder.

## Next steps

First verify the site renders and the room zoom works. Then upgrade the visual assets to the desired illustrated cutaway style; add directional animations, collision, and a better walking feel. Only after the single-player prototype is polished should cross-device shared-room features be added.
