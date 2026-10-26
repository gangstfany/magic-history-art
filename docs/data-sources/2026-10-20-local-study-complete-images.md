# Complete local study image preview

The developer explicitly requested completing all image views before considering GitHub publication. This local preview fills the74previously missing views and replaces7failed remote images. It does not change the public HTML, public rights records or public image URLs on disk.

## Open and restart

Homepage: http://127.0.0.1:4174/index.html

Standalone art map: http://127.0.0.1:4174/art-history-map.html

Run from this checkout: `python3 scripts/serve_art_history_study.py`. The server uses only the Python standard library and binds127.0.0.1. It reads the ignored `.private-media/complete/manifest.json` and optional `remote-fallbacks/manifest.json`, validates exact keys and local assets, then replaces only the two JSON data blocks in the HTTP response. The same homepage can switch between World History and Art History. No `privateMedia` query parameter is needed on4174.

Keep the `.private-media/` directory on this computer. Git ignores it. Nothing in this task authorizes pushing these assets, uploading them to another host or treating them as openly licensed.

## Coverage and source

250existing work records and381existing logical view slots, with no null image URLs in the study response.74restored views: U4=8, U5=9, U6=11, U7=1, U8=3, U9=11, U10=31.

17previously installed U4/U5 images were visually audited and reused; all57remaining views were extracted from the developer's supplied CED PDF at original embedded dimensions using lossless WebP. Every new extraction was visually checked for exact work/component and full frame. Per-view source page/image/photographer evidence is in the ignored manifests. Six legacy alternative-text descriptions were corrected in the local response only, to match the actual pictures.

The206existing remote view URLs were tested in Chrome:199decoded,7failed (timeouts or non-image responses). All7failures have exact CED local fallback images. AP45 is expressly labeled as the CED reconstruction drawing rather than a modern aerial photograph; AP93gardens is a different official photographic viewpoint. No AI reconstruction, replacement artwork or misleading open-license claim was used.

## Verification

- Server unit tests cover complete coverage, unknown/duplicate identity rejection, safe local paths, missing files, explicit remote failures and legacy single-image/non-ID schemas. Each new behavior was first observed failing, then passing.
- Python regression tests:21passed. Public structural validator still accepts250works. Public page data remains the earlier approved supplementation batch; the local study server does not write it.
- The74restored views passed rendered-image decode, full-frame contain, view switch, enlarge and focus restoration in desktop/mobile standalone and homepage-embedded contexts.
- After adding7remote fallbacks, all81passed those standalone desktop/mobile checks; the long embedded sequence completed image interactions but exposed the pre-existing intermittent marker packing error (`Unable to place Aix-en-Provence, France without a marker collision`). This is not an image-missing condition and is not claimed fixed. The verifier leaves this failure visible. The earlier74-view embedded runs both passed. Do not claim the entire map regression is clean based on image checks alone.

No push, merge or Desktop synchronization was performed.
