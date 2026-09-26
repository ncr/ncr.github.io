import {beatAt,smoother} from './musical-motion.js';
const mix=(a,b,t)=>a+(b-a)*t;
export function bridgeAt(data,time){return data.bridges.find(b=>time>=b.beats[0]&&time<b.beats[4]);}
export function atlasCamera(data,bridge,time,aspect,departure){
 const from=data.tiles.find(t=>t.id===bridge.fromId),to=data.tiles.find(t=>t.id===bridge.toId),phase=beatAt(bridge,time),e=bridge.entry;
 const start={x:from.x+(departure.x-.5)*data.tileWidth,y:from.y+.5-departure.y,height:departure.viewportHeight/(departure.height*departure.scale),roll:departure.roll};
 const end={x:to.x+(e.x-.5)*data.tileWidth,y:to.y+.5-e.y,height:e.size?Math.max(e.size[1],e.size[0]/aspect)*1.22*e.range*e.unit/1080:Math.max(e.h,e.w*data.tileWidth/aspect),roll:e.roll};
 const dx=to.x-from.x,dy=to.y-from.y,distance=Math.hypot(dx,dy),sign=dx!==0?Math.sign(dx):Math.sign(dy);
 // One clock for the entire flight. A small global warp puts the widest view
 // on the middle beat without changing velocity at individual beat boundaries.
 const duration=bridge.beats[4]-bridge.beats[0],middle=(bridge.beats[2]-bridge.beats[0])/duration;
 const s=Math.max(0,Math.min(1,(time-bridge.beats[0])/duration)),t=s+(.5-middle)/(middle*(1-middle))*s*(1-s);
 const u=smoother(t),lift=Math.sin(Math.PI*t)**2;
 const wide=Math.max(start.height*1.12,end.height*1.08,1.5*data.tileWidth/aspect);
 const base=mix(Math.log(start.height),Math.log(end.height),u);
 const height=Math.exp(mix(base,Math.log(wide),lift));
 // Pan, zoom and a quiet sideways bank overlap: no stop at the two old joins.
 const arc=.055*lift*(1+.2*Math.sin(2*Math.PI*t));
 const x=mix(start.x,end.x,u)-dy/distance*arc,y=mix(start.y,end.y,u)+dx/distance*arc;
 const roll=mix(start.roll,end.roll,u)+sign*2.4*lift+.35*Math.sin(2*Math.PI*t)*lift;
 const dissolve=e.spatial?.55:.34;
 const opacity=smoother(phase/.22)*(1-smoother((phase-(4-dissolve))/dissolve));
 // A portrait viewport must not reveal six extra rows in its letterbox space.
 // The local aperture follows the zoom continuously and never opens to the atlas.
 const apertureWidth=Math.min(height*aspect,1.5*data.tileWidth),apertureHeight=Math.min(height,1.5);
 return {x,y,height,roll,phase,opacity,apertureWidth,apertureHeight,from:from.index,to:to.index,direction:dx>0?'E':dx<0?'W':dy>0?'N':'S'};
}
