// Select and resample authentic released contours OFFLINE. Playback never searches paths.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p)));
const cues=read('site/src/data/contour-cues.json'),assets={};
for(const [id,cue] of Object.entries(cues)){
 const input=`site/public/gallery/destiny/drawing/${id}.json`,source=read(input);
 const ranked=source.strokes.map(s=>({...s,length:s.p.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-s.p[i][0],p[1]-s.p[i][1]),0)}))
  .filter(s=>s.length>32&&!/floor|ground|soil|shadow/i.test(s.name))
  .sort((a,b)=>(/accent|cable/.test(b.role)?1.7:1)*b.length-(/accent|cable/.test(a.role)?1.7:1)*a.length).slice(0,48);
 const vertices=[],names=[];
 for(const [index,s] of ranked.entries()){
  names.push(s.name);let distance=0;
  for(let j=1;j<s.p.length;j++){
   const a=s.p[j-1],b=s.p[j],len=Math.hypot(b[0]-a[0],b[1]-a[1]),steps=Math.max(1,Math.ceil(len/7));
   for(let k=0;k<steps;k++)for(let layer=1;layer<=cue.layers;layer++)for(const f of [k/steps,(k+1)/steps])
    vertices.push(a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,3,(distance+len*f)/s.length,index/ranked.length,layer);
   distance+=len;
  }
 }
 const bytes=Buffer.from(new Float32Array(vertices).buffer),sha=createHash('sha256').update(bytes).digest('hex'),base=`/gallery/destiny/film-data/contour-${id}-${sha.slice(0,16)}`;
 fs.writeFileSync(path.join(root,'site/public'+base+'.bin'),bytes);
 assets[id]={base,vertices:vertices.length/6,size:source.size,source:input,sourceSHA256:createHash('sha256').update(fs.readFileSync(path.join(root,input))).digest('hex'),names};
 console.log(id,ranked.length,'source paths,',Math.round(bytes.length/1024),'KiB');
}
fs.writeFileSync(path.join(root,'site/src/data/contour-assets.json'),JSON.stringify(assets,null,2)+'\n');
