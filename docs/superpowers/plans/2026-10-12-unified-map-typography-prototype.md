# Unified map typography prototype plan

**Goal:** Let Tiffany compare the approved shared typography on real World and Art History content without altering production.

**Architecture:** One wrapper loads `../index.html`. Preview-only style elements are injected into the wrapper's homepage iframe and its World/Art frames. Removing only those preview elements restores original styles. Scene buttons exercise existing navigation handlers/public APIs.

**Tech Stack:** Static HTML/CSS/JavaScript and Playwright.

- [x] Create `scripts/verify-unified-map-typography-prototype.mjs`; assert 19px/800 title, 13.5px/600 prose, 12.5px/700 pills and 12px/600 subtitles, original restoration, selected-work preservation, mobile no-overflow and no browser errors. Run before preview exists: fail because page is absent.
- [x] Create `prototypes/unified-map-typography.html`, initially unified and displaying a real Seated scribe detail. Put tokens in a shared runtime stylesheet, with selectors for the homepage mirror and both map documents. Use `doc.getElementById('prototype-typography')?.remove()` to restore originals; never rewrite content or source styles.
- [x] Bind scene/mode native buttons with pressed states and visible focus. Install overrides on nested frame load/reload. Wait for homepage API/toolbar readiness before scene navigation; show a retry action if setup fails.
- [x] Run verifier at 1440px and 390px, inspect screenshots, compare production-file hashes before/after, and open stable localhost preview. Do not commit or push.
