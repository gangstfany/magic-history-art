"""Integrate the approved archive into the release without changing authored data.

Only restoredViews are published; existing remote views and the seven archived
fallbacks remain unchanged. Source credit/usage statements are not open licenses.
"""
import copy
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import urlsplit

CED_URL = 'https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf'


def prepare_study_media(html, manifest, root):
    root = Path(root).resolve()
    if manifest.get('visibility') != 'public' or manifest.get('publicationAuthorizedOn') != '2026-10-27':
        raise ValueError('Expected the explicitly approved public archive')
    patterns = {name: re.compile(r'(<script id="' + name + r'"[^>]*>)([\s\S]*?)(</script>)')
                for name in ('artwork-data', 'image-credit-data')}
    data = {}
    for name, pattern in patterns.items():
        match = pattern.search(html)
        if not match:
            raise ValueError('Missing data block: ' + name)
        data[name] = json.loads(match[2])
    works, credits = data['artwork-data'], data['image-credit-data']
    views = {}
    for work in works:
        for index, view in enumerate(work.get('images', [work])):
            view_id = (view.get('id') or ('primary' if index == 0 else f'view-{index + 1}')) if 'images' in work else 'primary'
            key = work['id'] + '::' + view_id
            if key in views:
                raise ValueError('Duplicate authored view: ' + key)
            views[key] = (work, index, view)
    missing = {key for key, (_, _, view) in views.items() if view.get('imageUrl') is None}
    selected, seen, paths = {}, set(), set()
    for row in manifest['images']:
        key = row['workId'] + '::' + row['viewId']
        if key not in views or key in seen:
            raise ValueError('Unknown or duplicate archive view: ' + key)
        seen.add(key)
        if row['group'] == 'remoteFallbacks':
            continue
        if row['group'] != 'restoredViews' or key not in missing:
            raise ValueError('Only missing views may be restored: ' + key)
        relative = row['filePath']
        if not re.fullmatch(r'study-media/(?:[a-zA-Z0-9_-]+/)*[a-zA-Z0-9_-]+\.(?:webp|jpg|jpeg|png)', relative):
            raise ValueError('Unsafe archive path: ' + key)
        asset = root / relative
        # Reject symlinks in every component, including links back into the archive.
        if any(path.is_symlink() for path in [asset, *asset.parents] if path != root and path.is_relative_to(root)):
            raise ValueError('Archive symlink: ' + key)
        if not asset.resolve().is_relative_to(root / 'study-media') or not asset.is_file() or relative in paths:
            raise ValueError('Missing or duplicate archive file: ' + key)
        content = asset.read_bytes()
        if not content or len(content) != row['bytes'] or hashlib.sha256(content).hexdigest() != row['sha256']:
            raise ValueError('Archive hash or size mismatch: ' + key)
        for field in ('creatorOrInstitution', 'useStatement'):
            if not isinstance(row.get(field), str) or not row[field].strip():
                raise ValueError('Missing attribution ' + field + ': ' + key)
        source = row.get('sourceUrl') or CED_URL + (f"#page={row['sourcePage']}" if row.get('sourcePage') else '')
        url = urlsplit(source)
        if url.scheme != 'https' or not url.netloc or url.username or url.password:
            raise ValueError('Invalid source URL: ' + key)
        selected[key] = (row, source)
        paths.add(relative)
    if set(selected) != missing:
        raise ValueError('Archive does not cover exactly the missing views')
    for key, (row, source) in selected.items():
        work, index, view = views[key]
        view['imageUrl'] = row['filePath']
        if row.get('imageAlt'):
            view['imageAlt'] = row['imageAlt']
        else:
            # Remove obsolete availability notices, retaining the original
            # view description and its historical/contextual qualifications.
            alt = re.sub(r'^Required view,? currently unavailable:\s*', '', view['imageAlt'])
            view['imageAlt'] = alt.replace('; image withheld', '').replace('；图像暂缺', '')
        view.pop('mediaStatus', None)
        page = row.get('sourcePage')
        view['imageSourceName'] = '学习图片 · ' + (f'AP Art History CED PDF p.{page}' if page else '原始出处')
        view['imageSourceUrl'] = source
        credit = {'creatorOrInstitution': row['creatorOrInstitution'],
                  'licenseName': row['useStatement'], 'licenseUrl': source}
        if len(work.get('images', [work])) == 1:
            credits[work['id']] = credit
        else:
            current = credits[work['id']]
            if not isinstance(current, list):
                current = [copy.deepcopy(current) for _ in work['images']]
                credits[work['id']] = current
            current[index] = credit
    for name, pattern in patterns.items():
        serialized = json.dumps(data[name], ensure_ascii=False, indent=2).replace('<', '\\u003c')
        html = pattern.sub(lambda match: match[1] + '\n' + serialized + '\n' + match[3], html, count=1)
    return html, sorted(paths)
