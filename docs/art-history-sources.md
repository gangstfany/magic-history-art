# AP 艺术史作品来源索引

## Unit 5: Indigenous Americas

- Official AP #153–166 identity and ordered-view contract:
  `data/ap-art-history-unit-5-manifest.json`
- Canonical 14-work / 27-view bilingual study fixture:
  `tests/fixtures/u5-canonical.json`
- Ordered per-view image, source, rights, and review ledger:
  `docs/data-sources/u5-source-ledger.md`
- Per-view creator, license, and release-class audit:
  `data/ap-art-history-unit-5-rights.json`
- Rights-restricted source authority, with no image assets:
  `data/ap-art-history-unit-5-placeholder-authority.json`
- Identity authority: current [College Board AP Art History Course and Exam
  Description](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf),
  Unit 5, Indigenous Americas, AP #153–166
- Local study cross-checks: `APAH notes.pdf` and
  `UNIT 11_ INDIGENOUS AMERICAS.pptx`

The College Board CED controls the AP number, official English identity, and
required logical views; it is not a public image host. The canonical fixture
preserves exact manifest order and creation-context geography while separating
findspot, current collection, colonial reuse, and later interpretation. Broad
or uncertain provenance remains qualified rather than being converted into an
invented city. The map coordinates for portable works are regional anchors,
not claims about a precise workshop.

Every view has an independent rights decision. The audited distribution is 16
`open` and eleven `restricted`. The NPS Mesa Verde photograph is federal public
domain and therefore remains `open`; its NPS conditions and living Pueblo
heritage context are documented without inventing an educational-only license.
A `restricted` view always has `imageUrl: null` and
`mediaStatus: "rightsRestricted"`; its authority file contains only a stable
source page and an honest rights note. Restricted files are not copied into
Git and are not part of any public-release claim.

The stricter eleven-view restricted set is deliberate. The CED's Chavín relief
uses a rights-managed Corbis photograph, and the open cactus-bearer stela could
not be proven to be the same panel. Peabody's exact Yaxchilán Structure 40
archive image has only limited use terms and no verified portable public asset.
Great Serpent Mound is treated as a sacred American Indian site using a joint
Ohio History Connection–Shawnee authority. The Weltmuseum penacho remains
culturally contested. The Templo Mayor reconstruction photograph has CC BY 2.0
terms, but the modern museum model's underlying design rights were not verified.
The exact Inka maize photograph is rights-managed; NMAI,
the Musée du quai Branly, SAR, and the Barbara Gonzales family photograph do
not supply portable permission for AP 163–166. For the Kwakwa̱ka̱ʼwakw mask,
a CC license on one museum-display photograph was not treated as permission
for the underlying ceremonial and family/clan property.

Terminology and cultural-context review used present community and official
institutional sources:

