import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {atlasCamera,bridgeAt} from '../site/src/scripts/atlas-motion.js';
const root=path.resolve(import.meta.dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p))),data=read('site/src/data/scene-atlas.json'),gallery=read('site/src/data/destiny-gallery.json'),grid=read('site/src/data/music-grid.json');
assert.equal(data.tiles.length,42);assert.equal(new Set(data.tiles.map(t=>t.cell)).size,42);
assert.deepEqual(new Set(data.tiles.map(t=>t.id)),new Set(gallery.map(t=>t.id)));
assert.equal(data.bridges.length,31);const directions=new Set();
const bytes=fs.readFileSync(path.join(root,'site/public'+data.base+'.bin'));assert.equal(bytes.byteLength,data.lineVertices*24);assert(data.lineVertices<100000);
assert(new Float32Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/4).every(Number.isFinite));
for(const t of data.tiles)assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,t.source))).digest('hex'),t.sourceSHA256);
for(const [i,b]of data.bridges.entries()){
 const a=data.tiles.find(t=>t.id===b.fromId),z=data.tiles.find(t=>t.id===b.toId);
 assert.equal(Math.abs(a.cell%7-z.cell%7)+Math.abs(Math.floor(a.cell/7)-Math.floor(z.cell/7)),1);
 assert.deepEqual(b.beats,grid.phrases[i].beats.slice(14,16).concat(grid.phrases[i+1].beats.slice(0,3)));
 for(const aspect of [.78,1,1440/407,2.4]){
  const height=500,width=height*aspect,paperHeight=Math.min(height,width/data.tileWidth),departure={x:.5,y:.5,viewportHeight:height,height:paperHeight,scale:1.032,roll:0};
  const pose=t=>atlasCamera(data,b,t,aspect,departure);
  const first=pose(b.beats[0]),last=pose(b.beats[4]);assert(Math.abs(first.opacity)<1e-10);assert(Math.abs(last.opacity-1)<1e-10);assert(Math.abs(first.x-a.x)<1e-10);assert(Math.abs(first.y-a.y)<1e-10);assert(Math.abs(last.x-z.x-(b.entry.x-.5)*data.tileWidth)<1e-10);
  assert.equal(bridgeAt(data,b.beats[0]),b);assert.notEqual(bridgeAt(data,b.beats[4]),b);
  directions.add(first.direction);
  // Internal beats must keep moving, with continuous velocity in world space.
  const span=b.beats[4]-b.beats[0],epsilon=span*1e-4,distance=Math.hypot(last.x-first.x,last.y-first.y);
  for(const at of b.beats.slice(1,4)){
   const before=pose(at-epsilon),p=pose(at),after=pose(at+epsilon);
   const v1=['x','y','height','roll'].map(k=>(p[k]-before[k])/epsilon),v2=['x','y','height','roll'].map(k=>(after[k]-p[k])/epsilon);
   assert(Math.hypot(v1[0],v1[1])>.2*distance/span,'Camera stops inside the flight');
   v1.forEach((v,j)=>assert(Math.abs(v-v2[j])<.025,'Camera velocity jumps at beat '+at));
  }
  for(const cut of b.beats.slice(1,4)){
   const left=pose(cut-1e-5),right=pose(cut+1e-5);for(const k of ['x','y','height','roll','opacity'])assert(Math.abs(left[k]-right[k])<.002,'Discontinuous camera '+k);
  }
  for(let t=b.beats[0];t<b.beats[4];t+=.01){const p=pose(t);for(const k of ['x','y','height','roll','opacity'])assert(Number.isFinite(p[k]));assert(p.height>0);assert(p.opacity>=-1e-10&&p.opacity<=1+1e-10);assert(p.apertureWidth<=data.tileWidth*1.5+1e-10);assert(p.apertureHeight<=1.5+1e-10);
   if(p.phase>3&&p.height<.55){assert(Math.abs(p.x-z.x)<data.tileWidth/2,'Close arrival points at horizontal gutter');assert(Math.abs(p.y-z.y)<.5,'Close arrival points at vertical gutter');}
  }
 }
}
assert.equal(directions.size,4);const shader=fs.readFileSync(path.join(root,'site/src/scripts/fusion-flight.js'),'utf8');
assert(!shader.includes('attribute float spark'));assert(!shader.includes('spark>=0.'));assert(shader.includes('length:26'));assert(shader.includes('gl_PointSize=2.2+.45*pulse'));
console.log('PASS: 42 source scenes, 31 continuous four-beat flights without intermediate stops, local 1.5-tile aperture at four aspect ratios, bounded contours and 26 small pulsing nibs without sprays.');
