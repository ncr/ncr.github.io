// Per-sheet facts the film edit needs: paper colour, device bounds in the
// 2560 × 1080 film frame, image URLs and the shared atlas tile. Read-only over
// the existing release assets; nothing is regenerated.
import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),data=p=>JSON.parse(fs.readFileSync(path.join(root,p)));
const gallery=data('site/src/data/destiny-gallery.json'),atlas=data('site/src/data/scene-atlas.json');
const sheets={};
for(const w of gallery){
 const d=data(`site/public/gallery/destiny/drawing/${w.id}.json`),r=d.registration;
 let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
 for(const s of d.strokes)for(const [x,y]of s.p){const X=r.center[0]+x*r.unit,Y=r.center[1]-y*r.unit;x0=Math.min(x0,X);x1=Math.max(x1,X);y0=Math.min(y0,Y);y1=Math.max(y1,Y);}
 const tile=atlas.tiles.find(t=>t.id===w.id);
 sheets[w.id]={name:w.name,film:w.src.replace('/destiny/','/destiny/film/'),thumb:w.thumb,drawing:`/gallery/destiny/drawing/${w.id}.json`,paper:d.paper,device:[x0,y0,x1,y1].map(v=>Math.round(v)),strokes:d.strokes.length,uv:tile.uv};
}
fs.writeFileSync(path.join(root,'site/src/data/film-sheets.json'),JSON.stringify({atlas:atlas.base+'.webp',sheets},null,1)+'\n');
console.log('film-sheets.json:',Object.keys(sheets).length,'sheets');