- [UNESCO Chavín de Huántar](https://whc.unesco.org/en/list/330) and the
  [Cleveland Museum of Art nose ornament record](https://www.clevelandart.org/art/1958.183)
- [NPS Mesa Verde people](https://www.nps.gov/meve/learn/historyculture/people.htm)
  and [Cliff Palace](https://www.nps.gov/meve/learn/historyculture/cliff_palace.htm)
- [INAH Yaxchilán](https://lugares.inah.gob.mx/es/node/4367),
  [Templo Mayor](https://www.inah.gob.mx/zonas/zona-arqueologica-templo-mayor),
  and [Piedra del Sol](https://www.inah.gob.mx/foto-del-dia/piedra-del-sol-235-anos-del-resurgimiento-del-nahui-ollin)
- [Ohio History Connection and Shawnee Tribe on Serpent
  Mound](https://www.ohiohistory.org/ohios-serpent-mound-an-american-indian-story-written-in-the-earth/)
- [Weltmuseum feather-headdress research](https://www.weltmuseumwien.at/en/the-feather-headdress/)
  and [object record](https://www.weltmuseumwien.at/en/objects/531234)
- [UNESCO City of Cuzco](https://whc.unesco.org/en/list/273) and the Cusco
  culture authority's [Saqsaywaman page](https://www.culturacusco.gob.pe/parques/saqsaywaman/)
- Peru's official [Machupicchu history](https://www.machupicchu.gob.pe/history/?lang=en)
  and [visitor information](https://www.machupicchu.gob.pe/informative-brochure/?lang=en)
- [Dumbarton Oaks All-T'oqapu tunic](https://museum.doaks.org/objects-1/info/23071)
  and the published [Berlin maize-cob technical study](https://doi.org/10.4000/bifea.8301)
- [Delaware Tribe Lenape bags guide](https://delawaretribe.org/wp-content/uploads/Lenape-Bags.pdf),
  [NMAI Bandolier bag record](https://www.si.edu/object/shoulder-bagbandolier-bag%3ANMAI_227689),
  and [NMAI collections sensitivity statement](https://americanindian.si.edu/collections-statement)
- [U'mista Cultural Centre](https://www.umista.ca/pages/about-us), its
  [collection history](https://www.umista.ca/pages/collection-history), and
  its [statement on inherited family and clan authority](https://www.umista.ca/pages/authenticity)
- [Eastern Shoshone Tribe](https://easternshoshone.org/about/) and the
  [School for Advanced Research Katsikodi record](https://emuseum.sarsf.org/objects/1568/untitled)
- [Pueblo de San Ildefonso](https://sanipueblo.org/visiting-the-pueblo/) and
  the Museum of Indian Arts & Culture's [black-on-black process
  account](https://www.indianartsandculture.org/exhibits/maria/ar_black.html)

Current community names appear first: Ancestral Pueblo people, Mexica, Inka,
Lenape, Kwakwa̱ka̱ʼwakw, Eastern Shoshone, and Pueblo de San Ildefonso.
Older labels are included only where they help AP search and recognition.
Living cultures are described in the present tense. Sacred meaning, maker,
ownership, ritual function, the proposed puma-shaped Cusco plan, Machupicchu's
specific functions, Great Serpent Mound's date and makers, and the maize cobs'
authenticity are all stated as interpretations or current uncertainties where
the evidence does not establish certainty.

## Unit 4: Later Europe and Americas

- Official AP #99–152 identity and view contract:
  `data/ap-art-history-unit-4-manifest.json`
- Canonical 54-work / 63-view study-and-media fixture:
  `tests/fixtures/u4-canonical.json`
- Ordered per-view source and attribution ledger:
  `docs/data-sources/u4-source-ledger.md`
- Per-view license and release-class audit:
  `data/ap-art-history-unit-4-rights.json`
- Rights-restricted identity/source evidence:
  `data/ap-art-history-unit-4-public-placeholders.json`
- Public/private media design and release rules:
  `docs/superpowers/specs/2026-08-09-u4-rights-safe-private-media-design.md`
- College Board authority: current AP Art History Course and Exam Description,
  Unit 4, Later Europe and Americas, AP #99–152
- Local study cross-checks: `APAH notes.pdf` and
  `Smarthistory-guide-to-AP®-Art-History-volume-three-99-152-1578678215.pdf`

Unit 4 preserves the manifest's exact AP order, creation-context region,
provenance qualifiers, movement grouping, and ordered multi-view requirements.
The bilingual study fields synthesize the two local study references above;
the College Board contract remains authoritative for official identity, date,
medium, and required image count.

Rights are audited independently for every logical view. The ledger distinguishes
the direct image from the source page and from the license or institutional
terms. A Creative Commons license attached to a photograph is recorded only for
that photograph and does not silently expand to the underlying modern artwork.
`open`, `noncommercial`, and `institutionalEducational` retain the meanings
defined below for Unit 3. A `restricted` entry has `imageUrl: null`, publishes no
reproduction, and keeps only a stable identity/source link. The ignored private
media overlay described in the approved design is outside Git and outside the
public release claim.

## Unit 3: Early Europe and Colonial Americas

- Official AP #48–98 contract: `data/ap-art-history-unit-3-manifest.json`
- Canonical study-and-media fixture: `tests/fixtures/u3-canonical.json`
- Audited 51-work / 103-view image, creator, and rights ledger:
  `docs/data-sources/u3-source-ledger.md`
- College Board authority: current AP Art History Course and Exam Description,
  Unit 3, Early Europe and Colonial Americas, AP #48–98
- Local study cross-checks: `APAH notes.pdf` and
  `Smarthistory-guide-to-AP®-Art-History-volume-two.pdf`

Unit 3 records keep the exact manifest order and distinguish specific cultural
traditions from the four broader study filters used by the map:
`lateAntiqueByzantine`, `medievalIslamic`, `renaissanceMannerism`, and
`baroqueColonial`. Multi-view monuments, manuscripts, altarpieces, and
two-sided works have one audited ledger row and one credit record per required
view.

Rights are recorded at view level in
`data/ap-art-history-unit-3-rights.json`. Each entry links to its license,
public-domain mark, or institutional terms page and has one release class:

- `open`: public-domain or reusable under the stated open license.
- `noncommercial`: reusable only under the stated noncommercial license.
- `institutionalEducational`: retained under an institution's stated
  educational or collection-use terms; it is not unrestricted or open.
- `restricted`: not release-ready without explicit permission or replacement.

The current Unit 3 set has no `restricted` media. The AP 55 St. Luke portrait
(folio 137v) and AP 97 Breamore House painting use exact Smarthistory OER
images under CC BY-NC-SA 4.0 and are therefore `noncommercial`. The Merovingian
fibulae use the Louvre collection terms, and the LACMA *Virgin of Guadalupe*
image retains LACMA's reuse terms; both are `institutionalEducational`, not
open. Any later commercial use requires a new rights audit of both the
`noncommercial` and `institutionalEducational` entries. This current app is
classified for developer-only, noncommercial use.

The AP 97 identification is cross-checked against Smarthistory's article on the
same Breamore House painting rather than inferred from a similarly titled
Commons file.

Broad or disputed provenances are stated as qualifications rather than false
precision. AP 50 remains Syria or Palestine; AP 53 records the Louvre findspot
at Jouy-le-Comte while leaving the workshop unlocalized; AP 55 uses probable
Lindisfarne and traditional attribution to Eadfrith; AP 59 distinguishes likely
English embroidery from Norman patronage; AP 62 retains a broad Rhineland
origin; and AP 68 marks both probable Bruges production and the unresolved
identities of the sitters.

## Unit 1: Global Prehistory

- Official AP #1-11 contract: `data/ap-art-history-unit-1-manifest.json`
- Audited identification, study, image, creator, and license ledger:
  `docs/data-sources/u1-source-ledger.md`
- College Board authority: current AP Art History Course and Exam Description,
  Unit 1, Global Prehistory, AP #1-11

## Unit 2: Ancient Mediterranean

本台账覆盖 College Board AP Art History CED 官方 Unit 2 清单的全部 36 件作品（AP 12–47），并按官方编号顺序排列。ID、官方英文标题、文化分类、图片来源、直接图片 URL 与署名许可均与 `art-history-map.html` 中的 `artwork-data` 和 `image-credit-data` 一一对应；中文学习提要参考 `APAH notes.pdf`。

图片许可与署名以所列来源页为准。CC BY/CC BY-SA 条目须按对应版本署名；CC0 与 Public Domain 条目按来源页标示使用。AP 32 另受来源页所列意大利文化遗产再利用授权限制。建筑与建筑群当前各选一张代表图。

| AP | ID | 官方英文标题 | 文化 | 官方身份来源 | 本地笔记 | 公共图片/来源页 | 直接图片 URL | 署名与许可 |
|---:|---|---|---|---|---|---|---|---|
| 12 | `ap12-white-temple-ziggurat` | White Temple and its ziggurat | ancientNearEast | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, p. 6 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Uruk_(3).jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Uruk_(3).jpg) | 摄影：tobeytravels；来源机构：Wikimedia Commons；[CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) |
| 13 | `ap13-palette-of-king-narmer` | Palette of King Narmer | egypt | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 6–7 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Narmer_Palette.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Narmer_Palette.jpg) | 作者：anonymous；来源机构：Wikimedia Commons；[Public Domain Mark 1.0](https://creativecommons.org/publicdomain/mark/1.0/) |
| 14 | `ap14-statues-votive-figures` | Statues of votive figures, from the Square Temple at Eshnunna (modern Tell Asmar, Iraq) | ancientNearEast | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, p. 7 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Sumerian_Status_from_Tell_Asmar,_part_of_the_Tell_Asmar_Hoard.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Sumerian_Status_from_Tell_Asmar,_part_of_the_Tell_Asmar_Hoard.jpg) | 摄影：Osama Shukir Muhammed Amin FRCP(Glasg)；来源机构：Wikimedia Commons；[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| 15 | `ap15-seated-scribe` | Seated scribe | egypt | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 7–8 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Le_Scribe_accroupi_-_Mus%C3%A9e_du_Louvre_Antiquit%C3%A9s_%C3%A9gyptiennes_E_3023.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Le_Scribe_accroupi_-_Mus%C3%A9e_du_Louvre_Antiquit%C3%A9s_%C3%A9gyptiennes_E_3023.jpg) | 摄影：Shonagon；来源机构：Wikimedia Commons；[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| 16 | `ap16-standard-of-ur` | Standard of Ur from the Royal Tombs at Ur (modern Tell el-Muqayyar, Iraq) | ancientNearEast | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 8–9 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Denis_Bourez_-_British_Museum,_London_(8747049029)_(2).jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Denis_Bourez_-_British_Museum,_London_(8747049029)_(2).jpg) | 摄影：Denis Bourez；来源机构：Wikimedia Commons / British Museum；[CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) |
| 17 | `ap17-great-pyramids-giza` | Great Pyramids (Menkaura, Khafre, Khufu) and Great Sphinx | egypt | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 8–9 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:All_Gizah_Pyramids.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/All_Gizah_Pyramids.jpg) | 摄影：Ricardo Liberato；来源机构：Wikimedia Commons；[CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) |
| 18 | `ap18-king-menkaura-and-queen` | King Menkaura and queen | egypt | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 9–10 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:King_Menkaura_%28Mycerinus%29_and_queen.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/King_Menkaura_%28Mycerinus%29_and_queen.jpg) | 摄影：Jen（Calliopejen1）；来源机构：Wikimedia Commons；[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| 19 | `ap19-code-of-hammurabi` | The Code of Hammurabi | ancientNearEast | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 10–11 | [World History Encyclopedia](https://www.worldhistory.org/image/14341/code-of-hammurabi/) | [direct](https://www.worldhistory.org/image/14341/code-of-hammurabi/download/) | 摄影：Larry Koester；来源机构：World History Encyclopedia / Louvre Museum；[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| 20 | `ap20-temple-of-amun-re-karnak` | Temple of Amun-Re and Hypostyle Hall | egypt | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 10–11 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Templo_de_Karnak,_Luxor,_Egipto,_2022-04-03,_DD_146.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Templo_de_Karnak,_Luxor,_Egipto,_2022-04-03,_DD_146.jpg) | 摄影：Diego Delso；来源机构：Wikimedia Commons；[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| 21 | `ap21-mortuary-temple-hatshepsut` | Mortuary temple of Hatshepsut | egypt | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 11–12 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Temple_of_Hatshepsut,_Deir_el-Bahari,_Luxor,_Egypt.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Temple_of_Hatshepsut,_Deir_el-Bahari,_Luxor,_Egypt.jpg) | 摄影：Vyacheslav Argenberg；来源机构：Wikimedia Commons；[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| 22 | `ap22-akhenaten-nefertiti-daughters` | Akhenaten, Nefertiti, and three daughters | egypt | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 12–13 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Akhenaten,_Nefertiti_and_their_children.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Akhenaten,_Nefertiti_and_their_children.jpg) | 摄影：Gerbil；来源机构：Wikimedia Commons；[Public Domain Mark 1.0](https://creativecommons.org/publicdomain/mark/1.0/) |
| 23 | `ap23-tutankhamun-innermost-coffin` | Tutankhamun’s tomb, innermost coffin | egypt | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 13–14 | [Wikimedia Commons / Library of Congress](https://commons.wikimedia.org/wiki/File:Egypt._Cairo._King_Tutankhamun%27s_coffin_LOC_matpc.23054.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Egypt._Cairo._King_Tutankhamun%27s_coffin_LOC_matpc.23054.jpg) | 摄影：Matson Collection；来源机构：Library of Congress / Wikimedia Commons；[Public domain / no known restrictions](https://commons.wikimedia.org/wiki/File:Egypt._Cairo._King_Tutankhamun%27s_coffin_LOC_matpc.23054.jpg) |
| 24 | `ap24-last-judgment-of-hunefer` | Last judgment of Hunefer, from his tomb (page from the Book of the Dead) | egypt | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 14–15 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:BD_Hunefer.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/BD_Hunefer.jpg) | 摄影署名：Jon Bodsworth；来源机构：Wikimedia Commons；[Public Domain Mark 1.0](https://creativecommons.org/publicdomain/mark/1.0/) |
| 25 | `ap25-lamassu-sargon-ii` | Lamassu from the citadel of Sargon II, Dur Sharrukin (modern Khorsabad, Iraq) | ancientNearEast | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 14–15 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Lamassu_(Winged_Bull)_of_Throne_Room_of_Palace_of_Sargon_II,_Khorsabad,_Assyria_(28218791021).jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Lamassu_(Winged_Bull)_of_Throne_Room_of_Palace_of_Sargon_II,_Khorsabad,_Assyria_(28218791021).jpg) | 摄影：Gary Todd；来源机构：Wikimedia Commons / Louvre Museum；[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| 26 | `ap26-athenian-agora` | Athenian agora | greece | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 20–21 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Ancient_Agora_of_Athens.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Ancient_Agora_of_Athens.jpg) | 摄影：DerHexer；来源机构：Wikimedia Commons；[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| 27 | `ap27-anavysos-kouros` | Anavysos Kouros | greece | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 16–17 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Kouros_anavissos.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Kouros_anavissos.jpg) | 摄影：Mountain；来源机构：Wikimedia Commons；[Public Domain Mark 1.0](https://creativecommons.org/publicdomain/mark/1.0/) |
| 28 | `ap28-peplos-kore` | Peplos Kore from the Acropolis | greece | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 17–18 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:ACMA_679_Kore_1.JPG) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/ACMA_679_Kore_1.JPG) | 摄影：Marsyas；来源机构：Wikimedia Commons；[CC BY-SA 2.5](https://creativecommons.org/licenses/by-sa/2.5/) |
| 29 | `ap29-sarcophagus-of-the-spouses` | Sarcophagus of the Spouses | etruscan | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, p. 16 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Sarcofago_degli_Sposi_Villa_Giulia.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Sarcofago_degli_Sposi_Villa_Giulia.jpg) | 摄影：Tutorialwiki；来源机构：Wikimedia Commons / Museo Nazionale Etrusco di Villa Giulia；[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| 30 | `ap30-apadana-darius-xerxes` | Audience Hall (apadana) of Darius and Xerxes | ancientNearEast | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, p. 17 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Persepolis_-_Apadana_01.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Persepolis_-_Apadana_01.jpg) | 摄影：Bernard Gagnon；来源机构：Wikimedia Commons；[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| 31 | `ap31-temple-minerva-apollo` | Temple of Minerva (Veii, near Rome, Italy) and sculpture of Apollo | etruscan | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 17–18 | [Wikimedia Commons / tDAR](https://commons.wikimedia.org/wiki/File:Reconstruction_of_the_Apollo_temple_from_the_Portonaccio_sanctuary.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Reconstruction_of_the_Apollo_temple_from_the_Portonaccio_sanctuary.jpg) | 作者：unknown；来源机构：Wikimedia Commons / tDAR；[Public domain (PD-ineligible)](https://commons.wikimedia.org/wiki/File:Reconstruction_of_the_Apollo_temple_from_the_Portonaccio_sanctuary.jpg) |
| 32 | `ap32-tomb-of-the-triclinium` | Tomb of the Triclinium | etruscan | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 18–19 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Pittore_forse_attico,_affreschi_della_tomba_del_triclinio,_500-475_ac_ca,_01.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Pittore_forse_attico,_affreschi_della_tomba_del_triclinio,_500-475_ac_ca,_01.jpg) | 摄影：Sailko；来源机构：Wikimedia Commons / Museo Archeologico Nazionale di Tarquinia；许可提示：个人/学习用途允许，其他用途（尤其商业再利用）须另行获得意大利文化遗产主管部门授权；[CC BY 3.0；另受意大利文化遗产再利用授权限制](https://commons.wikimedia.org/wiki/File:Pittore_forse_attico,_affreschi_della_tomba_del_triclinio,_500-475_ac_ca,_01.jpg) |
| 33 | `ap33-niobides-krater` | Niobides Krater | greece | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 18–19 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Niobid_Krater_-_Niobid_massacre.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Niobid_Krater_-_Niobid_massacre.jpg) | 摄影：Seudo；来源机构：Wikimedia Commons；[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| 34 | `ap34-doryphoros` | Doryphoros (Spear Bearer) | greece | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 19–20 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Doryphoros.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Doryphoros.jpg) | 摄影者未列；来源机构：Wikimedia Commons；[Public Domain Mark 1.0](https://creativecommons.org/publicdomain/mark/1.0/) |
| 35 | `ap35-athenian-acropolis` | Acropolis | greece | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 15–16 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Acropolis_of_Athens_01361.JPG) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Acropolis_of_Athens_01361.JPG) | 摄影：Glen Larson；来源机构：Wikimedia Commons；[Public Domain Mark 1.0](https://creativecommons.org/publicdomain/mark/1.0/) |
| 36 | `ap36-grave-stele-hegeso` | Grave stele of Hegeso | greece | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 21–22 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:The_Grave_Stele_of_Hegeso_%285th_cent._B.C.%29_at_the_National_Archaeological_Museum_on_3_April_2018.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/The_Grave_Stele_of_Hegeso_%285th_cent._B.C.%29_at_the_National_Archaeological_Museum_on_3_April_2018.jpg) | 摄影：George E. Koronaios；来源机构：Wikimedia Commons；[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| 37 | `ap37-winged-victory-samothrace` | Winged Victory of Samothrace | greece | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 22–23 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Louvre_Victoire_de_Samothrace_%28Winged_Victory%29_%289811957165%29.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Louvre_Victoire_de_Samothrace_%28Winged_Victory%29_%289811957165%29.jpg) | 摄影：Gary Todd；来源机构：Wikimedia Commons；[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| 38 | `ap38-great-altar-pergamon` | Great Altar of Zeus and Athena at Pergamon | greece | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 23–24 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Berlin_-_Pergamonmuseum_-_Altar_01.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Berlin_-_Pergamonmuseum_-_Altar_01.jpg) | 摄影：Jan Mehlich（Lestat）；来源机构：Wikimedia Commons；[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| 39 | `ap39-house-of-the-vettii` | House of the Vettii | rome | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 24–25 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:House_of_the_Vettii,_Pompeii,_20230623_133502_34.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/House_of_the_Vettii,_Pompeii,_20230623_133502_34.jpg) | 摄影：Argo Navis；来源机构：Wikimedia Commons；[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| 40 | `ap40-alexander-mosaic` | Alexander Mosaic from the House of Faun, Pompeii | rome | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 25–26 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Alexander_%28Battle_of_Issus%29_Mosaic.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Alexander_%28Battle_of_Issus%29_Mosaic.jpg) | 来源机构：Wikimedia Commons / art database；[Public Domain Mark 1.0](https://creativecommons.org/publicdomain/mark/1.0/) |
| 41 | `ap41-seated-boxer` | Seated boxer | greece | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 25–26 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Seated_Boxer_%2836466552736%29.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Seated_Boxer_%2836466552736%29.jpg) | 摄影：Bradley Weber；来源机构：Wikimedia Commons；[CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) |
| 42 | `ap42-head-of-a-roman-patrician` | Head of a Roman patrician | rome | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 26–27 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Patrizio_Torlonia.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Patrizio_Torlonia.jpg) | 19 世纪出版物扫描，作者不详；来源机构：Wikimedia Commons；[Public Domain Mark 1.0](https://creativecommons.org/publicdomain/mark/1.0/) |
| 43 | `ap43-augustus-prima-porta` | Augustus of Prima Porta | rome | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 26–27 | [Wikimedia Commons / Vatican Museums](https://commons.wikimedia.org/wiki/File:Augustus_of_Prima_Porta_(inv._2290).jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Augustus_of_Prima_Porta_(inv._2290).jpg) | 摄影：Joel Bellviure；来源机构：Wikimedia Commons / Vatican Museums；[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| 44 | `ap44-colosseum` | Colosseum (Flavian Amphitheater) | rome | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 26–27 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Colosseum_-_Rome.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Colosseum_-_Rome.jpg) | 摄影：Mattia.masala；来源机构：Wikimedia Commons；[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| 45 | `ap45-forum-of-trajan` | Forum of Trajan | rome | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 27–28 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Foro_Traiano_dal_Vittoriano_Roma_sera.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Foro_Traiano_dal_Vittoriano_Roma_sera.jpg) | 摄影：Wolfgang Moroder；来源机构：Wikimedia Commons；[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| 46 | `ap46-pantheon` | Pantheon | rome | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, pp. 28–29 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Interior_oculus_of_the_Rome_Pantheon.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Interior_oculus_of_the_Rome_Pantheon.jpg) | 摄影：T. Le Berre；来源机构：Wikimedia Commons；[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| 47 | `ap47-ludovisi-battle-sarcophagus` | Ludovisi Battle Sarcophagus | rome | [College Board AP Art History CED](https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf) | APAH notes.pdf, p. 29 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Grande_Ludovisi_Altemps_Inv8574.jpg) | [direct](https://commons.wikimedia.org/wiki/Special:Redirect/file/Grande_Ludovisi_Altemps_Inv8574.jpg) | 摄影署名：Jastrow（2006）；来源机构：Wikimedia Commons；[Public Domain Mark 1.0](https://creativecommons.org/publicdomain/mark/1.0/) |
