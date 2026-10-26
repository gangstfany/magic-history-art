import copy
import json
from pathlib import Path
import tempfile
import unittest

from scripts.serve_art_history_study import make_study_html


class StudyServerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.asset = self.root / '.private-media/complete/u6/ap173-primary.webp'
        self.asset.parent.mkdir(parents=True)
        self.asset.write_bytes(b'test-image')
        self.works = [{'id': 'ap173-test', 'images': [{'id': 'primary', 'imageUrl': None, 'mediaStatus': 'unverified'}]},
                      {'id': 'ap172-open', 'images': [{'id': 'primary', 'imageUrl': 'assets/open.webp'}]}]
        self.credits = {'ap173-test': {'creatorOrInstitution': 'Original'}, 'ap172-open': {'creatorOrInstitution': 'Open author'}}
        self.html = '<style>unchanged</style><script id="artwork-data" type="application/json">' + json.dumps(self.works) + '</script><script id="image-credit-data" type="application/json">' + json.dumps(self.credits) + '</script><script>unchanged()</script>'
        self.row = {'workId': 'ap173-test', 'viewId': 'primary', 'filePath': '.private-media/complete/u6/ap173-primary.webp',
                    'sourcePage': 209, 'sourceImage': 'Im0.jpg', 'creatorOrInstitution': 'CED photographer',
                    'identityNote': 'Exact full image frame'}

    def test_local_response_fills_missing_view_without_mutating_input_or_public_view(self):
        original = copy.deepcopy(self.works)
        result, report = make_study_html(self.html, [self.row], self.root)
        self.assertEqual(self.works, original)
        self.assertIn('assets/open.webp', result)
        self.assertIn(self.row['filePath'], result)
        self.assertIn('Local study copy', result)
        self.assertIn('<style>unchanged</style>', result)
        self.assertIn('<script>unchanged()</script>', result)
        self.assertEqual(report['filledViews'], 1)
        self.assertEqual(report['missingViews'], 0)

    def test_rejects_incomplete_duplicate_or_unknown_views(self):
        for rows in [[], [self.row, self.row], [{**self.row, 'workId': 'wrong'}]]:
            with self.subTest(rows=rows), self.assertRaises(ValueError):
                make_study_html(self.html, rows, self.root)

    def test_rejects_missing_file_or_nonprivate_path(self):
        for path in ['.private-media/missing.webp', 'assets/open.webp', '.private-media/../../outside.webp']:
            with self.subTest(path=path), self.assertRaises(ValueError):
                make_study_html(self.html, [{**self.row, 'filePath': path}], self.root)

    def test_explicit_failed_remote_fallback_is_local_without_changing_required_coverage(self):
        html = self.html.replace('assets/open.webp', 'https://example.test/broken.jpg')
        fallback = {**self.row, 'workId': 'ap172-open', 'replaceRemote': True}
        result, report = make_study_html(html, [self.row, fallback], self.root)
        self.assertNotIn('https://example.test/broken.jpg', result)
        self.assertEqual(report['filledViews'], 1)
        self.assertEqual(report['remoteReplacements'], 1)
        with self.assertRaises(ValueError):
            make_study_html(html, [self.row, {**fallback, 'replaceRemote': False}], self.root)

    def test_existing_legacy_view_without_an_id_is_preserved(self):
        html = self.html.replace('"id": "primary", "imageUrl": "assets/open.webp"', '"label": "Primary view", "imageUrl": "assets/open.webp"')
        result, report = make_study_html(html, [self.row], self.root)
        self.assertIn('assets/open.webp', result)
        self.assertEqual(report['missingViews'], 0)

    def test_remote_fallback_supports_legacy_single_image_field(self):
        html = self.html.replace('"images": [{"id": "primary", "imageUrl": "assets/open.webp"}]', '"imageUrl": "https://example.test/broken.jpg"')
        result, report = make_study_html(html, [self.row, {**self.row, 'workId': 'ap172-open', 'replaceRemote': True}], self.root)
        self.assertNotIn('https://example.test/broken.jpg', result)
        self.assertEqual(report['remoteReplacements'], 1)


if __name__ == '__main__':
    unittest.main()
