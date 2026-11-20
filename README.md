# MVRT Website Generator (`mvrt.com` — FRC Team 115)

A direct on-screen visual website editor and static site generator for **Monta Vista Robotics Team (FRC Team 115)**, built so future student webmasters can maintain `mvrt.com` without editing raw HTML across 9 separate files.

## Features

- **Only 2 Modes (`Editor` | `Preview`)**:
  - **Editor Mode**: Click any text directly on the page to edit it inline, change font size (`-` / `px` / `+`), toggle bold/italic, change text color, or update links. Click any image or PDF on the page to pick a replacement directly from your local `assets/` folder.
  - **Preview Mode**: View the clean, final 9-page `mvrt.com` site (`Home`, `About` with 7 tabs & 28-year timeline, `Outreach`, `Calendar` with embedded Google Calendar, `Resources` across 6 divisions, `Contact`, `Sponsors`, `Newsletters`, `Join`).
- **Local `assets/` Folder Selection**: Click **Select Assets Folder** in the top bar to load your local `assets/` directory.
- **1-Click `.ZIP` Export**: Click **Export .ZIP** to download a ready-to-deploy `mvrt-website.zip` containing all 9 generated HTML files (`index.html`, `about.html`, `outreach.html`, `calendar.html`, `resources.html`, `contact.html`, `sponsors.html`, `newsletters.html`, `join.html`), `assets/css/style.css`, `site-data/mvrt-site.json`, and any local assets you added.
- **Push to Dated GitHub Branch**: Click **Push to GitHub** to commit and push all generated website files directly to a dated branch (e.g., `update-2026-11-19`).

## Quick Start

```bash
# Start the visual editor in the browser
npm run dev

# Or generate the static HTML files via CLI into ./generated-site/
npm run generate-site

# Run as an Electron desktop app (if electron is installed)
npm run electron:dev
```
