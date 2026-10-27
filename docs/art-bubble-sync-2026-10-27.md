# Art History / APWH bubble style alignment

Applied the existing APWH study-place visual language to the art module only: light paper background, 1px border, 11px radius, blue circular AP number, two text lines, and matching pale-teal selected state. The second line shows the Chinese artwork title and entry hint rather than an invented study-point count.

Both unlocated-work entries and compact expanded map work lists use the style. Accessible names retain AP numbers and English titles; selected state is exposed through aria-pressed. SVG map markers are unchanged. No artwork content or sibling repositories changed.

Verification: 494 Node tests pass; build produces 215 files. Desktop interaction checked on AP230 and AP241; mobile layout checked without horizontal overflow. No commit or push.
