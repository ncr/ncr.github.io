import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {build} from '../site/node_modules/esbuild/lib/main.js';
const root=path.resolve(import.meta.dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p)));
const score=read('site/src/data/drawing-score.json'),assets=read('site/src/data/contour-assets.json'),cues=read('site/src/data/contour-cues.json');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'contour-check-'));
try{
 await build({entryPoints:[path.join(root,'site/src/scripts/contour-resonance.js')],bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'module.mjs')});
 const {cueAt}=await import(pathToFileURL(path.join(temp,'module.mjs')));
 for(const plan of score){
  const cue=cues[plan.id];
  if(plan.intro||!cue){assert.equal(cueAt(plan,1),null);continue;}
  const time=b=>{const i=Math.min(15,Math.floor(b));return plan.beats[i]+(plan.beats[i+1]-plan.beats[i])*(b-i);};
  assert.equal(cueAt(plan,time(cue.startBeat)).opacity,0);
  assert(Math.abs(cueAt(plan,time(cue.crestBeat)).open-1)<1e-10);
  assert.equal(cueAt(plan,time(cue.closeBeat)).open,0);
  assert.equal(cueAt(plan,time(12)).opacity,0);
  assert.equal(cueAt(plan,time(14)).opacity,0,'The final wallpaper must have no floating echoes');
  for(let t=0;t<plan.end-plan.start;t+=.01){
   const a=cueAt(plan,t),b=cueAt(plan,t+.001);
   assert(a.open>=-1e-12&&a.open<=1+1e-12&&a.opacity>=-1e-12&&a.opacity<=1+1e-12);
   assert(Math.abs(a.open-b.open)<.003&&Math.abs(a.opacity-b.opacity)<.003,'No jumps across envelope boundaries');
  }
  const asset=assets[plan.id],buffer=fs.readFileSync(path.join(root,'site/public'+asset.base+'.bin'));
  assert.equal(buffer.byteLength,asset.vertices*24);assert(asset.vertices<20000);assert(asset.names.length<=48);
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,asset.source))).digest('hex'),asset.sourceSHA256);
  assert(new Float32Array(buffer.buffer,buffer.byteOffset,buffer.byteLength/4).every(Number.isFinite));
 }
 console.log('PASS: 7 authored source-contour cues, bounded immutable buffers, smooth envelopes, no intro/overview echoes, reproducible source hashes.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
