# Public image additions — 2026-10-19

Scope: existing approved public-image pipeline only. No layout, typography, functionality, artwork identity, study content, marker or map-color changes. Not pushed.

## AP209 Taj Mahal

- `mausoleum-and-garden`: [Yann Forget, edited by King of Hearts and Jbarta](https://commons.wikimedia.org/wiki/File:Taj_Mahal,_Agra,_India_edit3.jpg). Image-level CC BY-SA 3.0 grant checked on the file page. Downloaded original visually inspected: full frontal mausoleum, dome, four minarets, garden and reflection pool. Converted entire frame proportionally to 2000 × 1382 WebP; no additional crop. Credit retains the source-requested © Yann Forget / Wikimedia Commons attribution and identifies the editors.
- `cenotaph-interior`: [Nemonoman](https://commons.wikimedia.org/wiki/File:TajCenotaphs.jpg). Author's worldwide public-domain dedication checked on the file page. Original visually inspected: smaller floral-inlay Mumtaz cenotaph at left, larger Shah Jahan cenotaph at right, surrounding pierced marble screen. Only 378 × 299; not enlarged, low resolution disclosed in alt text. Both cenotaphs remain visible. This is an alternate photograph of the same specified architectural components, not a claim to reproduce the identical CED photograph.
- Identity reference: [official Taj Mahal interiors description](https://www.tajmahal.gov.in/the-taj-interiors.aspx), distinguishing upper commemorative cenotaphs from actual graves below.

The two previously withheld slots have been replaced with locally stored images; corresponding placeholder-authority entries removed. Source bundle, inline live data, rights ledger, credits and U8 canonical media updated together. U9/U10 preservation hashes refreshed solely for these two reviewed image/credit additions; all other works and non-media AP209 fields checked against pre-change Git HEAD.

## Remaining inventory

Before this batch: U1 0, U2 0, U3 0, U4 8, U5 9, U6 15, U7 3, U8 12, U9 13, U10 32 missing views (92 total). After this batch U8 has 10 missing views, 90 total remain. Missing means a view has no public image, not necessarily that its copyright prohibits reuse. No unverified image or different object substituted.

## Verification

- 1,016 Node tests pass; strict validator accepts all 250 works.
- Existing full U8 browser verifier passes all four desktop/mobile standalone/embedded cases: 21 works, 50 views, now 40 local images.
- Focused native UI traversal U8 → India → AP209 verifies both real image decodes, `object-fit: contain`, view switching, modal opening/closing and focus return in all four cases.
- Byte-for-byte comparison with Git HEAD confirms page shell/CSS/JS/SVG unchanged; all non-AP209 artwork records and credits unchanged; AP209 non-media fields unchanged.
- Diagnostic caveat: directly invoking `selectComparison` from a newly loaded All Units iframe triggered an existing Agra marker-placement error during an early synthetic check. No runtime changes made for this unrelated path. Full native navigation and the existing U8 comparison regression pass; the synthetic shortcut is not used as evidence of normal navigation.
