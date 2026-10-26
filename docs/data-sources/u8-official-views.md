# Unit 8 official identity and component-view freeze

Reviewed 2026-10-14. Primary source: [College Board AP Art History Course and Exam Description](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf), currently served 77,660,165-byte PDF, copyright 2019, Course Framework V.1. Local verified source: `/tmp/apah-current-ced-20261013.pdf`. Browser fetch was attempted but rejected the 77 MB size; complete local PDF pages 249-264 were text-extracted, rendered at 1400 pixels, and visually inspected. PDF physical page numbers below are one-based; printed framework pages are physical minus seven.

The manifest freezes **21 works, AP192-212, and 50 separately represented pedagogical component views**. The CED heading counts sum to **49 images** when single-image works are counted as one. The difference is AP199: its heading says **5 images**, but its two pages contain **four separately captioned photographs and two distinct, separately captioned plans**. Both plans are required here: Angkor Wat's building plan and the wider Angkor site plan are not the same graphic or two parts of one plan. This is an explicit component-view accounting convention, not a claim that College Board prints a 50-image total. AP192's combined plan-and-elevation graphic remains one view, consistent with its single caption and CED count.

Order is page order, then left-to-right/top-to-bottom reading order. View IDs describe the depicted component, not the photographer or the storage file. These pages are evidence only: **none of the CED photographs or diagrams is extracted for publication**. Future assets must separately establish permitted licensing and exact component identity, or use an honest unavailable-view placeholder.

## Per-work official view ledger

The ordered descriptions correspond one-for-one with `requiredViewIds` in the manifest.

| AP | Official identity | Physical PDF / printed framework page | Views, in required order | Count |
| --- | --- | --- | --- | --- |
| 192 | Great Stupa at Sanchi | 249 / 242 | `stupa-exterior`: dome, railing and torana; `circumambulatory-path-detail`: path beside dome, seated Buddha and railing; `north-gate`: carved torana; `plan-and-elevation`: combined drawing | 4 |
| 193 | Terra cotta warriors from mausoleum of the first Qin emperor of China | 250 / 243 | `excavation-pit-overview`: ranks within excavated pit; `warriors-and-horse-detail`: figures and horse close view | 2 |
| 194 | Funeral banner of Lady Dai (Xin Zhui) | 250 / 243 | `complete-banner`: complete T-shaped painted silk and pendants | 1 |
| 195 | Longmen caves | 251 / 244 | `cliff-overview`: river-facing cliff and large open sculptural ensemble; `guardian-detail`: standing guardian; `vairocana-and-attendants`: seated monumental Buddha and accompanying figures | 3 |
| 196 | Gold and jade crown | 252 / 245 | `complete-crown`: tree/antler projections and hanging jade ornaments | 1 |
| 197 | Todai-ji | 252-253 / 245-246 | `great-buddha-hall-exterior`; `great-buddha`: seated bronze Vairocana; `nio-closed-mouth`: left CED guardian, closed-mouth Ungyo; `nio-open-mouth`: right CED guardian, open-mouth Agyo; `great-south-gate`: Nandaimon exterior | 5 |
| 198 | Borobudur Temple | 254 / 247 | `aerial-overview`: concentric terraces; `narrative-relief-detail`: carved narrative with chariot; `buddha-and-stupas`: seated Buddha before perforated stupas | 3 |
| 199 | Angkor, the temple of Angkor Wat, and the city of Angkor Thom, Cambodia | 255-256 / 248-249 | `angkor-wat-exterior`; `angkor-thom-south-gate`; `churning-ocean-of-milk-relief`; `bayon-face-towers`: CED caption calls these Jayavarman VII as Buddha; `angkor-wat-plan`; `angkor-site-plan` | 6 components; heading 5 |
| 200 | Lakshmana Temple | 256-257 / 249-250 | `temple-exterior`; `mithuna-relief-detail`: erotic/embracing figures; `lion-and-figure-detail`: sculptural creature and figure beside carved porch; `temple-plan` | 4 |
| 201 | Travelers among Mountains and Streams | 258 / 251 | `complete-hanging-scroll` | 1 |
| 202 | Shiva as Lord of Dance (Nataraja) | 258 / 251 | `complete-bronze`: Shiva within flame aureole, dwarf below | 1 |
| 203 | Night Attack on the Sanjô Palace | 258 / 251 | `complete-handscroll`: long narrative and text; `opening-text-and-riders-detail`: opening calligraphy and mounted figures (not an arbitrary burning-palace crop) | 2 |
| 204 | The David Vases | 259 / 252 | `paired-vases`: both matching inscribed vessels together | 1 |
| 205 | Portrait of Sin Sukju (1417-1475) | 259 / 252 | `complete-portrait`: seated official in robes, badge and footstool | 1 |
| 206 | Forbidden City | 259-260 / 252-253 | `palace-overview`; `tiananmen-front-gate`: CED front-gate photo is Tiananmen, not Meridian Gate; `hall-supreme-harmony`; `tranquility-longevity-interior`: distinctive illusionistically painted room, with architectural/garden wall murals and painted ceiling, not a generic palace hall or exterior; `palace-plan` | 5 |
| 207 | Ryoan-ji | 261 / 254 | `wet-garden`: pond and bridge; `dry-garden`: rocks and raked gravel; `site-plan`: temple, dry garden and pond context | 3 |
| 208 | Jahangir Preferring a Sufi Shaikh to Kings | 262 / 255 | `complete-album-page`: includes ornamental border | 1 |
| 209 | Taj Mahal | 262 / 255 | `mausoleum-and-garden`: frontal exterior and reflection pool; `cenotaph-interior`: cenotaph and marble screen/inlay | 2 |
| 210 | White and Red Plum Blossoms | 263 / 256 | `white-plum-left-screen`; `red-plum-right-screen`: distinct two-fold screen halves in CED reading order | 2 |
| 211 | Under the Wave off Kanagawa (Kanagawa oki nami ura), also known as the Great Wave, from the series Thirty-six Views of Mount Fuji | 263 / 256 | `complete-print` | 1 |
| 212 | Chairman Mao en Route to Anyuan | 264 / 257 | `complete-lithograph`: circa-1969 color print after Liu Chunhua, including printed lower margin | 1 |

