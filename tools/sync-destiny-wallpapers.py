"""Copy the p(bloom) 16:9 masters into the blog gallery, in the gallery's order.
Usage: python3 tools/sync-destiny-wallpapers.py /path/to/omarchy-destiny-theme
Then run tools/prepare-film-images.py for the display copies and ink masks."""
import json, shutil, sys
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]; THEME = Path(sys.argv[1])
G = ROOT / 'site/public/gallery/destiny'; data = ROOT / 'site/src/data/destiny-gallery.json'
gallery = json.loads(data.read_text())
for w in gallery:
    slug = Path(w['src']).stem.split('-', 1)[1]
    src, = THEME.glob(f'backgrounds/*-{slug}.webp')
    assert Image.open(src).size == (5120, 2880), src
    name = src.name; shutil.copyfile(src, G / name)
    Image.open(src).convert('RGB').resize((1600, 900), Image.LANCZOS).save(G / 'thumbs' / name, quality=80, method=6)
    w['src'], w['thumb'] = f'/gallery/destiny/{name}', f'/gallery/destiny/thumbs/{name}'
data.write_text(json.dumps(gallery, indent=1) + '\n')
print(f'{len(gallery)} masters copied from {THEME}/backgrounds')
