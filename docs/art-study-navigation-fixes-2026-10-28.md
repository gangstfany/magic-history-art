# Study panel navigation fixes — 2026-10-28

- Artwork cards now transfer keyboard focus to the selected artwork title. The next Tab continues through artwork controls.
- Native redraws preserve focus on the same study card, region row or breadcrumb using stable keys. Removed controls fall back to the new context title; filtering keeps focus in the filter input.
- Returning after filters invalidate saved map views now fits the destination region or filtered Unit. Existing cached views preserve user pan and zoom.

Validation: 520 Node tests, 10 Python tests, strict data validation for 250 works, and public build (219 files) passed. Three new regression tests cover cached/missing-cache navigation and focus resolution. Independent review reported no new findings.

Browser checks in the full homepage: desktop keyboard activation and subsequent Tab, focus retention after resize, search input focus, France return after search/clear (transform matches the original region view), and mobile artwork detail/comparison tab/region return at 390px. No curriculum data changed.
