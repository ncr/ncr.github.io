"""Author the selected four-bar phrases. Run prepare-musical-score.py first."""
import json
from pathlib import Path
r=Path(__file__).resolve().parents[1];d=r/'site/src/data';editorial=json.load(open(r/'tools/film-editorial.json'));old=editorial['score'];tour=editorial['tour'];grid=json.load(open(d/'music-grid.json'));g=grid['beats'];gallery={w['id']:w for w in json.load(open(d/'destiny-gallery.json'))}
ids=['o02','o01','c087','o09','c025','o13','o05','c017','c056','c031','o03','o03','c018','o07','o06','c030','o10','c002','o14','c099','c042','o04','c065','o12','o08','c038','c101','c001','c104','c105','c107','c110']
score=[];shots=tour[:4];phrases=[]
for s in old[:3]:
 s.update(mystery=True,tail=1.8,followEnd=s['end']-s['start']+3,holdStart=s['end']-s['start']+5,leadEnd=s['end']-s['start']+1.8);score.append(s)
for i,id in enumerate(ids):
 start,end=g[i*16],g[(i+1)*16];phrase={'id':id,'start':start,'end':end,'bars':4,'firstBeat':i*16,'kind':'orbit' if i==11 else 'drawing'};phrases.append(phrase)
 if i==11:
  shots.extend([dict(at=start,id=id,x=.57,y=.39,w=.23,h=.48,caption='Podejdźmy do dyszy.',motion='push',orbit='start'),dict(at=g[i*16+4],id=id,x=.57,y=.39,w=.23,h=.48,caption='Teraz widać głębokość pierścieni.',motion='float'),dict(at=g[i*16+12],id=id,x=.5,y=.5,w=1,h=1,caption='I znowu: cała maszyna.',motion='pull',orbit='end')]);continue
 template=next(s for s in reversed(old) if s['id']==id);s=dict(template)
 s.pop('intro',None);s.pop('mystery',None);s.pop('closeRange',None)
 s.update(start=start,end=end,establish=g[i*16+1]-start,leadStart=0,leadEnd=g[i*16+12]-start,followEnd=g[i*16+10]-start,holdStart=g[i*16+14]-start,pullBeat=10,revealBeat=14,beats=[round(t-start,6) for t in g[i*16:i*16+17]],phrase=i,blendSpan=g[i*16+2]-start)
 if i==0:
  # The first downbeat starts one continuous reveal, not six seconds of a parked overview.
  s=dict(old[3]);s.update(end=end,followEnd=start-s['start'],holdStart=g[14]-s['start'],leadEnd=g[10]-s['start'],pullBeat=0,revealBeat=14,beats=[round(t-s['start'],6) for t in g[:17]],phrase=0,blendSpan=1.8,mystery=False)
 if id=='o10':s['framing']={'x':.5,'y':.47,'w':.39,'h':.74};s['spatial']='truth-dinner'
 score.append(s)
 authored=[t for t in tour if t['id']==id and not t.get('portrait') and t['at']>30 and not t.get('orbit')]
 # Preserve the author's narrative captions for the hero sheets, on bar boundaries.
 hero=id in ['o13','o03','o10','o04','c001']
 if i==0:
  shots.append(dict(at=start,id=id,x=.5,y=.5,w=1,h=1,caption='Teraz złap rytm.',motion='pull'))
  shots.append(dict(at=g[4],id=id,x=.5,y=.5,w=1,h=1,caption=gallery[id]['name'],motion='float'))
 elif hero:
  for k,t in enumerate(authored[:3]):
   t=dict(t);t.update(at=g[i*16+[0,4,12][k]]);shots.append(t)
 else:shots.append(dict(at=start,id=id,x=.5,y=.5,w=1,h=1,caption=gallery[id]['name'],motion='cut',portrait=True))
for shot in shots:
 if shot['at']>=g[0]:
  j=min(range(len(g)),key=lambda j:abs(g[j]-shot['at']));shot['travel']=g[min(j+4,len(g)-1)]-g[j]
shots.append(dict(at=g[512],id='c001',x=.5,y=.5,w=1,h=1,caption='Przyszłość ma miejsce na dobrą zabawę.',chapter='Finał',motion='float'))
for p in phrases:p['beats']=g[p['firstBeat']:p['firstBeat']+17]
grid['phrases']=phrases;grid['firstReveal']=g[14];grid['tailStart']=g[512]
for name,obj in [('drawing-score',score),('destiny-tour',sorted(shots,key=lambda t:t['at'])),('music-grid',grid)]: (d/(name+'.json')).write_text(json.dumps(obj,indent=2)+'\n')
flight=json.load(open(d/'flight-timing.json'));flight.update(orbit=g[176],end=g[192],beats=g[176:193]);(d/'flight-timing.json').write_text(json.dumps(flight,indent=2)+'\n')
print(len(phrases),'four-bar phrases',len({s['id'] for s in shots}),'featured sheets; all',len(gallery),'available in gallery')
