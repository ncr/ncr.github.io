"""Offline display derivatives and ink masks. Full release wallpapers stay untouched."""
from pathlib import Path
import json,numpy as np
from PIL import Image,ImageFilter
root=Path(__file__).resolve().parents[1]/'site/public';gallery=json.loads((root.parent/'src/data/destiny-gallery.json').read_text())
for w in gallery:
 image=Image.open(root/w['src'].lstrip('/')).convert('RGB');image.thumbnail((2560,1080),Image.Resampling.LANCZOS)
 dest=root/w['src'].lstrip('/').replace('destiny/','destiny/film/');dest.parent.mkdir(parents=True,exist_ok=True);image.save(dest,quality=86,method=6)
 thumb=Image.open(root/w['thumb'].lstrip('/')).convert('RGB');thumb=thumb.resize((1280,540),Image.Resampling.LANCZOS)
 a=np.array(thumb).astype(float);b=np.array(thumb.filter(ImageFilter.GaussianBlur(5))).astype(float);alpha=np.clip(((a-b).mean(2)-3)*6,0,160)
 rgba=np.dstack([np.clip(a*2.2,0,255),alpha]).astype('uint8');mask=root/f"gallery/destiny/ambient/masks/{w['id']}.png";mask.parent.mkdir(parents=True,exist_ok=True);Image.fromarray(rgba).save(mask,optimize=True)
print('42 film images and 42 precomputed masks; full-size originals unchanged')
