"""Reserve follow / moving dissolve / overview hold within the fixed soundtrack score."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'site/src/data/drawing-score.json';score=json.loads(p.read_text())
for s in score:
 if s.get('intro'):continue
 d=s['end']-s['start'];hold=min(2.65,1.25+d*.1);pull=min(3.1,max(1.2,d*.27));follow=d-hold-pull
 s['followEnd']=round(follow,4);s['holdStart']=round(d-hold,4);s['establish']=.8 if s['start']==0 else min(.28,follow*.22)
 s['leadStart']=round(s['establish']*.6,4);s['leadEnd']=round(follow+pull*.4,4)
 data=json.loads((root/f"site/public/gallery/destiny/drawing/{s['id']}.json").read_text());reg=data['registration']
 s['framing']=dict(x=reg['center'][0]/2560,y=reg['center'][1]/1080,w=data['size'][0]*reg['unit']/2560*1.28,h=data['size'][1]*reg['unit']/1080*1.28)
 s['framing']={k:round(v,6) for k,v in s['framing'].items()}
p.write_text(json.dumps(score,indent=2)+'\n')
print('Overview holds:',round(min(s['end']-s['start']-s['holdStart'] for s in score if not s.get('mystery')),2),'to',round(max(s['end']-s['start']-s['holdStart'] for s in score if not s.get('mystery')),2),'seconds; soundtrack unchanged')
