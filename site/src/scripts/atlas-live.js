import {smoother} from './musical-motion.js';
// Warm the next scene before its musical phrase. At the end of the flight its
// time AND velocity meet the ordinary scene clock, so landing never restarts ink.
export function incomingClock(bridge,time){
 const [begin,,start,,end]=bridge.beats,duration=end-begin;
 if(time>=end)return time-start;
 const u=Math.max(0,(time-begin)/duration),u2=u*u,u3=u2*u;
 return (end-start)*(3*u2-2*u3)+duration*(u3-u2);
}
export const liveReveal=phase=>smoother(phase/4);
export const liveLanding=phase=>smoother((phase-2.15)/1.85);
// The live tile finishes as the exact viewport quad. No final bitmap dissolve.
export const liveTileVertex=`varying vec2 tileUV;uniform float landing;void main(){
 tileUV=uv;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);
 gl_Position=vec4(mix(p.xy/p.w,uv*2.-1.,landing),mix(p.z/p.w,0.,landing),1.);
}`;
