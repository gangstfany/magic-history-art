# U5–U6 open-media release coverage

Verified against the checked-in ordered rights ledgers and actual public files on 2026-10-09. Dataset and placeholder authority were not changed by this verification.

Final release verification at `aa066a18` passed: 453 Node tests, the strict 180-work validator, private-media leak guard, and the complete rendered browser matrix. The separate real-file verifier also passed all three presentation modes. All accepted media files are Git-tracked. The branch remains local pending preview approval; no push was performed.

| Unit | Required views | Local open images | Rights/identity placeholders | Local bytes |
| --- | ---: | ---: | ---: | ---: |
| U5 | 27 | 18 | 9 | 9,839,374 |
| U6 | 23 | 8 | 15 | 3,005,204 |
| Total | 50 | 26 | 24 | 12,844,578 |

Largest delivered file: 1,356,010 bytes (limit 1,572,864). Largest decoded dimension: 2,000 pixels. Coverage is deliberately partial: unresolved exact-object identity or absent portable public rights remains a source-linked placeholder, never a substitute image.

## Real-file browser verification

`scripts/verify-art-history-local-media-browser.mjs` passed standalone 1365×768, standalone 390×844, and homepage-embedded 1024×768. Each mode traversed all 28 works and all 50 views in manifest/rights order through search, unit filter, keyboard region/site controls, and view buttons. No image route interception or mocks are installed; local assets are read from the checkout and decoded by Chromium.

Per mode: 26 loaded images with audited `src`, HTTP 200, positive natural dimensions ≤2,000, file sizes ≤1,572,864 bytes, and `object-fit: contain`; 24 source-linked placeholders with no image element or new image request; 112 study-tab visits; 187 frame/host overflow checkpoints. Public image modal decoding, close/focus restoration, and comparison navigation/return passed. No HTTP error, failed request, console error, page exception, or horizontal overflow was observed.

The focused contract suite passed 15 tests, including rejection of missing views, zero/oversized dimensions, oversized files, 404 responses, incorrect paths, cropping, frame/host overflow, error collection, placeholder image/requests, lost focus, and missing tabs. The separate legacy verifier covers the broader layout/private-media matrix; this focused check specifically supplies real-file decode evidence.

Run with the bundled Node executable and `ART_HISTORY_PLAYWRIGHT_PATH` pointing to the bundled `playwright/index.mjs`:

```sh
node --test tests/art-history-real-media-browser.test.mjs
node scripts/verify-art-history-local-media-browser.mjs
```

## Remaining placeholders

Reasons and source links below are copied from each view's `identityNote` and `sourcePageUrl` in `data/ap-art-history-unit-{5,6}-rights.json`; placeholder authority retains the public no-portable-permission policy. All 24 keys remain restricted with `localAssetPath: null`.

### Unit 5

