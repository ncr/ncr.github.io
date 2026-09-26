import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';import path from 'node:path';
import {inkTime,pullAt,phraseMotion} from '../site/src/scripts/musical-motion.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p))),grid=read('site/src/data/music-grid.json'),score=read('site/src/data/drawing-score.json'),assets=read('site/src/data/film-assets.json'),tour=read('site/src/data/destiny-tour.json');
assert.equal(read('site/src/data/destiny-gallery.json').length,42);assert.equal(grid.phrases.length,32);
assert.equal(new Set(grid.phrases.map(p=>p.id)).size,32,'Each featured wallpaper gets one four-bar phrase, including the ship');
for(const [i,p]of grid.phrases.entries()){
 assert.equal(p.bars,4);assert.equal(p.beats.length,17);assert.equal(p.start,grid.beats[i*16]);assert.equal(p.end,grid.beats[(i+1)*16]);
 if(i)assert.equal(p.start,grid.phrases[i-1].end);
 assert(p.end-p.start>8&&p.end-p.start<9);
}
for(const s of score.filter(s=>s.beats)){
 if(s.beats[0]>0){assert.equal(inkTime(s,1),1);assert.equal(inkTime(s,2),2);}
 assert.equal(s.revealBeat,14,'Overview is restricted to the last two beats');
 for(let i=0;i<160;i++){const t=i*(s.end-s.start)/160;assert(Math.abs((inkTime(s,t+.001)-inkTime(s,t))/.001-1)<1e-8,'Laser speed must be independent of beat phase');}
 for(const b of s.beats){assert(Math.abs(inkTime(s,b)-b)<1e-6);assert(Number.isFinite(inkTime(s,b-.001)));}
 assert(pullAt(s,s.followEnd)<1e-5);assert(pullAt(s,s.holdStart)>.99999);
 const base='site/public'+assets[s.id],meta=read(base+'.json'),buf=fs.readFileSync(path.join(root,base+'.bin')),plan=meta.plans[s.start],a=plan.camera;
 const floats=new Float32Array(buf.buffer,buf.byteOffset+a.offset*4,a.count),frame=Math.ceil(s.holdStart*plan.cameraFPS)*7;
 const motion=phraseMotion(s,frame/7/plan.cameraFPS);assert(Math.abs(floats[frame+2]-1/motion.zoom)<1e-5,'Camera must reach the registered overview with its scored beat accent');assert(Math.abs(floats[frame+6]+motion.roll*Math.PI/180)<1e-5);
}
for(const s of tour.filter(s=>s.at>=grid.entrance))assert(grid.beats.some(t=>Math.abs(t-s.at)<1e-6),'Caption/edit off beat: '+s.at);
assert.equal(grid.duration,299.21);assert(grid.duration-grid.tailStart<5);
console.log('PASS: 32 contiguous four-bar phrases, constant pen speed, two-beat overview, baked camera arrival, captions on beat, 42 gallery entries, complete soundtrack.');
