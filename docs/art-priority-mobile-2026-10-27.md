# Narrow-screen map navigation remediation

Reproduced at 280px: switching from Unit 10 to Unit 4 throws a region-capsule layout error, leaving stale Unit 10 pins and artwork count under a changed filter. After fixing this level, entering France reproduced a site-level placement failure for Paris.

Root cause: only Units 9/10 and the all-unit overview passed the actual visible canvas bounds (including map letterboxing) to dense navigation. Compact site navigation also ignored those bounds. All Units and compact site fallbacks now use the available canvas, retaining geographic anchors, leader lines, full region names, 44px hit targets, and the zoom-control gutter.

Compact multi-work locations show a short piece count instead of an overflowing list of AP numbers. Full location and AP identities remain in accessible names and tooltips, and the expanded list preserves every artwork title and number.

The regression executes the actual layout invocation extracted from render, covering all ten Units at 280/320/390px and every region drill-down. It checks mappable artwork coverage, top-level marker overlap, and compact multi-work labels. Failures were reproduced before implementing each fix.

Verification: 496 Node tests, 10 Python tests, 250-work source validation, and a 215-file release build pass. All 250 authored artwork records are unchanged from HEAD. Browser verification at 280px completed Unit 4 -> France -> Paris -> AP101 The Swing. Screenshots are in output/art-priority-mobile-2026-10-27. Earlier console failures remain in tab history and are distinguished by timestamps.

The previous 92ead68 Pages deployment succeeded. These changes remain local, without commit/push. Subsequent priorities: mobile artwork-detail reading and filter classification; 147 generic comparison directions remain a separate content-improvement item.
