# Unit 9 integration and public release ledger

Checkpoint 2026-10-14. AP213–223 adds 11 works to the reviewed 212-record baseline, producing 223 works / Units 1–9. Artwork coverage is separate from public-image coverage.

## Reviewed inputs and actual coverage

The official manifest and [ordered view ledger](u9-official-views.md) preserve 15 component slots across 11 works. [Content evidence](u9-content-sources.md) accompanies complete bilingual records and [11 full English study sections](../content/ap-art-history-unit-9-english.md), including per-work media credits. Content and media independently received specification and quality approvals.

The [media evidence ledger](u9-media-sources.md) records **2 verified local open images and 13 source-linked null views**. AP214 retains the daylight Ahu Nau Nau moai/pukao/ahu photograph under CC BY-SA 3.0; AP218 retains the exact Met turtle-shell mask accession 1978.412.1510 under CC0. All other component slots remain honest rights/identity/stewardship-unverified placeholders with official reference links, not substitute objects or assertions of legal prohibition. AP220's public-domain candidate is conservatively withheld pending documented descendant-consultation guidance. No private bundle, textbook/CED extraction, AI reconstruction or new public hotlink was introduced.

## Geography and UI preservation

Ten English Pacific region labels and five tradition groups reuse native controls. Original, broadly qualified creation or documented presentation contexts are retained, rather than current museum holdings. Direct site anchors use the existing equirectangular SVG projection, with frozen provenance qualifications unchanged.

All AP1–212 parsed artwork and credit records are protected by `tests/fixtures/u1-u8-pre-u9-hashes.json`, captured after the independently audited U8 coordinate repair. U9 records/credits are frozen separately in `tests/fixtures/u9-canonical.json`. The shared style block remains byte-identical to the pre-integration style (inner SHA256 `2cd91220f2aa89927fc8432555074af78d8486e2103f7e20b62049412c09ac43`): no typography, map height or shared CSS redesign.

Ten regions exceed the old 1600×800-world packing area on a 390px display. The native dense fallback now accepts the actual visible canvas bounds for Unit 9+, retaining existing capsule metrics and avoiding the zoom-control gutter. Units 1–8 retain their original world packing bounds. A zero-size hidden Art iframe defers rendering until the existing resize observer sees a usable viewport; subject switching no longer attempts impossible hidden-marker packing.

## Verification evidence

Fresh U9 focused browser verification passed all four standalone/embedded desktop/mobile cases: 11 works, 15 views, both local images decoded, all study tabs, comparisons, dialog focus, filters/search/reset, manual camera controls, subject round-trip, overflow and injected-image-failure fallback (`/tmp/u9-focused-browser-5.log`). The full legacy Art browser matrix passed `ok:true`, 49 cases (`/tmp/u9-full-browser-2.log`). Production shared-map UI passed all four viewport cases (`/tmp/u9-production-ui.log`). The 984-test stage run passed before the final Unit-9-only dense-bounds scope guard (`/tmp/u9-stage-tests-3.log`); final reruns and quality approval are recorded below when complete. Independent integration specification review approved the actual implementation and separately passed its 117 focused tests.

Final U9 checkpoint: fresh full suite passed 989/989 (including the five now-available staged U10 tests), with no failures (`/tmp/u9-checkpoint-tests-3.log`). World/Home regression passed all 16 cases (`/tmp/u9-checkpoint-world-home.log`). Public/private-media leak verification passed (`/tmp/u9-checkpoint-private-2.log`). Integration quality review independently passed 215 focused tests and approved with no Important or Critical findings. The browser matrix and focused cases above include the final Unit-9-only bounds guard. No push, merge or Desktop synchronization is included in this checkpoint.
