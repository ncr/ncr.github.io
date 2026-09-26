import fs from 'node:fs';import assert from 'node:assert/strict';
import {incomingClock,liveReveal,liveLanding} from '../site/src/scripts/atlas-live.js';
const data=JSON.parse(fs.readFileSync(new URL('../site/src/data/scene-atlas.json',import.meta.url)));
for(const b of data.bridges){
 const [begin,,start,,end]=b.beats,eps=1e-5;
 assert.equal(incomingClock(b,begin),0);
 assert(incomingClock(b,begin+(start-begin)*.25)>0,'Ink must move during the outgoing zoom');
 let prior=-1;
 for(let t=begin;t<=end+.1;t+=.002){const elapsed=incomingClock(b,t);assert(elapsed>=prior);prior=elapsed;}
 assert(Math.abs(incomingClock(b,end)-(end-start))<1e-10,'Clock resets on landing');
 const before=(incomingClock(b,end)-incomingClock(b,end-eps))/eps,after=(incomingClock(b,end+eps)-incomingClock(b,end))/eps;
 assert(Math.abs(before-after)<2e-5,'Pen velocity changes on landing');
 assert.equal(liveReveal(0),0);assert.equal(liveReveal(4),1);assert.equal(liveLanding(4),1);
 for(const fn of [liveReveal,liveLanding])assert(Math.abs((fn(4)-fn(4-eps))/eps)<1e-5,'Projection still changing at handoff');
}
const atlas=fs.readFileSync(new URL('../site/src/scripts/scene-atlas.js',import.meta.url),'utf8');
assert(!atlas.includes('new THREE.WebGLRenderer'),'Atlas must share the rendering context');
assert(atlas.includes('renderIncoming(bridge,time,elapsed'),'Incoming scene must render before atlas');
assert(atlas.includes('liveIndex)<.1)discard'),'Baked incoming image must not remain behind the live drawing');
assert(!atlas.includes('readRenderTargetPixels'),'No GPU readback per frame');
console.log('PASS: 31 early live arrivals, monotone pre-roll, matching pen clock/velocity and full-viewport projection at handoff; one shared renderer and no GPU readback.');
