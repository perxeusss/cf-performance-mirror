# CF Performance Mirror
Analyse your Codeforces profile — solve times, WA% by topic and problem, division breakdown, and time-range filters.

## Install from Chrome Web Store

- [Install CF Performance Mirror (Chrome)](https://chromewebstore.google.com/detail/cf-performance-mirror/lpbkkcofbkmghobeeeipbdgohbckcdgj)

## Install from Firefox Add-ons

- [Install CF Performance Mirror (Firefox)](https://addons.mozilla.org/en-US/firefox/addon/cf-performance-mirror/)

## Overview
Analyze overall performance, solve time, failure rates, rating changes, and errors by division and time range. Track your Codeforces performance with clear insights into solve times, failure rates, rating changes, and problem-level errors, broken down by division and time range. Filter by contest type and focus on selected topics or rating ranges to quickly spot weak areas and improve efficiently, all directly on your profile page.

## How it works
Runs entirely client-side on `codeforces.com/profile/<handle>`. Fetches from three public Codeforces APIs (`user.status`, `contest.list`, `user.rating`). No server, no tracking — all computation happens in your browser.

## Where it appears
- Injected into Codeforces profile pages (URLs matching `https://codeforces.com/profile/*` and subdomains).
- The panel appears as a compact card near existing profile boxes / page content.

## Privacy & security 🛡️
- No login required, no tracking, no backend — nothing is uploaded to any server.
- Uses only public Codeforces APIs from your browser (reads public profile/submission data).
- Requires host permission for Codeforces domains to fetch data directly.
- Inspect the source before installing if you want to verify behavior — the codebase is small and self-contained.

## Motivation / Philosophy
- Built for competitive programmers who want a private, quick snapshot of where they struggle and how long they take on problems.
- Lightweight, focused on actionable insights rather than dashboards — no tracking, no servers.

— Friendly to the CP community.
## Refactored architecture

The extension is being migrated from the original single-file DOM implementation to React + TypeScript while keeping the original behavior as the reference implementation.

- `src/domain/` contains Codeforces classification, timeline, performance, table, and friction logic.
- `src/services/` contains Codeforces API and local-storage access.
- `src/components/` contains the React UI.
- `src/hooks/` contains React state/effects such as performance data and live theme detection.
- `src/content/` contains the small browser-extension integration layer that mounts the React app into an isolated Shadow DOM.
- `legacy/content.js` is retained only as the behavior/rollback reference until browser regression testing is complete.

## Development

```bash
npm install
npm run typecheck
npm run build
```

The production bundle is emitted to `dist/content.js`. Do not switch the store-facing manifest to that bundle until the built extension has been loaded unpacked in Chrome and checked against real Codeforces profile pages.


### Build

`npm run build` creates a loadable Chrome extension package in `dist/` containing the generated React content script, manifest, and icons.
