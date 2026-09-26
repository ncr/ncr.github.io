"""Run with Blender against a checkout/archive of release f4a51dd.
blender -b --python tools/export-truth-dinner.py -- /tmp/release-source
Exports real 3D edge adjacency and an invisible occlusion mesh, never shaded art.
"""
import sys,json,math,struct,hashlib,os
from pathlib import Path
from array import array
source=Path(sys.argv[sys.argv.index('--')+1]);root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(source/'tools/hardware3d'))
import family_core as g
import main_scenes_build as scene
from mathutils import Vector
# Do not write production assets or render new wallpapers.
g.export=lambda *args:None
scene.dinner()
# Display-only LOD: original release geometry and wallpaper files remain untouched.
for obj,role in g.parts:
 if obj.type=='MESH' and len(obj.data.polygons)>220:
  mod=obj.modifiers.new('Film wireframe LOD','DECIMATE');mod.ratio=.12
g.bpy.context.view_layer.update();deps=g.bpy.context.evaluated_depsgraph_get()
original=json.loads((source/'tools/assets/hardware-family/truth-main-scene.json').read_text());points=[q for p in original['paths'] for q in p['points']];xs,ys=zip(*points);cx=(min(xs)+max(xs))/2;cy=(min(ys)+max(ys))/2;scale=min(720/(max(xs)-min(xs)),683/(max(ys)-min(ys)))
a,e=map(math.radians,[-24,25]);right=Vector((math.cos(a),math.sin(a),0));toward=Vector((math.sin(a)*math.cos(e),-math.cos(a)*math.cos(e),math.sin(e)));up=toward.cross(right)
def coord(p):return [p.x*2,(p.z-100)*2,-p.y*2]
def normal(n):return [n.x,n.z,-n.y]
def paper(p):return [(1280+(p.dot(right)-cx)*scale)/2560,(522+(-p.dot(up)-cy)*scale)/1080]
pos=[];pa=[];na=[];nb=[];feature=[];color=[];centres=[];depth=[];depthpaper=[];names=[]
def edge(p,q,n1,n2,sharp,role):
 col=[.79,.68,.5] if role not in ('accent','cable') else [.35,.72,.8]
 mid=(p+q)*.5
 for v in [p,q]:pos.extend(coord(v));pa.extend(paper(v));na.extend(normal(n1));nb.extend(normal(n2));feature.append(sharp);color.extend(col);centres.extend(coord(mid))
for o,role in g.parts:
 if role=='tube':continue
 ob=o.evaluated_get(deps);m=ob.to_mesh();m.calc_loop_triangles();vs=[o.matrix_world@v.co for v in m.vertices];edges={}
 for poly in m.polygons:
  ids=list(poly.vertices);n=sum(((vs[ids[j]]-vs[ids[0]]).cross(vs[ids[j+1]]-vs[ids[0]]) for j in range(1,len(ids)-1)),Vector()).normalized()
  for i,j in zip(ids,ids[1:]+ids[:1]):edges.setdefault(tuple(sorted((i,j))),[]).append(n)
 for (i,j),ns in edges.items():
  # Coplanar seams cannot become silhouettes and need not reach the GPU.
  if len(ns)>1 and ns[0].dot(ns[1])>.9999:continue
  if len(ns)>1 and ns[0].dot(ns[1])>=.75:
   visible=False
   for az in range(-85,47,6):
    for el in [15,25,38,50]:
     aa,ee=map(math.radians,[az,el]);v=Vector((math.sin(aa)*math.cos(ee),-math.cos(aa)*math.cos(ee),math.sin(ee)))
     if (ns[0].dot(v)>0)!=(ns[1].dot(v)>0):visible=True;break
    if visible:break
   if not visible:continue
  edge(vs[i],vs[j],ns[0],ns[-1],1 if len(ns)==1 or ns[0].dot(ns[-1])<.75 else 0,role)
 for t in m.loop_triangles:
  for i in t.vertices:depth.extend(coord(vs[i]));depthpaper.extend(paper(vs[i]))
 names.append(o.name);ob.to_mesh_clear()
for name,pts,role in g.wires:
 if name.startswith('floor datum'):continue
 for p,q in zip(pts,pts[1:]):edge(p,q,Vector(),Vector(),1,role)
attrs={'position':pos,'paperXY':pa,'normalA':na,'normalB':nb,'feature':feature,'inkColor':color,'edgeCentre':centres,'depthPosition':depth,'depthPaper':depthpaper};buf=bytearray();meta={'sourceCommit':'f4a51dd','source':'tools/hardware3d/main_scenes_build.py:dinner','parts':len(names),'people':6,'attributes':{}}
for name,values in attrs.items():
 # Compact, GPU-native attributes. Positions retain 1/32 model-unit precision.
 if name in ('position','edgeCentre','depthPosition'):code='h';values=[round(v*32) for v in values];normalized=False
 elif name in ('paperXY','depthPaper'):code='H';values=[round(max(0,min(1,v))*65535) for v in values];normalized=True
 elif name in ('normalA','normalB'):code='b';values=[round(max(-1,min(1,v))*127) for v in values];normalized=True
 elif name=='inkColor':code='B';values=[round(v*255) for v in values];normalized=True
 else:code='B';normalized=False
 while len(buf)%4:buf.append(0)
 meta['attributes'][name]={'offset':len(buf),'count':len(values),'type':code,'normalized':normalized,'itemSize':2 if name in ('paperXY','depthPaper') else 1 if name=='feature' else 3};buf.extend(array(code,values).tobytes())
key='truth-dinner-'+hashlib.sha256(buf).hexdigest()[:16];folder=root/'site/public/gallery/destiny/film-data';(folder/(key+'.bin')).write_bytes(buf);(folder/(key+'.json')).write_text(json.dumps(meta,separators=(',',':')))
(root/'site/src/data/truth-dinner-asset.json').write_text(json.dumps({'base':'/gallery/destiny/film-data/'+key}))
print('Exported',len(names),'parts,',len(pos)//6,'edges,',len(depth)//9,'occlusion triangles;',round(len(buf)/1048576,2),'MiB')

sys.stdout.flush();os._exit(0)
