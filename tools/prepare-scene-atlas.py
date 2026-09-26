"""Pack the 42 existing wallpapers and their source contours; no new artwork.

The shuffled Hamiltonian route makes each musical cut a N/E/S/W neighbour.
All layout, contour selection and entry-camera sampling happen before playback.
"""
import array, hashlib, io, json, math, random, struct
from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((root/p).read_text())
gallery=read('site/src/data/destiny-gallery.json')
grid=read('site/src/data/music-grid.json');score=read('site/src/data/drawing-score.json')
film=read('site/src/data/film-assets.json')
seed=420926;rng=random.Random(seed);cols,rows=7,6
neighbours=lambda i:[j for j in (i-cols,i+1,i+cols,i-1) if 0<=j<42 and abs(j%cols-i%cols)+abs(j//cols-i//cols)==1]
def walk(path,seen):
 if len(path)==42:return path
 candidates=[j for j in neighbours(path[-1]) if j not in seen]
 rng.shuffle(candidates);candidates.sort(key=lambda j:sum(k not in seen for k in neighbours(j)))
 for j in candidates:
  result=walk(path+[j],seen|{j})
  if result:return result
route=walk([0],{0});assert route and len(set(route))==42
# Reflect the route as a whole without destroying adjacency.
route=[(rows-1-i//cols)*cols+(cols-1-i%cols) for i in route]
featured=[p['id'] for p in grid['phrases']];others=[w['id'] for w in gallery if w['id'] not in featured];rng.shuffle(others)
cellById=dict(zip(featured+others,route));tileW=2560/1080;pitchX=tileW+.20;pitchY=1.16
tw,th,pad=512,216,2;aw=(tw+2*pad)*cols;ah=(th+2*pad)*rows
atlas=Image.new('RGB',(aw,ah));tiles=[];lines=array.array('f')
for index,w in enumerate(gallery):
 image=Image.open(root/('site/public'+w['thumb'])).convert('RGB').resize((tw,th),Image.Resampling.LANCZOS)
 tx=index%cols*(tw+2*pad);ty=index//cols*(th+2*pad)
 atlas.paste(image,(tx+pad,ty+pad))
 for side,box,at,size in [('left',(0,0,1,th),(tx,ty+pad),(pad,th)),('right',(tw-1,0,tw,th),(tx+pad+tw,ty+pad),(pad,th)),('top',(0,0,tw,1),(tx+pad,ty),(tw,pad)),('bottom',(0,th-1,tw,th),(tx+pad,ty+pad+th),(tw,pad))]:
  atlas.paste(image.crop(box).resize(size),(at))
 cell=cellById[w['id']];cx=(cell%cols-3)*pitchX;cy=(2.5-cell//cols)*pitchY
 sourcePath='site/public/gallery/destiny/drawing/'+w['id']+'.json';source=read(sourcePath);reg=source['registration']
 def length(s):return sum(math.dist(a,b) for a,b in zip(s['p'],s['p'][1:]))
 paths=sorted((s for s in source['strokes'] if not any(n in s['name'].lower() for n in ['ground','soil','shadow'])),key=length,reverse=True)[:64]
 for n,s in enumerate(paths):
  points=s['p'];distances=[0.]
  for a,b in zip(points,points[1:]):distances.append(distances[-1]+math.dist(a,b))
  total=distances[-1]
  if total<1:continue
  count=min(32,max(2,math.ceil(total/7)));sampled=[];j=1
  for k in range(count):
   distance=total*k/(count-1)
   while j<len(points)-1 and distances[j]<distance:j+=1
   u=(distance-distances[j-1])/max(1e-8,distances[j]-distances[j-1]);a,b=points[j-1],points[j]
   x=a[0]+(b[0]-a[0])*u;y=a[1]+(b[1]-a[1])*u
   sampled.append((cx+((reg['center'][0]+x*reg['unit'])/2560-.5)*tileW,cy+.5-(reg['center'][1]-y*reg['unit'])/1080,.002,k/(count-1),(index*.618+n*.037)%1,index))
  for a,b in zip(sampled,sampled[1:]):lines.extend(a);lines.extend(b)
 tiles.append(dict(id=w['id'],index=index,cell=cell,x=cx,y=cy,film=w['src'].replace('/destiny/','/destiny/film/'),uv=[(tx+pad)/aw,1-(ty+pad+th)/ah,(tx+pad+tw)/aw,1-(ty+pad)/ah],source=sourcePath,sourceSHA256=hashlib.sha256((root/sourcePath).read_bytes()).hexdigest()))
bridges=[]
for previous,current in zip(grid['phrases'],grid['phrases'][1:]):
 entry=None
 if current['id']=='o10':
  # This is the full dinner orbit, not the obsolete lamp-only drawing camera.
  # Keep the table and lamp in the arrival crop while the spatial view takes over.
  entry=dict(x=.50,y=.34,w=.30,h=.60,roll=0,spatial=True)
 elif current['kind']=='drawing':
  plan=next(s for s in score if s.get('phrase')==current['firstBeat']//16)
  base=film[current['id']];meta=read('site/public'+base+'.json');buffer=(root/('site/public'+base+'.bin')).read_bytes();p=meta['plans'][str(plan['start'])]
  frame=plan['beats'][2]*p['cameraFPS'];i=int(frame);u=frame-i;offset=p['camera']['offset']
  a=struct.unpack_from('<7f',buffer,(offset+i*7)*4);b=struct.unpack_from('<7f',buffer,(offset+(i+1)*7)*4);pose=[x+(y-x)*u for x,y in zip(a,b)]
  reg=meta['registration'];entry=dict(x=(reg['center'][0]+pose[3]*reg['unit'])/2560,y=(reg['center'][1]-pose[4]*reg['unit'])/1080,range=pose[2],size=meta['size'],unit=reg['unit'],roll=-pose[6]*180/math.pi)
 else:entry=dict(x=.57,y=.39,w=.23,h=.48,roll=0,spatial=True)
 bridges.append(dict(fromId=previous['id'],toId=current['id'],beats=previous['beats'][14:16]+current['beats'][:3],entry=entry))
imageBytes=io.BytesIO();atlas.save(imageBytes,'WEBP',quality=88,method=6)
packed=imageBytes.getvalue();binary=lines.tobytes();key=hashlib.sha256(packed+binary).hexdigest()[:16];base='/gallery/destiny/film-data/scene-atlas-'+key
(root/('site/public'+base+'.webp')).write_bytes(packed);(root/('site/public'+base+'.bin')).write_bytes(binary)
result=dict(seed=seed,cols=cols,rows=rows,tileWidth=tileW,pitchX=pitchX,pitchY=pitchY,base=base,lineVertices=len(lines)//6,tiles=tiles,bridges=bridges)
(root/'site/src/data/scene-atlas.json').write_text(json.dumps(result,indent=2)+'\n')
print('Atlas:',len(tiles),'tiles;',len(bridges),'cardinal moves;',len(lines)//6,'line vertices;',round(len(packed)/1024),'KiB image;',round(len(binary)/1024),'KiB contours')
