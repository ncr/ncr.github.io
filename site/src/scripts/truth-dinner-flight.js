import * as THREE from 'three';
import asset from '../data/truth-dinner-asset.json';
import {beatAt,smoother,phraseMotion} from './musical-motion.js';
// Original release scene. Surfaces write depth only; the viewer sees linework only.
export function createDinner(scene,renderer){
 const group=new THREE.Group();group.visible=false;scene.add(group);
 const uniforms={landing:{value:0},paperOrigin:{value:new THREE.Vector2()},paperX:{value:new THREE.Vector2()},paperY:{value:new THREE.Vector2()},glow:{value:1}};
 const landing=`attribute vec2 paperXY;uniform float landing;uniform vec2 paperOrigin;uniform vec2 paperX;uniform vec2 paperY;`;
 const place=`gl_Position=projectionMatrix*modelViewMatrix*vec4(position/32.,1.);vec2 p=paperOrigin+paperXY.x*paperX+paperXY.y*paperY;gl_Position.xy=mix(gl_Position.xy,p*gl_Position.w,landing);`;
 let ready=false,pending;
 function prepare(){if(pending)return pending;pending=Promise.all([fetch(asset.base+'.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json();}),fetch(asset.base+'.bin').then(r=>{if(!r.ok)throw Error(r.status);return r.arrayBuffer();})]).then(([meta,buffer])=>{
  const types={h:Int16Array,H:Uint16Array,b:Int8Array,B:Uint8Array};
  const attr=name=>{const a=meta.attributes[name];return new THREE.BufferAttribute(new types[a.type](buffer,a.offset,a.count),a.itemSize,a.normalized);};
  const geom=new THREE.BufferGeometry();for(const name of ['position','paperXY','normalA','normalB','feature','inkColor','edgeCentre'])geom.setAttribute(name,attr(name));
  const mat=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,vertexShader:`${landing}attribute vec3 normalA;attribute vec3 normalB;attribute vec3 edgeCentre;attribute float feature;attribute vec3 inkColor;varying vec3 ink;varying float visible;void main(){vec3 v=normalize(cameraPosition-edgeCentre/32.);float a=dot(normalA,v),b=dot(normalB,v);visible=feature>.5?step(-.025,max(a,b)):step(a*b,0.);ink=inkColor;${place}}`,fragmentShader:`uniform float glow;varying vec3 ink;varying float visible;void main(){if(visible<.5)discard;gl_FragColor=vec4(ink*glow,.86);}`});
  const lines=new THREE.LineSegments(geom,mat);lines.frustumCulled=false;lines.renderOrder=2;
  const depth=new THREE.BufferGeometry();depth.setAttribute('position',attr('depthPosition'));depth.setAttribute('paperXY',attr('depthPaper'));
  const hide=new THREE.ShaderMaterial({uniforms,colorWrite:false,depthWrite:true,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1,vertexShader:`${landing}void main(){${place}}`,fragmentShader:'void main(){gl_FragColor=vec4(0.);}' });
  const occluder=new THREE.Mesh(depth,hide);occluder.frustumCulled=false;occluder.renderOrder=1;group.add(occluder,lines);group.visible=true;
  // Compile before the shot enters; vertex buffers and topology never change in playback.
  const warmCamera=new THREE.PerspectiveCamera(48,1,.2,4000);warmCamera.position.z=900;const target=new THREE.WebGLRenderTarget(1,1);renderer.setRenderTarget(target);renderer.render(scene,warmCamera);renderer.setRenderTarget(null);target.dispose();group.visible=false;ready=true;
 }).catch(()=>{ready=false;});return pending;}
 function render(camera,plan,elapsed,paper){
  if(!ready){prepare();return null;}group.visible=true;
  const b=beatAt(plan,elapsed),motion=phraseMotion(plan,elapsed),sweep=smoother((b-4)/4),pull=smoother((b-8)/4),approach=smoother(b/4);
  const az=(-55-10*approach+85*sweep-44*pull)*Math.PI/180,el=(25+10*sweep-10*pull)*Math.PI/180;
  const fit=Math.max(540/2,650/(2*camera.aspect))/Math.tan(24*Math.PI/180)*1.22;
  const radius=fit*(.52+.5*approach+.15*pull)/motion.zoom,targetY=(110-125*approach)*(1-pull);
  camera.position.set(Math.sin(az)*Math.cos(el)*radius,targetY+Math.sin(el)*radius,Math.cos(az)*Math.cos(el)*radius);
  const bank=-motion.roll*Math.PI/180;camera.up.set(Math.sin(bank),Math.cos(bank),0);camera.lookAt(0,targetY,0);
  const {width,height,scale,x,y,roll,viewportWidth:w,viewportHeight:h}=paper,r=roll*Math.PI/180,c=Math.cos(r),sn=Math.sin(r),dx=-x*width*scale,dy=-y*height*scale;
  uniforms.paperOrigin.value.set(2*(c*dx-sn*dy)/w,-2*(sn*dx+c*dy)/h);
  uniforms.paperX.value.set(2*c*width*scale/w,-2*sn*width*scale/h);uniforms.paperY.value.set(-2*sn*height*scale/w,-2*c*height*scale/h);
  uniforms.landing.value=smoother((b-8)/2);uniforms.glow.value=1+.17*motion.pulse;
  const fade=smoother((b-10)/2);return {opacity:smoother(b)*(1-fade),fade,landing:uniforms.landing.value,beat:b,az,bank};
 }
 return {group,prepare,render};
}
