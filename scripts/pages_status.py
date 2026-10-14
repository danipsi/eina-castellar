"""Marca també els timeouts del capturador, sense tocar l’últim catàleg."""
import json
from pathlib import Path

from ingest import atomic_json, stamp, validate


def mark_failure(root):
    directory = root / 'public' / 'data'
    # No publicar un web sense una captura anterior vàlida.
    validate(json.loads((directory / 'catalog.json').read_text(encoding='utf-8')))
    atomic_json(directory / 'status.json', {
        'status': 'error',
        'attemptedAt': stamp(),
        'message': 'Captura aturada. Es conserva l’últim catàleg vàlid.',
    })


if __name__ == '__main__':
    mark_failure(Path(__file__).resolve().parents[1])