- `ap153-chavin-huantar::relief-sculpture`: Exact required Chavín relief panel is identified by the College Board CED/Corbis credit. Open cactus-bearer and other panels were not proven to be this required panel; Corbis photograph is rights-managed. [Source](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf).
- `ap155-yaxchilan::structure-40`: Exact required Yaxchilán Structure 40 view is Peabody object 751742, by Ian Graham; educational/personal terms do not provide a portable public license. [Source](https://collections.peabody.harvard.edu/objects/details/751742).
- `ap157-templo-mayor::reconstruction`: Exact required reconstruction is Museo del Templo Mayor model in Commons Templo Mayor Tenochtitlan. Photograph is CC BY 2.0 but underlying modern model permission is unverified. [Source](https://commons.wikimedia.org/wiki/File:Templo_Mayor_Tenochtitlan.jpg).
- `ap160-maize-cobs::primary`: Exact required silver maize cobs held by Ethnologisches Museum Berlin are identified in the owning research source, photograph Claudia Obrocki/bpk. Other metal maize objects do not establish exact AP identity. [Source](https://doi.org/10.4000/bifea.8301).
- `ap163-bandolier-bag::primary`: Exact required Lenape/Delaware Bandolier bag is Smithsonian NMAI_227689, catalog 21/3358, circa 1850. Image says Usage Conditions Apply; CC0 is metadata only. [Source](https://www.si.edu/object/shoulder-bagbandolier-bag%3ANMAI_227689).
- `ap164-transformation-mask::closed`: Exact required closed state of the Kwakwaka'wakw transformation mask is the Musée du quai Branly AP work. Commons Peabody, Nuxalk and 71.1951.35.1 candidates do not establish the exact AP object and closed state. [Source](https://www.amisquaibranly.fr/wp-content/uploads/2024/10/20241014_cls-restaurations_masque-a-transformation.pdf).
- `ap164-transformation-mask::open`: Exact required open state of the Kwakwaka'wakw transformation mask is the Musée du quai Branly AP work. Commons 71.1951.35.1 depicts an open state but its identity as the AP object is not proven; Peabody/Nuxalk masks are different. [Source](https://www.amisquaibranly.fr/wp-content/uploads/2024/10/20241014_cls-restaurations_masque-a-transformation.pdf).
- `ap165-painted-elk-hide::primary`: Exact required Painted elk hide attributed to Cotsiogo (Katsikodi) is SAR object 1568, photograph Addison Doty. Other Cotsiogo hides and portraits do not qualify. [Source](https://emuseum.sarsf.org/objects/1568/untitled).
- `ap166-black-on-black-vessel::primary`: Exact required Maria and Julian Martínez black-on-black ceramic vessel is the Barbara Gonzales family-provided photograph credited in the CED. Other vessels, portraits and process images do not prove exact object identity. [Source](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf).

### Unit 6

- `ap169-wall-plaque-obas-palace::oba-context`: Exact 1964 Oba contextual scene, Werner Forman / Art Resource; rights-managed photograph, no portable open grant verified. [Source](https://secure-media.collegeboard.org/digitalServices/pdf/ap/ap-art-history-ced-content-area-6-africa.pdf#page=5).
- `ap170-sika-dwa-kofi::golden-stool`: Exact Golden Stool photograph credited to Marc Deville / Getty Images; rights-managed, not an open-license image. [Source](https://secure-media.collegeboard.org/digitalServices/pdf/ap/ap-art-history-ced-content-area-6-africa.pdf#page=5).
- `ap170-sika-dwa-kofi::stool-context`: Exact Asante Golden Stool contextual scene, Marc Deville / Getty Images; no portable open permission verified. [Source](https://secure-media.collegeboard.org/digitalServices/pdf/ap/ap-art-history-ced-content-area-6-africa.pdf#page=5).
- `ap171-ndop-king-mishe::ruler-context`: Exact 1971 Kuba ruler scene is Eliot Elisofon archive EECL2137; permission is required. EECL2170 is a different frame and cannot substitute. [Source](https://secure-media.collegeboard.org/digitalServices/pdf/ap/ap-art-history-ced-content-area-6-africa.pdf#page=6).
- `ap172-nkisi-nkondi::primary`: Exact Detroit Institute of Arts Nail Figure, accession 76.79, object 51144 (https://dia.org/collection/nail-figure/51144). A downloadable TIFF and blank copyright field do not constitute an open license. [Source](https://secure-media.collegeboard.org/digitalServices/pdf/ap/ap-art-history-ced-content-area-6-africa.pdf#page=6).
- `ap173-female-pwo-mask::primary`: Exact Smithsonian Female (Pwo) mask, accession 85-15-20 (https://www.si.edu/object/nmafa_85-15-20); Usage Conditions Apply, with no portable open image grant verified. [Source](https://secure-media.collegeboard.org/digitalServices/pdf/ap/ap-art-history-ced-content-area-6-africa.pdf#page=7).
- `ap174-portrait-mask-mblo::mask`: Exact Moya Yanso portrait mask by Owie Kimou, Jerry L. Thompson photograph; no open grant verified for this required object image. [Source](https://secure-media.collegeboard.org/digitalServices/pdf/ap/ap-art-history-ced-content-area-6-africa.pdf#page=7).
- `ap174-portrait-mask-mblo::performance-context`: Exact 1971 scene of Moya Yanso and her stepson holding her portrait mask; no portable open grant verified for this frame. [Source](https://secure-media.collegeboard.org/digitalServices/pdf/ap/ap-art-history-ced-content-area-6-africa.pdf#page=7).
- `ap175-bundu-mask::mask`: Exact CED Bundu mask attributed to NYPL / Schomburg Center / Art Resource remains unresolved at object-image level; no open-license image verified. Other sowei masks are not substitutes. [Source](https://secure-media.collegeboard.org/digitalServices/pdf/ap/ap-art-history-ced-content-area-6-africa.pdf#page=8).
- `ap175-bundu-mask::performance-context`: Exact Sande masquerade photograph credited to William Siegmann Estate / Edward DeCarbo; copyrighted photograph, no open grant verified. [Source](https://secure-media.collegeboard.org/digitalServices/pdf/ap/ap-art-history-ced-content-area-6-africa.pdf#page=8).
- `ap176-ikenga::primary`: Exact Ikenga shrine figure image credited to Werner Forman / Art Resource; no portable open license verified, other Ikenga figures cannot substitute. [Source](https://secure-media.collegeboard.org/digitalServices/pdf/ap/ap-art-history-ced-content-area-6-africa.pdf#page=8).
- `ap177-lukasa-memory-board::memory-board`: Exact lukasa board image credited to Heini Schneebeli / Bridgeman Art Library; no open grant verified for this board and photograph. [Source](https://secure-media.collegeboard.org/digitalServices/pdf/ap/ap-art-history-ced-content-area-6-africa.pdf#page=9).
- `ap177-lukasa-memory-board::contextual`: Exact contextual lukasa memory-practice photograph credited to Mary Nooter Roberts; no portable open permission verified. [Source](https://secure-media.collegeboard.org/digitalServices/pdf/ap/ap-art-history-ced-content-area-6-africa.pdf#page=9).
- `ap178-aka-elephant-mask::mask`: Exact Met elephant mask, accession 2001.758.1, object 318954 (https://www.metmuseum.org/art/collection/search/318954); image explicitly not downloadable and not marked public domain. Other elephant masks cannot substitute. [Source](https://secure-media.collegeboard.org/digitalServices/pdf/ap/ap-art-history-ced-content-area-6-africa.pdf#page=9).
- `ap178-aka-elephant-mask::performance-context`: Exact Bamileke elephant masquerade scene credited to George Holton / Photo Researchers / Getty Images; commercial rights-managed photograph, no open grant verified. [Source](https://secure-media.collegeboard.org/digitalServices/pdf/ap/ap-art-history-ced-content-area-6-africa.pdf#page=9).