Official titles are retained, including `Terra cotta`, `Todai-ji`, `Ryoan-ji`, and `Sanjô`. Typesetting is normalized to straight apostrophes for the application schema; the portrait's life-date en dash is retained in JSON. These display spellings are not assertions about preferred scholarly transliteration.

## Navigation groups and creation-context geography

Five English navigation groups are interpretive learning aids, **not official College Board categories**:

- **Buddhist Sacred Sites**: AP192, 195, 197, 198, 207. Includes monument, sculpture, ritual movement and Zen garden contexts.
- **Hindu Sacred Art**: AP199, 200, 202. AP199 is deliberately labeled with its primary Angkor Wat Hindu context while its Bayon/Jayavarman VII Buddhist component is preserved, not erased.
- **Court & Imperial Power**: AP193, 194, 196, 203, 205, 206, 208, 209, 212. Covers elite burial, royal/court identity, military narrative, imperial architecture and modern state propaganda; modern Mao imagery does not imply a literal imperial court.
- **Landscape & Nature**: AP201, 210, 211. Different Song, Rinpa and ukiyo-e traditions share a useful visual-analysis navigation theme, not one historical school.
- **Ceramics & Exchange**: AP204. Its blue-and-white porcelain combines Jingdezhen production and cobalt/interregional exchange; a singleton preserves the distinctive medium and context.

The six region IDs represent countries/creation contexts actually represented by these works: `india` (192, 200, 202, 208, 209), `china` (193, 194, 195, 201, 204, 206, 212), `korea` (196, 205), `japan` (197, 203, 207, 210, 211), `indonesia` (198), and `cambodia` (199). These are practical map regions, not a claim that present borders coincide with ancient polities. Unit rules should derive exactly these represented regions, not include all of Asia or current collection locations.

In-situ monuments use named original sites. Portable works avoid false city precision:

- AP194 maps the Mawangdui Tomb 1 burial findspot in Changsha, not a proven silk workshop.
- AP196 uses the north mound of Hwangnam Daechong Tomb in Gyeongju (Smarthistory identification), not the present museum or a known goldworking studio.
- AP201 remains Northern Song China; its northern landscape and present Taipei collection do not locate its studio.
- AP202 remains Chola Tamil Nadu; no exact casting town or original temple is established here.
- AP203 remains Kamakura-period Japan; the 1159 attack depicted in Kyoto is not evidence of where the circa-1250-1300 scroll was painted.
- AP204 uses Jingdezhen production, not the Daoist dedication destination or British Museum.
- AP205 remains the Joseon court painting context, not its later family shrine/collection location in Cheongwon.
- AP208 remains Jahangir's Mughal court in India without assigning an undocumented city.
- AP210 remains Edo-period Japan without turning the present MOA collection in Atami into a creation site.
- AP211 uses Edo publishing context, not the depicted waters off Kanagawa or any present collection.
- AP212 remains China with anonymous printing workshop unknown. Anyuan is narrative destination; the painting's artist or exhibition context cannot prove the lithograph's printing location.

## Secondary local reference and differences

Supplied Smarthistory volume-five source: `Smarthistory-guide-to-AP®-Art-History-volume-five-192-250-1578690377.pdf`. Targeted text review corroborates crown findspot (physical p.35 / printed p.25), Jingdezhen (physical pp.67-68 / printed pp.57-58), Joseon portrait context (physical pp.69-70 / printed pp.59-60), distinct left white/right red plum screens (physical pp.87-88 / printed pp.77-78), and Mao subject/painting reproduction distinction (physical pp.93-95 / printed pp.83-85). This secondary source supplements context; it does not override official view selection or establish publication rights.

Important deviation to prevent: Smarthistory's AP212 chapter leads with Liu Chunhua's **1967 oil painting**. The CED specifies **artist unknown, based on Liu Chunhua; circa 1969 color lithograph**. The application must represent the CED print identity and may discuss the earlier painting as context only. A painting image cannot silently stand in for the required lithograph.

The supplied `APAH notes.pdf` is available as later study-context material, but was not necessary to determine this official image-set scope and was not used to override the CED. No copyrighted textbook imagery was republished.
