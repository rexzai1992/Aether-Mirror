# Aether Mirror

A web-based interactive avatar mirror that maps camera pose and hand tracking to a 3D character in real time.

## Features

- Real-time body/hand tracking for avatar retargeting
- Three.js scene rendering
- Support for local avatars and Cloudflare R2-hosted avatars
- Ready for Cloudflare Pages deployment

## Project Structure

- `index.html`: App shell and runtime config
- `main.js`: Tracking, retargeting, and avatar runtime logic
- `style.css`: UI styling
- `thumbnails/`: Avatar preview assets
- `tools/`: Utility scripts

## Run Locally

Because this is a browser app that needs camera access, run from a local web server (not `file://`).

Examples:

```bash
python3 -m http.server 8080
# or
npx serve .
```

Then open `http://localhost:8080` (or the port from your chosen server).

## Deploy (Cloudflare Pages)

```bash
npx wrangler pages deploy . --project-name mecha-mirror
```

## Notes

- Large `.glb` files should be hosted in R2 when they exceed Pages upload limits.
- Runtime avatar URL configuration is defined in `index.html`.
