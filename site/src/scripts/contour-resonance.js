import * as THREE from 'three';
import cues from '../data/contour-cues.json';
import assets from '../data/contour-assets.json';
import {beatAt,smoother} from './musical-motion.js';

// An authored graphic echo, not an invented reverse side or a mechanical simulation.
// All positions, path lengths and copies are immutable offline buffers: one extra draw call.
export function cueAt(plan,elapsed){
 const cue=!plan.intro&&cues[plan.id];if(!cue)return null;
 const beat=beatAt(plan,elapsed),open=smoother((beat-cue.startBeat)/(cue.crestBeat-cue.startBeat))*(1-smoother((beat-cue.crestBeat)/(cue.closeBeat-cue.crestBeat)));
 const opacity=smoother((beat-cue.startBeat)/2)*(1-smoother((beat-cue.closeBeat)/2));
 return {cue,beat,open,opacity};
}
export async function loadContours(id){
 if(!assets[id])return null;
 const response=await fetch(assets[id].base+'.bin');if(!response.ok)throw Error(response.status);
 return response.arrayBuffer();
}
export function buildContours(id,buffer,placement,spectrum){
 if(!buffer)return null;const cue=cues[id],meta=assets[id];
 const geometry=new THREE.BufferGeometry(),data=new THREE.InterleavedBuffer(new Float32Array(buffer),6);
 for(const [name,n,offset]of [['position',3,0],['pathU',1,3],['voice',1,4],['layer',1,5]])geometry.setAttribute(name,new THREE.InterleavedBufferAttribute(data,n,offset));
 const uniforms={...placement,beat:{value:0},open:{value:0},opacity:{value:0},clock:{value:0},audible:{value:0},bands:{value:spectrum},tint:{value:new THREE.Vector3(...cue.tint)},depth:{value:cue.depth},spread:{value:cue.spread},mode:{value:{echo:0,weave:1,fan:2}[cue.mode]}};
 const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
 vertexShader:`attribute float pathU;attribute float voice;attribute float layer;
 uniform float beat,open,clock,depth,spread,mode,landing;
 uniform vec2 paperOrigin,paperX,paperY;
 varying float vPath,vVoice,vLayer;
 void main(){
  vPath=pathU;vVoice=voice;vLayer=layer;
  vec3 at=position;float q=layer*open;
  if(mode<.5){
   // Repeated outlines recede like a physical stack of luminous tracing paper.
   at.xy*=1.+q*spread;at.z-=q*depth;
  }else if(mode<1.5){
   // Opposing ribbons: movement is continuous; beat travels as light along them.
   float wave=sin(pathU*6.283185+voice*6.283185-clock*.7+layer*.65);
   at.z-=q*depth*(.55+.45*wave);
   at.x+=open*depth*.36*wave;at.y+=q*spread*20.*cos(pathU*6.283185+clock*.45);
  }else{
   // A small fan of original contour impressions, closing back onto the source.
   float angle=(layer-2.5)*spread*open,c=cos(angle),s=sin(angle);
   at.xy=mat2(c,-s,s,c)*at.xy*(1.+q*.028);at.z-=q*depth;
  }
  gl_Position=projectionMatrix*modelViewMatrix*vec4(at,1.);
  vec2 paper=paperOrigin+position.x*paperX+position.y*paperY;
  gl_Position.xy=mix(gl_Position.xy,paper*gl_Position.w,landing);
 }`,
 fragmentShader:`uniform float beat,opacity,audible;uniform float bands[16];uniform vec3 tint;
 varying float vPath,vVoice,vLayer;
 void main(){
  // Sinusoidal phase is continuous across every downbeat: no resetting streaks.
  float wave=pow(.5+.5*cos(6.283185*(vPath-beat*.25+vLayer*.09+vVoice*.12)),18.);
  float accent=pow(.5+.5*cos(6.283185*(beat-vLayer*.25)),7.);
  float energy=audible*bands[int(mod(floor(vVoice*16.),16.))];
  float alpha=opacity*(.045+wave*(.56+energy*.38)+accent*.065)/(1.+vLayer*.22);
  vec3 color=mix(tint,vec3(1.,.94,.81),wave*.55)*(1.+energy*.5);
  gl_FragColor=vec4(color,alpha);
 }`});
 const lines=new THREE.LineSegments(geometry,material);lines.frustumCulled=false;lines.visible=false;
 return {lines,update(plan,elapsed,active){const state=cueAt(plan,elapsed);lines.visible=Boolean(state&&state.opacity>.001);if(state){uniforms.beat.value=state.beat;uniforms.clock.value=elapsed;uniforms.open.value=state.open;uniforms.opacity.value=state.opacity;uniforms.audible.value=active?1:0;}return state;},dispose(){geometry.dispose();material.dispose();}};
}
