# Unit 10 category filter preview

Preview: http://127.0.0.1:8034/prototypes/art-filter-trial.html?embed=1

This step implements the user-approved single-Unit trial only. The formal course was not switched to category filtering. The prototype clones the latest built course with base URLs pointing to its public assets and retains the existing map, detail views and comparison workspace.

Six explicit browsing categories cover all 27 Unit 10 works: painting/drawing (7), sculpture/three-dimensional works (5), architecture/memorial space (3), photography (3), installation/video/performance (9), and books/text works (1). AP229 belongs to both books and installation; the interface explains overlapping memberships. These are browsing memberships, not replacements for the original authored workType.

The exact-type select is restricted by category and preserves the original type strings. Option counts honor active search, tradition/theme and period while excluding the category/type being reconsidered. Zero-count options remain visible so changing a search does not silently discard selection. Current result count is shown separately. Category/type chips remove individual constraints; both clear controls reset to all 27 trial works.

Browser checks: painting gives seven matching works and seven exact types. Triptych painting plus AP250 produces zero results without losing selected conditions; the empty-state clear control restores 27. Books includes AP229. Sculpture -> AP230 -> comparison with AP250 -> return retains the sculpture category and five-work result count. At 390px controls fit without horizontal overflow and the search field fills the row. No page console errors observed.

Three new helper tests cover membership, overlap counts and exact-type context including empty results. The full art suite passes 502 tests, and the public release build remains 215 files, excluding the prototype. Screenshots: output/art-u10-filter-trial-2026-10-27/desktop.png and mobile.png. No commit or push.
