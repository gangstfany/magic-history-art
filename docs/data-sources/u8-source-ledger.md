# Unit 8 integration and public release ledger

Reviewed 2026-10-14. AP192–212 contributes 21 works to the existing 191-record map, for a live total of 212 works / Units 1–8. This is artwork coverage, not a claim of complete public-image coverage.

## Reviewed inputs

- [Official ordered views](u8-official-views.md) and `data/ap-art-history-unit-8-manifest.json`: 50 separately accounted component slots. The CED headings nominally total 49; AP199 includes four photographs and two separately captioned plans. AP192's combined plan/elevation stays one slot.
- [Bilingual content evidence](u8-content-sources.md), `data/ap-art-history-unit-8-content.json`, and [independent English study edition](../content/ap-art-history-unit-8-english.md).
- [Exact-view image and licensing evidence](u8-media-sources.md), the ordered media/rights/placeholder-authority JSONs, and 38 repository-local WebP assets.

Content and media each received independent specification review followed by quality review. Component-source page anchors were repaired during review. All inherited AP1–191 parsed records and image credits are protected by the pre-U8 SHA256 fixture; U8's complete record/credit projection is independently frozen in `tests/fixtures/u8-canonical.json`.

## Actual public coverage

50 views = 38 verified local open assets + 12 source-linked null placeholders. Every retained asset corresponds to the specified work/component; no generic related work, AI reconstruction, private-media bundle, CED extraction or public hotlink was added.

Unresolved slots: AP192 path and combined plan/elevation; AP195 cliff overview; AP199 both plans; AP200 lion/figure and plan; AP206 illusionistic retirement-room interior; AP207 plan; AP209 reflection-pool exterior and Mumtaz cenotaph interior; AP212 anonymous circa-1969 lithograph. A photographer's license for another object or a modern protected underlying work is not treated as permission for the required object. “Not verified” is not an assertion that a work is necessarily copyrighted.

Placeholder credit URLs link to official identity references, explicitly not license grants. Open assets retain named creators/institutions, canonical licenses, image-specific sources and derivative notes. The two AP210 assets retain each complete two-fold screen; the separate AP203 opening view is not substituted with the burning-palace portion.

## UI and geography preservation

Five English tradition pills and six English region labels reuse the existing controls. All 21 reviewed site anchors are registered directly in the full-world lookup; uncertain portable-work production contexts remain qualified, not relocated to current museums or depicted story locations. The shared style block is byte-identical to pushed commit `f4e64e6` (inner-style SHA256 `2cd91220f2aa89927fc8432555074af78d8486e2103f7e20b62049412c09ac43`). No World History implementation, typography, map height or camera behavior was changed for U8.

## Verification checkpoint

Post-checkpoint geography correction: an additional independent polygon audit found the initial inherited-example calibration inaccurate for U8. Only the 21 U8 coordinates and direct lookup entries were corrected to the actual SVG projection; their canonical fixture and the not-yet-used pre-U9 baseline were regenerated transparently. The original AP1–191 hash baseline and all content, views, credits, provenance qualifiers, CSS and camera behavior remain unchanged. See [coordinate evidence and qualification](u8-content-sources.md#geography-and-record-contract). A new geographic regression failed against the old anchors and passed after correction (8/8 U8 tests). The post-repair stage rerun passed 976 tests (`/tmp/u8-geography-stage-tests.log`); focused browser traversal passed all four cases (`/tmp/u8-geography-browser.log`). An independent polygon audit approved all 21 corrected anchors; the earlier 974/49 results below predate this coordinate-only repair.

Fresh U8 content/media/canonical/preservation tests: 7 passed, 0 failed. Strict native validator: 212 AP Art History works accepted. Temporary full native credit/rights validation accepted all inherited and new records. Focused browser traversal passed standalone and homepage-embedded modes at 1440px and 390px: all 21 works, all 50 views, all 38 local images decoded; study tabs, comparison navigation, image-dialog focus, filters/reset, manual pan/zoom, subject round-trip, overflow and injected-image-failure fallback were checked.

Final U8 checkpoint: full regression suite passed 974/974 (`/tmp/u8-full-tests-3.log`); complete legacy Art browser matrix passed with `ok:true` (`/tmp/u8-full-browser-2.log`); production shared-map UI passed all four viewport cases (`/tmp/u8-production-ui.log`); World/Home regression passed all 16 cases (`/tmp/u8-world-home.log`); public/private-media leak check passed (`/tmp/u8-private-leaks.log`). A verifier-only synchronization repair waits for the actual iframe resize before measuring its no-overflow invariant; the reproduced 640×520, 641×521 and 390×844 cases passed, with exact host and 500px/300px canvas assertions retained. Desktop and mobile screenshots were inspected. Final integration received independent specification and quality approvals. U9 preparation follows this completed U8 stage; no push, merge or Desktop copy is included.
