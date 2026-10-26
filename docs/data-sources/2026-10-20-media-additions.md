# Public media supplementation — 2026-10-20

## Scope

16 newly verified images added, in addition to the two AP209 Taj Mahal images prepared on October19 (18 views in the combined uncommitted batch). All are repository-local WebP assets with complete downloaded frames. No private-media bundle, AI reconstruction, substitute museum object, new UI, Git push, merge, or Desktop synchronization.

Durable per-view source, author, exact-object/component identity, photographic grant/public-domain basis, and derivative records: [addition journal](../../data/ap-art-history-media-additions-2026-10-20.json). Runtime credits and each unit's rights audit mirror those records. Long historical public-domain explanations are retained in identity notes; the displayed license names use the existing standardized public-domain categories. The public-domain status marker is not an independent license grant.

## Added views

- U6: AP169 royal-regalia contextual photograph (accurately dated1936); AP170 exact Golden Stool (1935 archival photograph); AP172 exact Detroit76.79 Nkisi; AP175 Sande/Bundu full-costume context (1936 Panguma, explicitly not the CED event).
- U7: AP186 south-iwan muqarnas detail; AP189 complete Great Ilkhanid Shahnama Bahram Gur folio.
- U8: AP192 circumambulatory path and combined historical plan/elevation; AP195 cliff overview; AP199 Angkor Wat plan and Angkor site map; AP200 lion/figure detail and1927 ASI complete temple plan.
- U9: AP213 canal-side basalt wall; AP216 exact1837 historical contextual engraving.
- U10: AP240 river-facing Bilbao exterior. Photograph is CC BY-SA3.0; underlying architecture/public sculpture is not represented as CC-licensed. Public exterior reproduction basis is separately documented in the identity note with Spanish Article35.2 and17USC120(a). Interior artworks and building plans remain unresolved.

## Remaining public gaps

74 required views remain unresolved: U4=8, U5=9, U6=11, U7=1, U8=3, U9=11, U10=31. These are view counts, not counts of artworks. “Unresolved” means exact view and portable eligible public-use basis have not both been verified, not a categorical assertion that the work is copyrighted or that no image exists.

The reviewed outstanding evidence is preserved in [U6](2026-10-20-u6-unresolved-media.md), [U8](2026-10-20-u8-unresolved-media.md), and [U9](2026-10-20-u9-unresolved-media.md). U7 remaining view: AP185 sacred-rock interior with upper drum/windows. Several U10 modern works require permission for the underlying artwork separately from the photographer's license. Existing U4/U5 rights audits remain unchanged.

## Verification and known issue

- All16 assets decode as valid WebP, maximum edge≤2000 and each≤1,572,864bytes. No upscaling of archival low-resolution sources.
- Strict validator accepts250works. Preservation comparison against HEAD confirms all250nonmedia records, required-view IDs/order, unapproved images/credits, and page CSS/JS/HTML outside the two data blocks are unchanged. Preservation hashes updated only for the approved media changes.
- New regression test was observed failing on null runtime images before integration, then passed.
- New16-image browser verification passed desktop/mobile standalone loading, contain display, view switching, enlargement and focus restoration. Existing U8/U10 verification passed all four standalone/embedded desktop/mobile cases.
- The additional cross-unit browser stress run exposed an intermittent embedded resize/marker packing error for Rarotonga after AP216 image enlargement (`Unable to place Rarotonga, Cook Islands without a marker collision`, from scheduleMarkerLayout→render→layoutMapGroups). A fresh single-work four-viewport run also passed once and failed on another run; the issue is intermittent, not claimed fixed. Production layout code is unchanged in this media-only batch. The verifier keeps this error visible rather than suppressing it. Investigate iframe/map resize state separately before pushing.

No completion claim is made for all remaining74views or the intermittent embedded packing issue. This batch has not been pushed.
