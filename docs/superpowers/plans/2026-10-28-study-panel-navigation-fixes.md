# Fix reviewed study-panel navigation

Approved fixes: desktop work-card activation must hand focus to artwork title; native redraw must retain stable focus in the study panel; breadcrumbs after filter-cache invalidation must fit the requested region (and Unit).

- [x] Add regression tests for cached/missing-cache return, filter preservation, and stable focus target/fallback resolution.
- [x] Add pre-render focus capture event to native renderer. Tag panel controls and headings with stable keys. Restore on observer update, prioritize explicit artwork/context navigation, and never steal focus from filter controls.
- [x] Use native group navigation when a region transform is missing; use native filtered fitting for Unit overview when its cache is missing.
- [x] Reproduce all three fixed paths in desktop browser, plus filter-focus preservation and mobile detail/comparison-tab/back. Run Node/Python/data/build checks and independent review. Commit/push art only and verify deployment.
