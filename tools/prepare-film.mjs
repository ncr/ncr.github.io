// Offline preparation. No geometry sorting, stroke search or spring integration in playback.
import fs from 'node:fs';import {createHash} from 'node:crypto';import path from 'node:path';import * as THREE from '../site/node_modules/three/build/three.module.js';
import {inkTime} from '../site/src/scripts/musical-motion.js';
import {createOperator} from '../site/src/scripts/camera-operator.js';
const root=path.resolve(import.meta.dirname,'..'),folder=path.join(root,'site/public/gallery/destiny/film-data');fs.mkdirSync(folder,{recursive:true});
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p))),score=read('site/src/data/drawing-score.json'),beats=read('site/src/data/bass-beats.json').beats,cues=read('site/src/data/contour-cues.json'),introFrames={},filmAssets={};
const clamp=t=>Math.max(0,Math.min(1,t)),hash=name=>[...name].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,0),length=p=>p.slice(1).reduce((s,v,i)=>s+Math.hypot(v[0]-p[i][0],v[1]-p[i][1]),0);
function sample(s,u){const d=clamp(u)*s.total,ds=s.distances;let lo=1,hi=ds.length-1;while(lo<hi){const m=(lo+hi)>>1;if(ds[m]<d)lo=m+1;else hi=m;}const a=s.path.p[lo-1],b=s.path.p[lo],v=(d-ds[lo-1])/Math.max(.001,ds[lo]-ds[lo-1]);return {x:a[0]+(b[0]-a[0])*v,y:a[1]+(b[1]-a[1])*v,z:s.z+.4};}
let bytes=0;
for(const id of new Set(score.map(s=>s.id))){
 const data=read(`site/public/gallery/destiny/drawing/${id}.json`),ranked=data.strokes.map(p=>({...p,total:length(p.p)})).filter(p=>p.total>.12).sort((a,b)=>b.total-a.total),leaders=new Set(),families=new Set();
 for(const p of ranked){const f=p.name.replace(/\d+/g,'');if(leaders.size<6&&!families.has(f)&&!/soil section|floor|ground|shadow/i.test(p.name)){leaders.add(p);families.add(f);}}
 // Six preserved liquid-tin contours form a spectrum choir around the tracked radiator line.
 const choir=id==='o03'?[24,27,30,33,36,39].map(n=>ranked.find(p=>p.name===`liquid tin stream.${String(n).padStart(3,'0')}`)):[];
 if(choir.some(p=>!p))throw Error('Missing authentic radiator contour');
 const lanes=Array.from({length:14},()=>[]);for(const p of ranked)if(!leaders.has(p)&&!choir.includes(p))lanes[hash(p.name)%14].push(p);for(const p of leaders)lanes.push([p]);for(const p of choir)lanes.push([p]);
 const attrs={position:[],inkColor:[],birth:[],penId:[],along:[]},pens=[],heroes=[];let uid=1;
 lanes.forEach((items,lane)=>{const total=items.reduce((s,p)=>s+Math.max(9,p.total)+5,0),lead=lane>=14&&lane<20,leadIndex=lane-14,start=lead?.015+leadIndex*.075:lane%4*.012,span=lead?.39:.96-start;let cursor=0;const strokes=[];
  for(const p of items){const work=Math.max(9,p.total),a=start+cursor/total*span,b=start+(cursor+work)/total*span;cursor+=work+5;
   const z=/radiator|cable|accent|outline/.test(p.role)?6:2,c=new THREE.Color(/cable|accent|coil/.test(p.role)?0xe8ba79:/radiator|screen|glass/.test(p.role)?0x8ad3e1:0xdbcbb3),ds=[0];
   for(let i=1;i<p.p.length;i++)ds.push(ds.at(-1)+Math.hypot(p.p[i][0]-p.p[i-1][0],p.p[i][1]-p.p[i-1][1]));
   if(lane>=20||!choir.includes(p))for(let i=1;i<p.p.length;i++)for(const j of [i-1,i]){attrs.position.push(...p.p[j],z);attrs.inkColor.push(c.r,c.g,c.b);attrs.birth.push(a+ds[j]/p.total*(b-a));attrs.penId.push(lane>=20?lane:lead?leadIndex:-1);attrs.along.push(ds[j]/p.total);}
   const s={path:p,total:p.total,distances:ds,z,start:a,end:b,uid:uid++};strokes.push(s);if(lead)heroes.push(s);
  }pens.push(strokes);
 });
 const chunks=[],meta={id,size:data.size,paper:data.paper,registration:data.registration,attributes:{},plans:{}};let offset=0;
 const append=(v,itemSize)=>{const a=new Float32Array(v),d={offset,count:a.length,itemSize};chunks.push(Buffer.from(a.buffer));offset+=a.length;return d;};
 for(const [k,a]of Object.entries(attrs))meta.attributes[k]=append(a,k==='position'||k==='inkColor'?3:1);
 for(const plan of score.filter(s=>s.id===id)){
  const duration=plan.end-plan.start+(plan.tail||0),leadIndex=plan.leadName?heroes.findIndex(s=>s.path.name===plan.leadName):plan.seed%heroes.length,hero=heroes[leadIndex],operator=createOperator(t=>sample(hero,(t-plan.leadStart)/(plan.leadEnd-plan.leadStart)),plan,1,beats,cues[id]);
  if(plan.intro){const q=sample(hero,.18),reg=data.registration;introFrames[plan.start]={x:(reg.center[0]+q.x*reg.unit)/2560,y:(reg.center[1]-q.y*reg.unit)/1080,w:plan.framing.w*.23,h:plan.framing.h*.23};}
  const camera=[],cameraFPS=90,penFPS=60,rows=Math.ceil(duration*penFPS)+2;
  for(let i=0;i<=Math.ceil(duration*cameraFPS)+1;i++)camera.push(...operator(i/cameraFPS));
  const penRows=lanes.length,choirWindows=choir.map((_,i)=>[plan.beats?plan.beats[0]+(plan.beats[1]-plan.beats[0])*(i%3)*.5:plan.leadStart+(i-2)*.065,plan.leadEnd]);
  const texture=new Float32Array(rows*penRows*4);
  for(let lane=0;lane<penRows;lane++)for(let i=0;i<rows;i++){
   const t=inkTime(plan,i/penFPS),progress=clamp(t/plan.leadEnd),phase=s=>lane>=20?(t-choirWindows[lane-20][0])/(choirWindows[lane-20][1]-choirWindows[lane-20][0]):s===hero?(t-plan.leadStart)/(plan.leadEnd-plan.leadStart):(progress-s.start)/(s.end-s.start),s=pens[lane]?.find(s=>phase(s)>=0&&phase(s)<1);
   if(s){const q=sample(s,phase(s));texture.set([q.x,q.y,q.z,s.uid],(lane*rows+i)*4);}
  }
  meta.plans[plan.start]={camera:append(camera,7),pens:append(texture,4),cameraFPS,penFPS,penWidth:rows,leadIndex,...(choir.length?{penRows,choirWindows,choirNames:choir.map(p=>p.name),mutedHero:choir.includes(hero.path)?14+leadIndex:-1}: {})};
 }
 const buffer=Buffer.concat(chunks),json=JSON.stringify(meta),key=id+'-'+createHash('sha256').update(json).update(buffer).digest('hex').slice(0,16);bytes+=buffer.length;fs.writeFileSync(path.join(folder,key+'.bin'),buffer);fs.writeFileSync(path.join(folder,key+'.json'),json);filmAssets[id]='/gallery/destiny/film-data/'+key;
}
fs.writeFileSync(path.join(root,'site/src/data/film-assets.json'),JSON.stringify(filmAssets));
fs.writeFileSync(path.join(root,'site/src/data/intro-framing.json'),JSON.stringify(introFrames));
// Merge the nozzle's 56 source parts to one precomputed edge buffer/draw call.
const pos=[],cols=[],bands=[];
for(const [i,part]of read('site/src/data/fusion-nozzle.json').entries()){
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(part.v,3));g.setIndex(part.i);const e=new THREE.EdgesGeometry(g,9),p=e.attributes.position.array,c=new THREE.Color(part.name.includes('coil')?0xd7b783:0x77b6cc);
 pos.push(...p);for(let n=0;n<p.length/3;n++){cols.push(c.r,c.g,c.b);bands.push(i%3);}g.dispose();e.dispose();
}
const arrays=[pos,cols,bands].map(a=>new Float32Array(a));fs.writeFileSync(path.join(folder,'nozzle.bin'),Buffer.concat(arrays.map(a=>Buffer.from(a.buffer))));fs.writeFileSync(path.join(folder,'nozzle.json'),JSON.stringify({vertices:pos.length/3}));
console.log('Prepared',new Set(score.map(s=>s.id)).size,'geometries,',score.length,'camera/pen tables and merged nozzle:',(bytes/1048576).toFixed(2),'MiB');
