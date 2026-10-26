"""Publish the explicit art module boundary, excluding tests, drafts and private media."""
from pathlib import Path
import shutil
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / '_site'
if OUTPUT.exists(): shutil.rmtree(OUTPUT)
OUTPUT.mkdir()
files = [ROOT / name for name in ['index.html', 'art-history-map.html', 'module-bridge.mjs', 'assets/map-ui.css']]
files.extend(sorted((ROOT / 'assets/art-history').rglob('*.webp')))
files.extend(sorted((ROOT / 'data').glob('ap-art-history-*.json')))
for source in files:
    if source.is_symlink(): raise ValueError(f'Symlink not permitted: {source.name}')
    target = OUTPUT / source.relative_to(ROOT)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)
(OUTPUT / '.nojekyll').touch()
print(f'Built independent art module: {len(files)} public files')
