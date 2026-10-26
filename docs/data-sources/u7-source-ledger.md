# U7 integrated source and release ledger

Scope: AP #181–191, eleven works and twenty ordered required views. The current full College Board Course and Exam Description was checked on 2026-10-13 (PDF pages 224–230, printed 217–223) against the older official standalone U7 reference. The identities and required-view counts agree.

- [Frozen identities and view order](../../data/ap-art-history-unit-7-manifest.json)
- [Bilingual content](../../data/ap-art-history-unit-7-content.json)
- [Complete English study edition](../content/ap-art-history-unit-7-english.md)
- [Content evidence, supplied PDF references and uncertainty notes](u7-content-sources.md)
- [Exact-view decisions and image-level rights evidence](u7-media-sources.md)
- [Ordered rights records](../../data/ap-art-history-unit-7-rights.json)
- [Unresolved-view authority records](../../data/ap-art-history-unit-7-placeholder-authority.json)

## Public image coverage

Seventeen of twenty required views have verified local open-license images. Three remain honest placeholders, not broken images:

| AP | Work | Local images / required views | Unresolved |
|---|---|---:|---|
| 181 | Petra | 3 / 3 | — |
| 182 | Buddha, Bamiyan | 2 / 2 | — |
| 183 | The Kaaba | 3 / 3 | — |
| 184 | Jowo Rinpoche | 1 / 1 | — |
| 185 | Dome of the Rock | 1 / 2 | Interior with visible sacred rock, drum and arcades |
| 186 | Great Mosque, Isfahan | 3 / 4 | South-iwan close vault detail |
| 187 | Folio from a Qur'an | 1 / 1 | — |
| 188 | Basin | 1 / 1 | — |
| 189 | Bahram Gur Fights the Karg | 0 / 1 | Exact full Harvard folio, eligible permission not verified |
| 190 | The Court of Gayumars | 1 / 1 | — |
| 191 | The Ardabil Carpet | 1 / 1 | — |

The local images correspond to the named works and specified components, not necessarily the identical copyrighted camera frames in the CED. The rights ledger identifies differences in historic date, viewpoint or surroundings. AP182 uses pre-destruction photographs of the intact western Buddha; AP186 uses the actual stucco Öljaitü mihrab, not the Met's tiled mihrab from another Isfahan building. AP191 is the larger V&A carpet, not the smaller LACMA companion.

No CED/textbook image extraction, remote image hotlink, private bundle or noncommercial-only image is included. Files retain their entire source frame, with proportional resizing to a maximum edge of 2000 pixels and WebP conversion; file-specific derivative disclosures and attribution appear in the rights records.

## Content review corrections

The supplied notes are study aids, not sole authorities. In particular: Arabic reads right-to-left; tawaf is seven circuits; Petra's Great Temple is not wholly rock-cut; Jowo's historic devotional setting does not establish its original casting workshop; the basin's later Christian use is not its original commission; Safavid/Il-Khanid court association does not prove an exact workshop; the Ardabil carpet's signed name does not securely establish a weaving city. AP186 distinguishes eleventh-century domed chambers from the twelfth-century four-iwan courtyard conversion.

Map coordinates are approximate teaching anchors. Uncertain production regions retain visible English provenance qualifiers; present museum locations are not substituted for original contexts.

## Preservation and verification contract

The U7 regression test compares SHA-256 hashes of all parsed AP1–180 records and their credits against the pre-U7 baseline. Shared CSS typography, map-height rules, camera behavior, World SVG and World content are outside this change. U7 tests check eleven ordered records, twenty stable view IDs, complete English sections, valid comparisons, local file bounds and rights alignment. The focused browser verifier traverses every U7 work and view in standalone and embedded desktop/mobile modes.

Final U7 verification before U8 work: 964 Node tests passed; strict191-work validator and private-media leak guard passed; the full legacy Art browser matrix reported `ok: true`; focused U7 desktop/mobile standalone/embedded cases each traversed11works/20views with17localimages. Production typography/height checks passed at1440×1000,900×1000,390×1000 and390×500; World/Home regressions passed. The Art CSS style block matched its pre-U7 hash. Browser expectation updates followed the already approved responsive fitting and content-sized host contract, without changing production CSS/camera behavior.
