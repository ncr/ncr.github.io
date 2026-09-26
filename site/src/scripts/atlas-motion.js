import {beatAt,smoother} from './musical-motion.js';
const mix=(a,b,t)=>a+(b-a)*t;
export function bridgeAt(data,time){return data.bridges.find(b=>time>=b.beats[0]&&time<b.beats[4]);}
export function atlasCamera(data,bridge,time,aspect,departure){
 const from=data.tiles.find(t=>t.id===bridge.fromId),to=data.tiles.find(t=>t.id===bridge.toId),phase=beatAt(bridge,time);
 const fit=Math.max(1,data.tileWidth/aspect),e=bridge.entry;
 const start={x:from.x+(departure.x-.5)*data.tileWidth,y:from.y+.5-departure.y,height:departure.viewportHeight/(departure.height*departure.scale),roll:departure.roll};
 const end={x:to.x+(e.x-.5)*data.tileWidth,y:to.y+.5-e.y,height:e.size?Math.max(e.size[1],e.size[0]/aspect)*1.22*e.range*e.unit/1080:Math.max(e.h,e.w*data.tileWidth/aspect),roll:e.roll};
 const full=Math.max(data.rows*data.pitchY,data.cols*data.pitchX/aspect)*1.06;
 const wide=data.bridges.indexOf(bridge)%8===0?full:Math.max(3.1,fit*2.7);
 const bound=(v,span,view)=>Math.max(-Math.max(0,(span-view)/2),Math.min(Math.max(0,(span-view)/2),v));
 const a={x:bound(from.x,data.cols*data.pitchX,wide*aspect),y:bound(from.y,data.rows*data.pitchY,wide)},z={x:bound(to.x,data.cols*data.pitchX,wide*aspect),y:bound(to.y,data.rows*data.pitchY,wide)};
 const dx=to.x-from.x,dy=to.y-from.y,distance=Math.hypot(dx,dy),sign=dx!==0?Math.sign(dx):Math.sign(dy);
 let x,y,height,roll;
 // Tie translation to the visible world span: a deep zoom must arrive over
 // its subject before it gets close, rather than magnifying a grid gutter.
 if(phase<1){const u=smoother(phase);height=Math.exp(mix(Math.log(start.height),Math.log(wide),u));const travel=(height-start.height)/(wide-start.height);x=mix(start.x,a.x,travel);y=mix(start.y,a.y,travel);roll=mix(start.roll,sign*3,u);}
 else if(phase<3){const u=smoother((phase-1)/2),arc=Math.sin(Math.PI*u)*.12;
  x=mix(a.x,z.x,u)-dy/distance*arc;y=mix(a.y,z.y,u)+dx/distance*arc;height=wide*(1+.025*Math.sin(Math.PI*u));roll=sign*(3+2*Math.sin(Math.PI*u));
 }else{const u=smoother(phase-3);height=Math.exp(mix(Math.log(wide),Math.log(end.height),u));const travel=(wide-height)/(wide-end.height);x=mix(z.x,end.x,travel);y=mix(z.y,end.y,travel);roll=mix(sign*3,end.roll,u);}
 const dissolve=e.spatial?.55:.34;
 const opacity=smoother(phase/.22)*(1-smoother((phase-(4-dissolve))/dissolve));
 return {x,y,height,roll,phase,opacity,from:from.index,to:to.index,direction:dx>0?'E':dx<0?'W':dy>0?'N':'S'};
}
