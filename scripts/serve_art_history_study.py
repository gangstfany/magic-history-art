"""Local-only study preview; public HTML and image-rights data are never written."""
import argparse
import copy
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import re
from urllib.parse import urlsplit

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
SOURCE_URL = 'https://apcentral.collegeboard.org/media/pdf/ap-art-history-course-and-exam-description.pdf'


def data_block(html, name):
    pattern = re.compile(r'(<script id="' + re.escape(name) + r'"[^>]*>)([\s\S]*?)(</script>)')
    match = pattern.search(html)
    if not match:
        raise ValueError('Missing data block: ' + name)
    return pattern, json.loads(match.group(2))


def make_study_html(html, manifest, root):
    root = Path(root).resolve()
    work_pattern, works = data_block(html, 'artwork-data')
    credit_pattern, credits = data_block(html, 'image-credit-data')
    views = {}
    required = set()
    for work in works:
        for index, view in enumerate(work.get('images', [work])):
            view_id = (view.get('id') or ('primary' if index == 0 else f'view-{index + 1}')) if 'images' in work else 'primary'
            key = work['id'] + '::' + view_id
            views[key] = (work, index, view)
            if view.get('imageUrl') is None:
                required.add(key)
    entries = {}
    for row in manifest:
        key = row['workId'] + '::' + row['viewId']
        if key in entries or key not in views:
            raise ValueError('Unknown or duplicate local view: ' + key)
        if key not in required and not (row.get('replaceRemote') is True and str(views[key][2].get('imageUrl', '')).startswith('https://')):
            raise ValueError('Only explicitly audited remote failures may replace an existing image: ' + key)
        relative = row['filePath']
        path = Path(relative)
        if path.is_absolute() or '..' in path.parts or not relative.startswith('.private-media/'):
            raise ValueError('Local study image must stay in .private-media: ' + key)
        asset = (root / path).resolve()
        if not asset.is_relative_to(root / '.private-media') or not asset.is_file() or asset.stat().st_size == 0:
            raise ValueError('Missing or unsafe study asset: ' + key)
        entries[key] = row
    if not required.issubset(entries):
        raise ValueError('Incomplete study image manifest: ' + ', '.join(sorted(required - set(entries))))
    for key, row in entries.items():
        work, index, view = views[key]
        view['imageUrl'] = row['filePath']
        if row.get('imageAlt'):
            view['imageAlt'] = row['imageAlt']
        view.pop('mediaStatus', None)
        page = row.get('sourcePage')
        source = row.get('sourceUrl') or SOURCE_URL + (f'#page={page}' if page else '')
        view['imageSourceName'] = 'Local study copy · ' + (f'CED PDF p.{page}' if page else 'provided study material')
        view['imageSourceUrl'] = source
        credit = {'creatorOrInstitution': row['creatorOrInstitution'],
                  'licenseName': 'Local study copy — public reuse not asserted', 'licenseUrl': source}
        old_credit = credits[work['id']]
        if len(work.get('images', [work])) == 1:
            credits[work['id']] = credit
        else:
            if not isinstance(old_credit, list):
                old_credit = [copy.deepcopy(old_credit) for _ in work['images']]
                credits[work['id']] = old_credit
            old_credit[index] = credit
    html = work_pattern.sub(lambda m: m.group(1) + '\n' + json.dumps(works, ensure_ascii=False, indent=2) + '\n' + m.group(3), html, count=1)
    html = credit_pattern.sub(lambda m: m.group(1) + '\n' + json.dumps(credits, ensure_ascii=False, indent=2) + '\n' + m.group(3), html, count=1)
    return html, {'filledViews': len(required), 'remoteReplacements': len(entries) - len(required), 'missingViews': 0, 'works': len(works), 'localStudyOnly': True}


class StudyHandler(SimpleHTTPRequestHandler):
    study_html = b''
    report = {}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        path = urlsplit(self.path).path
        if any(part in {'.git', '.env', '.aws', '.codex'} for part in Path(path).parts):
            self.send_error(403)
            return
        if path in {'/art-history-map.html', '/__study_status.json'}:
            data = self.study_html if path.endswith('.html') else json.dumps(self.report).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8' if path.endswith('.html') else 'application/json')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        super().do_GET()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=4174)
    args = parser.parse_args()
    manifest = json.loads((REPOSITORY_ROOT / '.private-media/complete/manifest.json').read_text())
    remote_manifest = REPOSITORY_ROOT / '.private-media/complete/remote-fallbacks/manifest.json'
    if remote_manifest.exists():
        manifest.extend(json.loads(remote_manifest.read_text()))
    html, report = make_study_html((REPOSITORY_ROOT / 'art-history-map.html').read_text(), manifest, REPOSITORY_ROOT)
    StudyHandler.study_html = html.encode('utf-8')
    StudyHandler.report = report
    handler = partial(StudyHandler, directory=str(REPOSITORY_ROOT))
    server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
    print(f'Local study homepage: http://127.0.0.1:{args.port}/index.html', flush=True)
    print(json.dumps(report), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
