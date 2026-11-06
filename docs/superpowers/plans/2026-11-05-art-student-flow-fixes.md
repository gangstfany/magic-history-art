# Art student flow fixes

Goal: correct the user-approved student audit findings while retaining geography exploration, curriculum, media and visual tokens.

Architecture: a small learning-flow extension renders direct search/list/favorite results and restores list origins. It reuses canonical artwork IDs, existing filter/camera APIs and the single favorites controller. Native detail tabs move above the image; metadata stays expanded by default in a manually collapsible disclosure. Search normalization changes are confined to the existing filter function.

- [x] Add regression checks for exact numeric queries and Chinese artist aliases before implementation.
- [x] Implement direct results, global-search recovery, current-unit all-works and favorite views.
- [x] Move study tabs and favorite controls to the title area, preserve existing image/detail behavior.
- [x] Add current-list previous/next and source-card scroll restoration.
- [x] Retain exact old source freeze via an explicit runtime patch record; curriculum/media remain untouched.
- [x] Run repository checks and browser-test search, lists, favorites and mobile return.
- [x] Provide local preview; no push or other-course edits.

Approved follow-ups (November 6): match the APWH course header and compact toolbar; keep only Map and Favorites navigation; add Unit learning entry points and a locally remembered last artwork to the default right pane. The independent comparison prototype and homepage/account source remain outside this commit.
