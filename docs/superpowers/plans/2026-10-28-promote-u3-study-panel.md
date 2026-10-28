# Promote approved U3 study panel

User approved the embedded U3 prototype. Release the same three states (Unit overview, region works, artwork detail) for Unit3 only; retain all other Units and the current formal Unit dropdown. Publish art repo after verification.

- [x] Add failing tests for deriving U3 overview/region/artwork/empty state, filtered/stale selections, and other Unit isolation. Add production release-file requirement.
- [x] Promote prototype module and stylesheet without banner, Unit lock, or startup selection. Expose existing native selection and region-navigation methods; retain native detail/comparison UI. Invalidate cached navigation on filter/Unit changes. Scope highlight handling to U3 and keep keyboard navigation/focus.
- [x] Check map-to-list, list-to-map, filtered counts, back path, comparison open/close, Unit transitions and mobile page flow in complete homepage. Run existing Node/Python/data/build checks and independent review.
- [x] Update documentation, commit and push art only; verify Pages deployment and actual published U3.
