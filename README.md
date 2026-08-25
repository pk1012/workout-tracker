# Workout Tracker — structured complete app

This is the complete Workout Tracker app reorganized into a maintainable multi-file structure.

## Structure

- `index.html` — app markup and navigation
- `css/styles.css` — global/theme styles
- `css/components.css` — components and UI
- `css/responsive.css` — responsive/mobile layout
- `js/app.js` — startup, navigation, modal helpers
- `js/data.js` — state and default exercise data
- `js/workouts.js` — calendar and workout logging/history
- `js/exercises.js` — exercise/muscle-group library management
- `js/progress.js` — progress calculations/UI
- `js/settings.js` — theme, backup, clear data, About
- `manifest.webmanifest` — PWA manifest
- `sw.js` — service worker
- `assets/icons/` — app icons

Version 1.3.0
Build 2026.08.26

## Fixes in 1.3.0

- Local-time-safe workout date keys to prevent timezone date shifts.
- Correct PWA icon paths and expanded service-worker asset caching.
- Service worker registration on app startup.
- Real JSON backup export and restore/import with validation.
- Workout logging preserves selected date and muscle groups when going back from exercise selection.
- Existing exercise add/edit/delete and alphabetical exercise ordering retained.
