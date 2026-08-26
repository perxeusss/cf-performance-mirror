# CF Performance Mirror

CF Performance Mirror is a browser extension that adds a compact performance dashboard to Codeforces profile pages. It helps users review solve times, failure patterns, rating movement, division-level breakdowns, and contest filters directly on the profile page.

## Features

- Review solve-time trends and failure rates by contest division
- Inspect topic and problem-level error patterns
- Filter results by time range, contest type, attempt count, and rating band
- Compare performance across Div 1, Div 2, Div 3, Div 4, and other contest categories
- Keep the dashboard lightweight and local to the browser

## Supported pages

The extension injects itself on Codeforces profile pages matching:

- https://codeforces.com/profile/*

## Installation

### Chrome

- [Install from Chrome Web Store](https://chromewebstore.google.com/detail/cf-performance-mirror/lpbkkcofbkmghobeeeipbdgohbckcdgj)

### Firefox

- [Install from Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/cf-performance-mirror/)

## How it works

The extension runs entirely in the browser on the Codeforces profile page. It reads public profile data through the official Codeforces APIs and computes the dashboard locally.

It uses public data from:

- user.status
- contest.list
- user.rating

No backend service is involved. The extension does not require login credentials or user authentication.

## Privacy

This extension is designed to process data locally in the browser.

- No user account or login is required
- No personal data is sent to a remote server
- No analytics, ads, or tracking scripts are included
- Only public Codeforces data is accessed
- Local UI preferences may be stored in browser storage for convenience

For the full policy, see [PRIVACY_POLICY.md](PRIVACY_POLICY.md).

## Permissions

The extension requests host access to Codeforces domains so it can:

- inject the dashboard into profile pages
- fetch public Codeforces API data required for calculations

## Project status

This is a focused client-side utility for competitive programmers and Codeforces users who want a quick, private performance summary without external services.

## Notes

- The extension is intentionally lightweight and purpose-built for Codeforces profile analysis.
- The source is self-contained and designed to be easy to inspect before installation.