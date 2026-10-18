# The House — Social Rooms Prototype

An interactive, illustrated house for close friends.

## What's in this build

- Exact approved three-room house illustration
- Click a room to zoom in; Back or Escape to return
- Maya, Jay, and You have SVG sprite sheets (4 idle + 4 walking frames)
- Click characters to view simulated online/offline status
- Book, movie and vinyl collections with editable demo entries
- Visitor letters, latest life updates, and one daily photo per room
- Shared lounge arrival states, small character movement on room floor
- Responsive mobile and desktop interface

## Important demo limits

This is **not** connected multiplayer. Room content and photo uploads are stored locally in the browser via localStorage. Presence and lounge arrivals are simulated, not real-time. No server-side data, user accounts, or real letters to friends exist yet.

## Local preview

Use a static HTTP server from this repository root:

```sh
python3 -m http.server 3000
```

Open http://localhost:3000.

## Vercel

Framework: **Other**; Root Directory: repository root; no build command; Output Directory: `.`. `vercel.json` includes the static hosting configuration.

## Next art & product work

Refine walking depth/occlusion, original high-resolution artwork for room-closeup states, animated interactions for the books, movies, records, notes and TV; then design backend authentication, invited circles, content privacy and realtime presence.

Current assets are demo art, not production illustrated sprite quality.
