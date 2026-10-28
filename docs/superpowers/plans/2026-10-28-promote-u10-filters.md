# Promote approved Unit 10 filters

The user approved replacing the formal UI with the reviewed prototype. Promote the tested Unit10 scope, retain navigation among all ten Units, and publish the art repository after verification. Other Units retain their current filters pending separate category review.

- Promote the category catalog, counted-select synchronizer and UI to art-category-filters.mjs, with a release stylesheet.
- Pass selected AP-number membership through course state into the existing pure filterWorks function; do not alter artwork data or depend on a global runtime matcher.
- Notify the UI when native controls synchronize; reset category state when changing Unit or clearing filters. Show new controls only for Unit10 and preserve its Unit when clearing trial-style filters.
- Add release and native-filter regressions first; carry existing native-select rebuild tests over to the production helper.
- Verify Unit transitions, category/exact/search intersection, native AP230 synchronization, clear behavior, and comparison return on desktop/mobile. Build, test, commit, push and check deployment. Prototype archive remains excluded from the release.
