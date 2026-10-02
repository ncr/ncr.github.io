#!/usr/bin/env python3
"""Images of the p(bloom) post made from the theme's release renders.

    python3 scripts/pbloom_assets.py /path/to/omarchy-p-bloom-theme

- cmp-res-native / cmp-res-stretched: the same part of Fusion Transport (the nozzle and its labels) on a 5K 16:9 screen,
  from the native 5K file and from the 1080p file stretched to 5K (1400 x 788, 1:1 screen pixels)
- cmp-comp-cropped / cmp-comp-composed: a 21:9 5K screen, the 16:9 file cropped to fill it vs the 21:9 composition
- caption-tether-climber: Tether Climber's legend from the 5K 16:9 file, with a margin
"""
import json
from pathlib import Path
import subprocess
import sys

from PIL import Image

theme = Path(sys.argv[1]).resolve()
out = Path(__file__).resolve().parents[1]/'site/public/draft-assets/destiny'
rel = theme/'dist/wallpaper-release'
fusion = '03-fusion-transport.webp'

native = Image.open(theme/'backgrounds'/fusion).convert('RGB')                     # 16:9, 5120 x 2880
small = Image.open(rel/'16x9-1080p'/fusion).convert('RGB').resize(native.size, Image.BICUBIC)
# the same part in both: the nozzle and its labels (Magnetic nozzle to Droplet collector). The 1080p sheet is composed
# for its own screen, so that part sits elsewhere and a little larger; each crop is centred on it, 1:1 on the 5K screen
def around(cx, cy):
    return (cx - 700, cy - 394, cx + 700, cy + 394)
native.crop(around(3024, 1120)).save(out/'cmp-res-native.webp', quality=94, method=6)
small.crop(around(4288, 1200)).save(out/'cmp-res-stretched.webp', quality=94, method=6)

wide = Image.open(rel/'64x27-2160p'/fusion).convert('RGB')                          # 21:9, 5120 x 2160
for name, im in (('cmp-comp-cropped', native.crop((0, 360, 5120, 2520))), ('cmp-comp-composed', wide)):
    im.resize((2400, 1013), Image.LANCZOS).save(out/(name+'.webp'), quality=92, method=6)

# the legend's place on the 5K sheet: the bright ink in the bottom-left quarter (the 5K master is rendered
# directly, not through a composed profile, so there is no block map for it)
import numpy as np
tether_rgb = Image.open(theme/'backgrounds/09-tether-climber.webp').convert('RGB')
a = np.asarray(tether_rgb).astype(int)
W, H = tether_rgb.size
top, bottom, left = int(H*.68), int(H*.925), int(W*.03)      # above the frame's ruler, right of its corner mark
region = a[top:bottom, left:int(W*.36)]
ink = (region.max(axis=2) - np.median(region.reshape(-1, 3), axis=0).max()) > 70
ys, xs = np.nonzero(ink)
x0, y0, x1, y1 = left+xs.min(), top+ys.min(), left+xs.max(), top+ys.max()
tether = Image.open(theme/'backgrounds/09-tether-climber.webp').convert('RGB')
m = 64
crop = tether.crop((max(0, x0-m), max(0, y0-m), min(tether.width, x1+m), min(tether.height, y1+m)))
crop.save(out/'caption-tether-climber.webp', quality=92, method=6)
print('caption', crop.size)
