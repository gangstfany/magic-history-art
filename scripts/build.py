"""Publish the explicit art module boundary, excluding tests, drafts and private media."""
from pathlib import Path
import json
import shutil
from publish_study_media import prepare_study_media
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / '_site'
# Validate the explicit archive and prepare the page before replacing a release.
page, study_assets = prepare_study_media(
    (ROOT / 'art-history-map.html').read_text(),
    json.loads((ROOT / 'study-media/manifest.json').read_text()), ROOT
)
if OUTPUT.exists(): shutil.rmtree(OUTPUT)
OUTPUT.mkdir()
files = [ROOT / name for name in ['index.html', 'art-history-map.html', 'module-bridge.mjs', 'art-comparison.mjs', 'assets/map-ui.css', 'assets/art-comparison.css']]
files.extend(sorted((ROOT / 'assets/art-history').rglob('*.webp')))
files.extend(sorted((ROOT / 'data').glob('ap-art-history-*.json')))
files.extend(ROOT / asset for asset in study_assets)
for source in files:
    if source.is_symlink(): raise ValueError(f'Symlink not permitted: {source.name}')
    target = OUTPUT / source.relative_to(ROOT)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)
(OUTPUT / 'art-history-map.html').write_text(page)
(OUTPUT / '.nojekyll').touch()
print(f'Built independent art module: {len(files)} public files')
