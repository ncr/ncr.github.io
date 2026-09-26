"""Export real release vectors for the music video; no tracing of raster images.
Usage: python3 tools/export-drawing-strokes.py /path/to/omarchy-destiny-theme
Requires Pillow only for sampling the existing wallpaper's paper colour.
"""
import collections, hashlib, json, math, statistics, subprocess, sys
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]; REPO=Path(sys.argv[1]); COMMIT='f4a51dd'
out=ROOT/'site/public/gallery/destiny/drawing';out.mkdir(parents=True,exist_ok=True)
manifest=[]
def stitch(paths):
 groups=collections.defaultdict(list);result=[]
 for p in paths:groups[(p['name'],p['role'])].append(p)
 for (name,role),parts in groups.items():
  adj=collections.defaultdict(list)
  for i,p in enumerate(parts):
   adj[tuple(p['p'][0])].append((i,0));adj[tuple(p['p'][-1])].append((i,1))
  unused=set(range(len(parts)))
  # Open endpoints before closed cycles; do not bridge branches or semantic parts.
  starts=[(i,j) for i,p in enumerate(parts) for j,q in enumerate([p['p'][0],p['p'][-1]]) if len(adj[tuple(q)])!=2]
  starts.extend((i,0) for i in range(len(parts)))
  for edge,start in starts:
   if edge not in unused:continue
   points=[]
   while edge in unused:
    unused.remove(edge);part=parts[edge]['p'];part=part if start==0 else list(reversed(part));points.extend(part if not points else part[1:])
    junction=tuple(part[-1]);nxt=[(i,e) for i,e in adj[junction] if i in unused]
    if len(adj[junction])!=2 or len(nxt)!=1:break
    edge,start=nxt[0]
   result.append(dict(name=name,role=role,p=points))
 return result
def total(ps):return sum(math.dist(a,b) for p in ps for a,b in zip(p['p'],p['p'][1:]))
def simplify(pts):
 if len(pts)<=2:return pts
 a,b=pts[0],pts[-1];dx,dy=b[0]-a[0],b[1]-a[1];den=dx*dx+dy*dy
 ds=[]
 for p in pts[1:-1]:
  t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den)) if den else 0
  ds.append(math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy))
 m=max(ds)
 if m<.035:return [a,b]
 i=ds.index(m)+1;return simplify(pts[:i+1])[:-1]+simplify(pts[i:])
for w in json.loads((ROOT/'site/src/data/destiny-gallery.json').read_text()):
 slug=Path(w['src']).stem.split('-',1)[1]
 src='tools/assets/century/'+slug+'-A.json' if w['id'][0]=='c' else 'tools/assets/hardware-family/'+slug+'.json'
 src={'o01':'tools/assets/radial-quantum/main.json','o10':'tools/assets/hardware-family/truth-lamp-head.json','o13':'tools/assets/mannequin3d/proxy.json','o14':'tools/assets/mannequin3d/presence.json'}.get(w['id'],src)
 raw=subprocess.check_output(['git','-C',str(REPO),'show',COMMIT+':'+src]);data=json.loads(raw);paths=[]
 for p in data['paths']:
  pts=[]
  for q in p['points']:
   q=[round(q[0],2),round(q[1],2)]
   if not pts or q!=pts[-1]:pts.append(q)
  if len(pts)>1:paths.append(dict(name=p['name'],role=p.get('role',p.get('kind','structure')),p=pts))
 joined=stitch(paths);assert abs(total(paths)-total(joined))<1e-5
 coords=[q for p in joined for q in p['p']];xs,ys=zip(*coords);cx=(min(xs)+max(xs))/2;cy=(min(ys)+max(ys))/2;scale=600/max(max(xs)-min(xs),max(ys)-min(ys))
 for p in joined:p['p']=[[round((q[0]-cx)*scale,2),round((cy-q[1])*scale,2)] for q in simplify(p['p'])]
 joined=[p for p in joined if total([p])>.12]
 im=Image.open(ROOT/'site/public'/w['thumb'].lstrip('/')).convert('RGB');pixels=[im.getpixel((int(im.width*x),int(im.height*y))) for x in [.06,.09,.12,.15] for y in [.1,.15,.2,.25,.75,.8,.85]]
 paper=[round(statistics.median(c)) for c in zip(*pixels)]
 payload=dict(id=w['id'],name=w['name'],size=[round((max(xs)-min(xs))*scale,2),round((max(ys)-min(ys))*scale,2)],paper=paper,strokes=joined)
 target=out/(w['id']+'.json');target.write_text(json.dumps(payload,separators=(',',':'))+'\n')
 manifest.append(dict(id=w['id'],source=src,commit=COMMIT,sourceSHA256=hashlib.sha256(raw).hexdigest(),scope='pendant reflector detail' if w['id']=='o10' else 'main projected source geometry',strokes=len(joined),bytes=target.stat().st_size))
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(len(manifest),'drawings,',sum(x['bytes'] for x in manifest),'bytes; continuity and original line length checked before simplification')
