# Art typography consistency

Approved scope: All Units overview, Units 1–10 study panels, artwork detail, comparison and learning controls. Keep the existing shared font stack, map label geometry and course content.

Use the existing shared scale: primary headings 19px/800/1.3; section and card headings 13.5px/700/1.55; body and Unit English subtitles 13.5px/600/1.55; metadata 12px/600/1.55; controls 12.5px/700/1.35. Eyebrows and AP labels use 12px/700 and 0.04em spacing. Text controls use at least 44px click targets. Map zoom and pin geometry retain their existing behavior.

Implement through the existing map-ui.css tokens so native and newly added panels cannot drift. Version the stylesheet URL for existing clients. Verify computed styles in overview, Unit and artwork detail, all ten Units, comparison, and mobile reading with no horizontal overflow; run existing release tests and build.

Validation: all ten Unit headings/subtitles match the shared computed sizes; overview, native artwork details and comparison checked. At 390px, AP61 long title wraps without document overflow (390px), and comparison dialog scrollWidth equals clientWidth. 520 Node tests, 10 Python tests and the 219-file public build passed.
