# Mobile artwork reading

User explicitly chose natural document reading over the fixed scrolling artwork card. On screens at or below 664px the detail panel now grows with its content, and the workspace allocates an automatic second row below the 300px map. Embedded mobile documents retain natural page height even on tall screens. Desktop retains its 500px map and independently scrolling side panel.

Mobile artwork selection focuses and reveals the selected heading. Desktop keyboard focus remains on the expanded artwork pin; legacy unlocated-work selection also reveals the mobile title. Tab and previous/next controls meet the 44px touch target. Artwork image dimensions, complete-image rendering, view controls, credits, teaching content, and comparison relationships remain unchanged. The stylesheet URL was versioned to prevent stale cached mobile styles.

Integration finding: a 320px mobile detail document can exceed the homepage's previous 2200px iframe cap. A small compatibility change in the separate homepage repository passes the trusted module identity into safeHeight: art is bounded at 10000px, matching the existing art bridge maximum; other modules and the default remain bounded at 2200px. No course content was moved into the shell. Both repositories must eventually be published for full homepage natural reading. Neither was committed or pushed in this step.

Verification: 497 art Node tests, 10 Python tests, 250-work validation, and the 215-file build pass. Homepage has 7 passing protocol and boundary tests and builds against its unchanged pinned login release. Regression tests were observed failing before implementing mobile reveal and art-specific height bounds.

Real-browser checks: AP230, AP199 with six views, and AP245 long context at 320/390px. Complete homepage shows a 2486px art iframe, an expanded detail panel with overflow visible, and zero inner-window scroll while parent-page scrolling carries the reading. Keyboard tabs, image dialog, comparison modal, closing and focus restoration work. Desktop at 1280px retains 500px side-panel height and overflow auto. The browser automation locator's pointer click occasionally fails in a long iframe; keyboard activation and normal page scrolling were separately verified.

All 250 authored artwork records are unchanged from HEAD. Screenshots: output/art-mobile-reading-2026-10-27.
