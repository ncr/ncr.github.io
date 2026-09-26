// Structural checks for the music-video edit (site/src/scripts/film/edit.js):
// the picture is never empty, cuts sit on the beat grid, every wallpaper
// appears, and every referenced asset exists. Run: node tools/check-film-edit.mjs
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'),site=path.join(root,'site'),out='/tmp/film-edit-check.mjs';
execFileSync(path.join(site,'node_modules/.bin/esbuild'),['src/scripts/film/edit.js','--bundle','--format=esm','--outfile='+out,'--log-level=warning'],{cwd:site});
const {edit,sheets,duration,captions}=await import(out+'?'+Date.now());
const grid=JSON.parse(fs.readFileSync(path.join(site,'src/data/music-grid.json'))).beats;
const fail=m=>{console.error('FAIL:',m);process.exitCode=1;};
// 1. Coverage: some shot is active at every 20 ms.
for(let t=0;t<duration;t+=.02)if(!edit.shots.some(s=>s.t0<=t&&t<s.t1))fail(`no shot at ${t.toFixed(2)} s`);
// 2. Cuts after the drum entrance land on a beat or half-beat of the measured grid.
const half=grid.flatMap((b,i)=>i<grid.length-1?[b,(b+grid[i+1])/2]:[b]);
for(const c of edit.cuts)if(c.at>=grid[0]-.001){const d=Math.min(...half.map(b=>Math.abs(b-c.at)));if(d>.002)fail(`cut ${c.type} at ${c.at.toFixed(3)} is ${d.toFixed(3)} s off the grid`);}
// 3. Every one of the 42 wallpapers is on screen at least once.
const seen=new Set();const walk=s=>{if(s.id)seen.add(s.id);for(const p of s.panels||[])for(const q of p.seq||[p.shot])walk(q);if(s.kind==='nozzle')seen.add('o03');if(s.kind==='dinner')seen.add('o10');};
edit.shots.forEach(walk);const missing=Object.keys(sheets).filter(id=>!seen.has(id));if(missing.length)fail('never shown: '+missing.join(', '));
// 4. Assets referenced by the edit exist in public/.
for(const [id,s]of Object.entries(sheets))for(const url of [s.film,s.thumb,s.drawing])if(!fs.existsSync(path.join(site,'public',url)))fail(`${id}: missing ${url}`);
console.log(`${edit.shots.length} shots, ${edit.cuts.length} cuts, ${seen.size}/42 wallpapers, ${captions().length} captions, kinds: ${[...new Set(edit.shots.map(s=>s.kind))].join(', ')}`);
if(!process.exitCode)console.log('PASS');
