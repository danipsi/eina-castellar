import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).parents[1] / 'scripts'))
from pages_status import mark_failure


class PagesStatusTest(unittest.TestCase):
    def test_timeout_preserves_catalog_and_previous_changes(self):
        record = {'id': 'prova', 'url': 'https://example.org/font', 'capturedAt': '2026-10-13'}
        catalog = {
            'contracts': [record], 'sessions': [record], 'budget': [], 'events': [],
            'changes': [{'description': 'Canvi anterior'}],
        }
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            data = root / 'public/data'
            data.mkdir(parents=True)
            path = data / 'catalog.json'
            path.write_text(json.dumps(catalog), encoding='utf-8')
            original = path.read_bytes()
            mark_failure(root)
            self.assertEqual(path.read_bytes(), original)
            self.assertEqual(json.loads((data / 'status.json').read_text(encoding='utf-8'))['status'], 'error')

    def test_no_publication_without_valid_previous_catalog(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            with self.assertRaises(FileNotFoundError):
                mark_failure(root)
            self.assertFalse((root / 'public/data/status.json').exists())


if __name__ == '__main__':
    unittest.main()
