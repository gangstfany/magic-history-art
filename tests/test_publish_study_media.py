import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('publish_study_media', ROOT / 'scripts/publish_study_media.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)


def block(html, name):
    return json.loads(re.search(r'<script id="' + name + r'"[^>]*>([\s\S]*?)</script>', html)[1])


def views(works):
    return {work['id'] + '::' + (view.get('id') or ('primary' if index == 0 else f'view-{index + 1}')): view
            for work in works for index, view in enumerate(work.get('images', [dict(work, id='primary')]))}


class PublicStudyMediaTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / 'art-history-map.html').read_text()
        cls.manifest = json.loads((ROOT / 'study-media/manifest.json').read_text())

    def test_fills_exactly_the_74_missing_views_and_retains_307_existing_views(self):
        result, files = publisher.prepare_study_media(self.html, self.manifest, ROOT)
        before = views(block(self.html, 'artwork-data'))
        after = views(block(result, 'artwork-data'))
        self.assertEqual(len(files), 74)
        self.assertEqual(len(after), 381)
        self.assertEqual(sum(v.get('imageUrl') is None for v in after.values()), 0)
        restored = {r['workId'] + '::' + r['viewId']: r for r in self.manifest['images'] if r['group'] == 'restoredViews'}
        for key, view in before.items():
            if key in restored:
                row = restored[key]
                self.assertIsNone(view['imageUrl'])
                self.assertEqual(after[key]['imageUrl'], row['filePath'])
                self.assertNotRegex(after[key]['imageAlt'], r'currently unavailable|image withheld|图像暂缺')
                self.assertIn(row['filePath'], files)
                self.assertEqual(hashlib.sha256((ROOT / row['filePath']).read_bytes()).hexdigest(), row['sha256'])
            else:
                self.assertEqual(after[key], view)

    def test_only_changes_media_and_credit_blocks_with_view_specific_attribution(self):
        result, _ = publisher.prepare_study_media(self.html, self.manifest, ROOT)
        strip = lambda text: re.sub(r'(<script id="(?:artwork-data|image-credit-data)"[^>]*>)[\s\S]*?(</script>)', r'\1\2', text)
        self.assertEqual(strip(result), strip(self.html))
        before = block(self.html, 'artwork-data')
        after = block(result, 'artwork-data')
        media_fields = {'images', 'imageUrl', 'imageAlt', 'imageSourceName', 'imageSourceUrl', 'mediaStatus'}
        for a, b in zip(before, after):
            self.assertEqual({k: v for k, v in a.items() if k not in media_fields},
                             {k: v for k, v in b.items() if k not in media_fields})
        credits = block(result, 'image-credit-data')
        by_id = {w['id']: w for w in after}
        for row in self.manifest['images']:
            if row['group'] != 'restoredViews':
                continue
            work = by_id[row['workId']]
            images = work.get('images', [dict(work, id='primary')])
            index = next(i for i, v in enumerate(images) if v.get('id', 'primary') == row['viewId'])
            credit = credits[work['id']]
            credit = credit[index] if isinstance(credit, list) else credit
            self.assertEqual(credit['creatorOrInstitution'], row['creatorOrInstitution'])
            self.assertIn('No new open-license claim', credit['licenseName'])
            self.assertEqual(credit['licenseName'], row['useStatement'])
            self.assertTrue(images[index]['imageSourceUrl'].startswith('https://'))
            if row.get('sourcePage'):
                self.assertIn(str(row['sourcePage']), images[index]['imageSourceName'])
            if row.get('imageAlt'):
                self.assertEqual(images[index]['imageAlt'], row['imageAlt'])

    def test_rejects_unknown_duplicate_changed_or_unsafe_entries(self):
        for key, value in [('workId', 'unknown'), ('viewId', 'wrong'), ('filePath', 'study-media/../README.md'),
                           ('sha256', '0' * 64), ('bytes', 1), ('sourceUrl', 'javascript:alert(1)')]:
            manifest = copy.deepcopy(self.manifest)
            manifest['images'][0][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                publisher.prepare_study_media(self.html, manifest, ROOT)
        manifest = copy.deepcopy(self.manifest)
        manifest['images'].append(manifest['images'][0])
        with self.assertRaises(ValueError):
            publisher.prepare_study_media(self.html, manifest, ROOT)

    def test_rejects_incomplete_manifest_and_existing_image_overwrite(self):
        manifest = copy.deepcopy(self.manifest)
        manifest['images'] = manifest['images'][1:]
        with self.assertRaises(ValueError):
            publisher.prepare_study_media(self.html, manifest, ROOT)
        manifest = copy.deepcopy(self.manifest)
        row = next(r for r in manifest['images'] if r['group'] == 'remoteFallbacks')
        row['group'] = 'restoredViews'
        with self.assertRaises(ValueError):
            publisher.prepare_study_media(self.html, manifest, ROOT)


if __name__ == '__main__':
    unittest.main()
