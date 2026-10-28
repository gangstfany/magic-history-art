# Review of uncommitted mobile map and reading changes

Scope: art repository uncommitted changes plus homepage art-specific height compatibility. Read-only product review; no fixes or push in this review.

## P2: Embedded frame height grows but cannot shrink

Location: assets/map-ui.css:51 with module-bridge.mjs:13.

The bridge measures documentElement/body scrollHeight, which is at least the expanded iframe viewport height. The mobile min-height:100vh reinforces that floor. After a long detail is opened, changing to a short Unit overview or returning to desktop keeps that historical maximum.

Browser reproduction: previously expanded art iframe height 2486px. Switch to Unit 1 in desktop layout; workspace content ends at about 573px but iframe/body remain 2486px. This leaves about 1900px unused below the course. Measure intrinsic course content independently of the viewport and test long-to-short transitions, including rotation to desktop.

## P2: Keyboard selection overrides mobile heading reveal

Location: art-history-map.html:17915-17917, interacting with the new reveal call at 17877.

Single-work keyboard activation calls selectArtwork (which focuses and reveals the heading), then unconditionally calls focusSiteMarker for restoreFocus. This restores map focus and scrolls away from the newly revealed content.

Browser reproduction: at 390px in the homepage, Unit 1 -> search AP 8 -> Europe -> activate Wiltshire single-work pin with Enter. The final active element is the SVG g labelled Wiltshire, UK / AP8, not the selected heading. Observed heading coordinate 507.78 inside frame and frame top -821: the heading is outside the host viewport. Preserve mobile title focus while retaining desktop map-pin focus.

## Validation and limits

497 art Node tests, 10 Python tests, strict 250-work data validation and 7 homepage protocol/boundary tests pass. The 250 authored records and comparison relationships are identical to HEAD. Passing tests do not cover the two regressions above. No additional definite content or protocol trust-boundary defects were identified in this review. A possible focus loss after iframe-triggered rerender remains unconfirmed and is not presented as a separate finding.

Publishing the natural-reading feature eventually requires both art and homepage compatibility changes. Neither repository was pushed during this review.

## Fix verification

Both reported regressions are now fixed locally. The art bridge measures the actual in-flow workspace bottom rather than the viewport-sized root scrollHeight, and observes the workspace/filter toolbar as well as the root. It can report both growth and shrinkage. Mobile single-work keyboard activation respects the heading-reveal result; desktop retains map-marker focus. A redraw caused by host height changes also preserves selected-heading and study-tab focus without scrolling again.

Observed failing regressions before implementation: reported height stayed at 2486 instead of shrinking to 650, and keyboard selection called marker focus after mobile reveal. Both tests now pass, including observing a workspace shrink while the root remains tall.

Real homepage verification at 320px: long AP230 detail expands the iframe to 2487px; selecting Unit 1 shrinks it to 743px. Enter on the AP8 single-work marker leaves the active element as H2#detailTitle, visible on screen even after resize delivery. Rotating to a 1280px desktop shrinks the embed to 650px and preserves the 500px scrolling side panel. Desktop Enter selection retains the SVG site-marker focus. All 250 authored records remain unchanged.

499 art Node tests, 10 Python tests, 250-work validation, and 7 homepage tests pass. The public art build still contains 215 files. These fixes remain local and have not been committed/pushed.
