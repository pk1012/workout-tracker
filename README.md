# Workout Tracker PWA

A minimal, mobile-first workout tracker based on the requested design.

## Features
- Month view for quickly jumping to any date
- Day view showing exactly what was done
- Exercise view showing individual progression/history
- Log Workout flow: select muscle groups -> add exercises -> enter kg -> save
- Previous exercise weight is prefilled when available
- Local offline storage in the browser
- Installable as an iPhone Home Screen PWA
- Light theme by default

## Run locally
Because service workers require a secure origin, serve this folder with a local web server.

Example:
python3 -m http.server 8000

Then open http://localhost:8000

For iPhone installation, deploy the folder to any HTTPS static host (for example GitHub Pages, Cloudflare Pages, Netlify, Vercel, etc.), open it in Safari, then Share -> Add to Home Screen.

## Data
Workout data is stored locally in the browser via localStorage in this first prototype. Cloud sync/login can be added later.
