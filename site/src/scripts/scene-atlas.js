import * as THREE from 'three';
import data from '../data/scene-atlas.json';
import {bridgeAt,atlasCamera} from './atlas-motion.js';

export function createSceneAtlas(host,onReady){
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,100);
 const element=document.createElement('canvas');element.className='scene-atlas';element.setAttribute('aria-hidden','true');host.append(element);
 let renderer,ready=false,failed=false,lastW=0,lastH=0,energy={active:false,bass:0};
 const textures=new Map(),loading=new Set(),textureLoader=new THREE.TextureLoader();
 const uniforms={clock:{value:0},bass:{value:0},atlas:{value:null},highA:{value:null},highB:{value:null},indexA:{value:-1},indexB:{value:-1},close:{value:0}};
 const vertex=`attribute vec2 pageUV;attribute float pageIndex;varying vec2 texUV;varying vec2 localUV;varying float page;void main(){texUV=uv;localUV=pageUV;page=pageIndex;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
 const fragment=`uniform sampler2D atlas,highA,highB;uniform float indexA,indexB,clock,bass,close;varying vec2 texUV;varying vec2 localUV;varying float page;
 void main(){vec4 color=texture2D(atlas,texUV);if(abs(page-indexA)<.1)color=texture2D(highA,localUV);else if(abs(page-indexB)<.1)color=texture2D(highB,localUV);
 float breathe=1.+(1.-close)*(.013*sin(clock*.7+page*1.71)+bass*.02);gl_FragColor=vec4(color.rgb*breathe,1.);
 #include <colorspace_fragment>
 }`;
 const paperMaterial=new THREE.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:fragment});
 const lineMaterial=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:`attribute float pathU,phaseSeed,pageIndex;varying float along,seed,page;void main(){along=pathU;seed=phaseSeed;page=pageIndex;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float clock,bass,close;varying float along,seed,page;void main(){float wave=pow(.5+.5*cos(6.283185*(along-clock*.19-seed)),14.);float glow=(.045+wave*(.48+bass*.2))*(1.-close);vec3 tint=mix(vec3(.32,.65,.75),vec3(.82,.57,.27),.5+.5*sin(page*1.7));gl_FragColor=vec4(tint,glow);}`});
 async function prepare(){
  try{
   const [texture,response]=await Promise.all([textureLoader.loadAsync(data.base+'.webp'),fetch(data.base+'.bin')]);if(!response.ok)throw Error(response.status);
   const buffer=await response.arrayBuffer();texture.colorSpace=THREE.SRGBColorSpace;uniforms.atlas.value=uniforms.highA.value=uniforms.highB.value=texture;
   // One batch of 42 paper rectangles and one immutable batch of real contour lines.
   const positions=[],uv=[],pageUV=[],indices=[];
   for(const t of data.tiles)for(const [u,v]of [[0,0],[1,0],[0,1],[1,0],[1,1],[0,1]]){
    positions.push(t.x+(u-.5)*data.tileWidth,t.y+v-.5,0);uv.push(t.uv[0]+u*(t.uv[2]-t.uv[0]),t.uv[1]+v*(t.uv[3]-t.uv[1]));pageUV.push(u,v);indices.push(t.index);
   }
   const geometry=new THREE.BufferGeometry();for(const [name,values,n]of [['position',positions,3],['uv',uv,2],['pageUV',pageUV,2],['pageIndex',indices,1]])geometry.setAttribute(name,new THREE.Float32BufferAttribute(values,n));
   scene.add(new THREE.Mesh(geometry,paperMaterial));
   const lines=new THREE.BufferGeometry(),interleaved=new THREE.InterleavedBuffer(new Float32Array(buffer),6);
   for(const [name,n,offset]of [['position',3,0],['pathU',1,3],['phaseSeed',1,4],['pageIndex',1,5]])lines.setAttribute(name,new THREE.InterleavedBufferAttribute(interleaved,n,offset));
   const ink=new THREE.LineSegments(lines,lineMaterial);ink.frustumCulled=false;scene.add(ink);
   renderer=new THREE.WebGLRenderer({canvas:element,alpha:false,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x07090e,1);renderer.setSize(1,1,false);
   camera.position.z=10;camera.lookAt(0,0,0);renderer.render(scene,camera);ready=true;host.dataset.atlasReady='1';onReady();
  }catch{failed=true;hide();}
 }
 function loadHigh(id){
  if(textures.has(id)||loading.has(id))return;loading.add(id);const tile=data.tiles.find(t=>t.id===id);
  textureLoader.loadAsync(tile.film).then(texture=>{texture.colorSpace=THREE.SRGBColorSpace;renderer?.initTexture(texture);textures.set(id,texture);onReady();}).catch(()=>{}).finally(()=>loading.delete(id));
 }
 function render(time,paper){
  if(failed)return false;
  const bridge=bridgeAt(data,time),next=bridge||data.bridges.find(b=>b.beats[0]>time);
  if(next&&next.beats[0]-time<9){loadHigh(next.fromId);loadHigh(next.toId);for(const [id,texture]of textures){if(textures.size<=4)break;if(id!==next.fromId&&id!==next.toId){texture.dispose();textures.delete(id);}}}
  if(!ready||!bridge||!paper?.atlasDeparture){hide();return false;}
  const w=paper.viewportWidth,h=paper.viewportHeight;if(!w||!h)return false;
  if(w!==lastW||h!==lastH){renderer.setSize(w,h,false);lastW=w;lastH=h;}
  const pose=atlasCamera(data,bridge,time,w/h,paper.atlasDeparture),r=pose.roll*Math.PI/180;
  camera.left=-pose.height*w/h/2;camera.right=-camera.left;camera.top=pose.height/2;camera.bottom=-camera.top;camera.updateProjectionMatrix();camera.position.set(pose.x,pose.y,10);camera.up.set(-Math.sin(r),Math.cos(r),0);camera.lookAt(pose.x,pose.y,0);
  uniforms.clock.value=time;uniforms.bass.value=energy.active?energy.bass:0;
  uniforms.close.value=Math.max(0,1-pose.phase,pose.phase-3);
  for(const [id,key,index]of [[bridge.fromId,'A',pose.from],[bridge.toId,'B',pose.to]]){uniforms['high'+key].value=textures.get(id)||uniforms.atlas.value;uniforms['index'+key].value=textures.has(id)?index:-1;}
  element.style.display='block';element.style.opacity=String(pose.opacity);host.dataset.atlasActive='1';host.dataset.atlasOpaque=String(pose.opacity>.998?1:0);
  element.dataset.from=bridge.fromId;element.dataset.to=bridge.toId;element.dataset.direction=pose.direction;element.dataset.phase=pose.phase.toFixed(4);element.dataset.viewHeight=pose.height.toFixed(4);element.dataset.scenes='42';element.dataset.clock=time.toFixed(3);element.dataset.apertureWidth=pose.apertureWidth.toFixed(4);element.dataset.apertureHeight=pose.apertureHeight.toFixed(4);
  if(pose.opacity>.001){
   const frameW=Math.min(w,pose.apertureWidth*h/pose.height),frameH=Math.min(h,pose.apertureHeight*h/pose.height);
   renderer.setScissorTest(false);renderer.clear();renderer.autoClear=false;
   renderer.setScissor((w-frameW)/2,(h-frameH)/2,frameW,frameH);renderer.setScissorTest(true);
   renderer.render(scene,camera);renderer.setScissorTest(false);renderer.autoClear=true;
  }
  return pose.opacity>.998;
 }
 function hide(){element.style.display='none';host.dataset.atlasActive='0';host.dataset.atlasOpaque='0';}
 element.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;hide();});prepare();
 return {render,hide,setAudioLevels(value){energy=value;}};
}
