# Art automatic focus preview

Goal: Preview scope-aware Art camera framing without modifying production HTML.

Architecture: Use the existing ArtHistoryMap public API from the preview wrapper. Compute a padded geographic bounding box from filtered works or the selected artwork. Apply only on navigation/filter events; manual zoom, drag and 1:1 remain authoritative. Original mode restores the saved camera. Keep shared canvas height and typography.

Files: prototypes/unified-map-typography.html; scripts/verify-unified-map-typography-prototype.mjs.

- [x] Add failing browser assertions: initial selected work is focused; 1:1 remains at scale 1; U1/U2/U6 geographic anchors remain visible; empty results remain finite. Retain original-mode typography restoration checks.
- [x] Install preview-only capture listeners, scheduling after existing handlers with a short search debounce. Cap scale at 3, keep no-result camera unchanged, and use the existing clampTransform/render/applyTransform methods.
- [x] Run typography/height/focus browser checks on desktop and phone, inspect screenshots, and confirm unchanged production hashes. Do not commit or push.
