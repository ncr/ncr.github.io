import * as THREE from 'three';
import {createDinner} from './truth-dinner-flight.js';
import timing from '../data/flight-timing.json';
import drawingScore from '../data/drawing-score.json';
import musicGrid from '../data/music-grid.json';
import {inkTime,pullAt,smoother,beatAt,phraseMotion} from './musical-motion.js';
import filmAssets from '../data/film-assets.json';
import {bassAttacksAt} from './bass-particles.js';

const orbitPlan={beats:timing.beats.map(t=>t-timing.orbit),seed:102,pullBeat:8,revealBeat:12};
const clamp=t=>THREE.MathUtils.clamp(t,0,1);
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const landingUniforms=`uniform float landing;uniform vec2 paperOrigin;uniform vec2 paperX;uniform vec2 paperY;`;
const landVertex=`vec2 paper=paperOrigin+position.x*paperX+position.y*paperY;gl_Position.xy=mix(gl_Position.xy,paper*gl_Position.w,landing);`;
const voiceSpectrum=`
 float voiceEnergy(float v){
  if(v<.5)return (bands[0]+bands[1]+bands[2])/3.;
  if(v<1.5)return (bands[3]+bands[4]+bands[5])/3.;
  if(v<2.5)return (bands[6]+bands[7]+bands[8])/3.;
  if(v<3.5)return (bands[9]+bands[10]+bands[11])/3.;
  if(v<4.5)return (bands[12]+bands[13])/2.;
  return (bands[14]+bands[15])/2.;
 }
 vec3 voiceColor(float v){return mix(vec3(1.,.62,.25),vec3(.28,.78,1.),v/5.);}
`;
const pointVertex=`${landingUniforms}
 attribute float lane;attribute float spark;uniform sampler2D penTable;uniform vec2 tableSize;uniform float elapsed;uniform float penFPS;uniform float audible;uniform float bands[16];uniform float pixelRatio;uniform float mutedHero;uniform vec2 beatTimes;uniform vec2 beatStrengths;
 varying float alpha;varying vec3 tint;${voiceSpectrum}
 vec4 pen(float row,float time){
  float f=clamp(time*penFPS,0.,tableSize.x-1.001),i=floor(f),u=fract(f);
  vec4 a=texture2D(penTable,vec2((i+.5)/tableSize.x,(row+.5)/tableSize.y));
  vec4 b=texture2D(penTable,vec2((i+1.5)/tableSize.x,(row+.5)/tableSize.y));
  if(abs(a.w-b.w)<.1)return vec4(mix(a.xyz,b.xyz,u),step(.5,a.w));
  return vec4(u<.5?a.xyz:b.xyz,(u<.5?step(.5,a.w):step(.5,b.w))*pow(abs(2.*u-1.),2.));
 }
 void main(){
  if(lane>=tableSize.y||abs(lane-mutedHero)<.1){alpha=0.;tint=vec3(0.);gl_PointSize=1.;gl_Position=vec4(2.,2.,2.,1.);return;}
  float voice=lane-20.,choral=step(20.,lane);
  float bin=mod(max(0.,spark),16.),power=mix(.10,pow(clamp(bands[int(bin)]*1.65,0.,1.),.8),audible);
  if(choral>.5)power=mix(.10,pow(clamp(voiceEnergy(voice)*1.65,0.,1.),.8),audible);
  float age=0.,strength=0.,emitted=elapsed,seed=0.,life=.4;
  if(spark>=0.){
   float slot=step(24.,spark),number=mod(spark,24.);
   float hit=mix(beatTimes.x,beatTimes.y,slot);strength=mix(beatStrengths.x,beatStrengths.y,slot);
   seed=fract(sin(number*127.1+lane*311.7+hit*19.19)*43758.5453);
   float delay=.045*fract(seed*7.13);emitted=hit+delay;age=elapsed-emitted;
   life=.19+strength*.14+seed*.10;
   if(strength<=0.||age<0.||age>life||number>6.+strength*17.){alpha=0.;tint=vec3(0.);gl_PointSize=1.;gl_Position=vec4(2.,2.,2.,1.);return;}
  }
  vec4 tip=pen(lane,emitted);vec3 at=tip.xyz;alpha=tip.w;
  tint=vec3(.65,.86,1.);float diameter=lane>=14.?26.:4.;
  if(choral>.5){tint=voiceColor(voice);diameter=mix(34.,23.,voice/5.)+power*24.;alpha*=.5+power;}
  if(spark>=0.){
   vec4 before=pen(lane,max(0.,emitted-.025));vec2 delta=tip.xy-before.xy;vec2 tangent=length(delta)>.01?normalize(delta):vec2(1.,0.);
   vec2 normal=vec2(-tangent.y,tangent.x);
   float angle=6.2831853*seed,speed=(22.+strength*95.)*(.4+fract(seed*13.37)*.8);
   // One short, irregular spray per bass attack, followed by empty space.
   at.xy+=age*speed*(normal*sin(angle)-tangent*(.2+.6*abs(cos(angle))));
   at.y-=age*age*(25.+seed*45.);at.z+=sin(angle*1.7)*age*speed*.25;
   alpha=tip.w*smoothstep(0.,.012,age)*pow(1.-age/life,1.25)*(.5+strength*1.5);
   diameter=2.+strength*3.+(seed>.87?3.:0.);
   tint=choral>.5?voiceColor(voice):mix(vec3(1.,.7,.34),vec3(.35,.8,1.),seed);
  }
  gl_PointSize=diameter*pixelRatio;gl_Position=projectionMatrix*modelViewMatrix*vec4(at,1.);
  vec2 paper=paperOrigin+at.x*paperX+at.y*paperY;gl_Position.xy=mix(gl_Position.xy,paper*gl_Position.w,landing);
 }`;
const pointFragment=`varying float alpha;varying vec3 tint;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float core=exp(-r*r*28.);float halo=pow(1.-r,2.);gl_FragColor=vec4(mix(tint,vec3(1.,.96,.88),core),(core+halo*.55)*alpha);}`;

// Projected vectors from the released sheets; the nozzle and dinner use original full 3D geometry.
// Other sheets float as linework, with slight depth separation; no invented reverse side.
export function createFlight(host,onReady=()=>{}){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
 const element=renderer.domElement;element.className='fusion-flight';element.setAttribute('aria-hidden','true');host.append(element);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(48,1,.2,4000);
 const dinner=createDinner(scene,renderer);let dinnerQueued=false;
 const cache=new Map(),pending=new Map(),unavailable=new Set();
 let current,lastW=0,lastH=0,failed=false,energy={active:false,bass:0,mids:0,highs:0};
 const paperMaterial=new THREE.ShaderMaterial({uniforms:{paper:{value:new THREE.Vector3(.1,.05,.05)}},vertexShader:`varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform vec3 paper;varying vec2 v;void main(){float grain=fract(sin(dot(v,vec2(127.1,311.7)))*43758.5453);float light=exp(-length((v-.5)*2.)*2.);gl_FragColor=vec4(paper*(.66+light*.5)+(grain-.5)*.008,1.);}`});
 const board=new THREE.Mesh(new THREE.PlaneGeometry(3500,2500),paperMaterial);board.position.z=-25;scene.add(board);
 // Only the three introductory close-up cuts use this GPU-only dissolve.
 // Both baked poses keep moving during the long intro dissolve; no CPU readback.
 const cutScene=new THREE.Scene(),cutCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 const cutMaterial=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{before:{value:null},after:{value:null},blend:{value:1}},vertexShader:`varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`uniform sampler2D before;uniform sampler2D after;uniform float blend;varying vec2 uv0;void main(){gl_FragColor=mix(texture2D(before,uv0),texture2D(after,uv0),blend);}`});
 cutScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),cutMaterial));renderer.compile(cutScene,cutCamera);
 let cutBefore,cutAfter,cutKey='',cutSize='';const fallbackBridge=host.querySelector('.scene-bridge');
 function cutTargets(w,h){const size=w+':'+h;if(cutSize===size)return;cutSize=size;cutKey='';cutBefore?.dispose();cutAfter?.dispose();const ratio=renderer.getPixelRatio();cutBefore=new THREE.WebGLRenderTarget(Math.round(w*ratio),Math.round(h*ratio),{samples:2});cutAfter=new THREE.WebGLRenderTarget(Math.round(w*ratio),Math.round(h*ratio),{samples:2});}
 const detail=new THREE.Group();scene.add(detail);detail.visible=false;
 const spectrum=new Float32Array(16),beatFrame=new Float32Array(4),pose=new Float32Array(7);let previousFrame=0;
 const gp=new THREE.BufferGeometry(),lanes=[],sparks=[];
 for(let i=0;i<26;i++){lanes.push(i);sparks.push(-1);}
 for(let i=14;i<26;i++)for(let j=0;j<48;j++){lanes.push(i);sparks.push(j);}
 gp.setAttribute('position',new THREE.BufferAttribute(new Float32Array(lanes.length*3),3));gp.setAttribute('lane',new THREE.Float32BufferAttribute(lanes,1));gp.setAttribute('spark',new THREE.Float32BufferAttribute(sparks,1));
 const idle=fn=>(window.requestIdleCallback?requestIdleCallback(fn,{timeout:1200}):setTimeout(fn,0));
 function build(data,buffer){
   const group=new THREE.Group(),geometry=new THREE.BufferGeometry();
   for(const [key,a]of Object.entries(data.attributes))geometry.setAttribute(key,new THREE.BufferAttribute(new Float32Array(buffer,a.offset*4,a.count),a.itemSize));
   const placement={landing:{value:0},paperOrigin:{value:new THREE.Vector2()},paperX:{value:new THREE.Vector2()},paperY:{value:new THREE.Vector2()}};
   const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{...placement,leadIndex:{value:0},leadProgress:{value:0},progress:{value:0},pulse:{value:0},bands:{value:spectrum},audible:{value:0},choirProgress:{value:new Float32Array(6)}},vertexShader:`${landingUniforms}attribute vec3 inkColor;attribute float birth;attribute float penId;attribute float along;uniform float leadIndex;varying float selected;varying float voice;varying vec3 color;varying float born;void main(){selected=1.-step(.1,abs(penId-leadIndex));voice=penId-20.;color=inkColor;born=mix(birth,along,max(selected,step(20.,penId)));gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);${landVertex}}`,fragmentShader:`uniform float progress;uniform float pulse;uniform float leadProgress;uniform float choirProgress[6];uniform float audible;uniform float bands[16];varying float selected;varying float voice;varying vec3 color;varying float born;${voiceSpectrum}void main(){float front=mix(progress,leadProgress,selected);if(voice>=0.)front=choirProgress[int(voice)];float laid=step(born,front);float tip=laid*(1.-smoothstep(0.,.024,front-born));vec3 ink=sqrt(color)*(.7+tip*.65+pulse*.18);if(voice>=0.){float power=audible*voiceEnergy(voice);ink=mix(sqrt(color)*.7,voiceColor(voice)*(1.+power*1.8),tip); }gl_FragColor=vec4(ink,.045+laid*.85);}`});

   group.add(new THREE.LineSegments(geometry,material));
   const plans={};
   for(const [start,p]of Object.entries(data.plans)){
    const texture=new THREE.DataTexture(new Float32Array(buffer,p.pens.offset*4,p.pens.count),p.penWidth,p.penRows||20,THREE.RGBAFormat,THREE.FloatType);texture.needsUpdate=true;
    plans[start]={...p,texture,camera:new Float32Array(buffer,p.camera.offset*4,p.camera.count)};
   }
   const pm=new THREE.ShaderMaterial({uniforms:{...placement,penTable:{value:null},tableSize:{value:new THREE.Vector2()},elapsed:{value:0},penFPS:{value:60},audible:{value:0},bands:{value:spectrum},pixelRatio:{value:Math.min(devicePixelRatio,1.5)},mutedHero:{value:-1},beatTimes:{value:new THREE.Vector2(-1000,-1000)},beatStrengths:{value:new THREE.Vector2()}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:pointVertex,fragmentShader:pointFragment});
   const points=new THREE.Points(gp,pm);points.frustumCulled=false;group.add(points);scene.add(group);group.visible=false;
   return {data,group,geometry,material,placement,pm,plans,warmed:false,dispose(){scene.remove(group);geometry.dispose();material.dispose();pm.dispose();for(const p of Object.values(plans))p.texture.dispose();}};
 }
 function warm(sheet){
   if(sheet.warmed||failed)return;sheet.warmed=true;
   // Upload and compile ahead of the cut into a tiny offscreen target.
   const was=sheet.group.visible;sheet.group.visible=true;const first=Object.values(sheet.plans)[0];sheet.pm.uniforms.penTable.value=first.texture;sheet.pm.uniforms.tableSize.value.set(first.penWidth,first.penRows||20);
   for(const p of Object.values(sheet.plans))renderer.initTexture(p.texture);
   const target=new THREE.WebGLRenderTarget(1,1);renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);target.dispose();sheet.group.visible=was;
 }
 function prepare(id){
   if(id==='o10'&&!dinnerQueued){dinnerQueued=true;dinner.prepare().then(onReady);}
   if(cache.has(id)||pending.has(id)||unavailable.has(id))return;
   const base=filmAssets[id];
   const promise=Promise.all([fetch(base+'.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json();}),fetch(base+'.bin').then(r=>{if(!r.ok)throw Error(r.status);return r.arrayBuffer();})]).then(([data,buffer])=>new Promise(resolve=>idle(()=>{
     if(failed){resolve();return;}const sheet=build(data,buffer);cache.set(id,sheet);warm(sheet);
     for(const [key,value]of cache){if(cache.size<=6)break;if(key!==current){value.dispose();cache.delete(key);}}
     onReady();resolve();
   }))).catch(()=>unavailable.add(id)).finally(()=>pending.delete(id));pending.set(id,promise);
 }
 let nozzleReady=false,nozzlePending;
 function prepareNozzle(){if(nozzlePending)return;nozzlePending=Promise.all([fetch('/gallery/destiny/film-data/nozzle.json').then(r=>r.json()),fetch('/gallery/destiny/film-data/nozzle.bin').then(r=>r.arrayBuffer())]).then(([m,b])=>{
  const g=new THREE.BufferGeometry(),n=m.vertices;g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(b,0,n*3),3));g.setAttribute('inkColor',new THREE.BufferAttribute(new Float32Array(b,n*12,n*3),3));g.setAttribute('band',new THREE.BufferAttribute(new Float32Array(b,n*24,n),1));
  const mat=new THREE.ShaderMaterial({transparent:true,uniforms:{levels:{value:new THREE.Vector3(.6,.6,.6)}},vertexShader:`attribute vec3 inkColor;attribute float band;uniform vec3 levels;varying vec3 c;varying float a;void main(){c=inkColor;a=.35+.55*(band<.5?levels.x:band<1.5?levels.y:levels.z);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 c;varying float a;void main(){gl_FragColor=vec4(c,a);}`});
  detail.add(new THREE.LineSegments(g,mat));idle(()=>{if(failed)return;const was=detail.visible;detail.visible=true;const target=new THREE.WebGLRenderTarget(1,1);renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);target.dispose();detail.visible=was;nozzleReady=true;onReady();});
 }).catch(()=>{});}
 function render(time,passage,paperFrame,internal=false){
   if(failed)return false;
   const w=paperFrame?.viewportWidth||lastW||host.clientWidth,h=paperFrame?.viewportHeight||lastH||host.clientHeight;if(!w||!h)return false;
   if(w!==lastW||h!==lastH){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();lastW=w;lastH=h;}
   let introBlend=false,blend=1;
   if(!internal){
    host.dataset.liveBlend='0';
    if(passage?.intro&&passage.start>0&&time-passage.start<musicGrid.introDissolve){
     const prior=drawingScore.find(p=>p.end===passage.start);
     if(prior){prepare(prior.id);if(cache.has(prior.id)&&cache.has(passage.id)){
      cutTargets(w,h);const key=passage.start+':'+cutSize;
      renderer.setRenderTarget(cutBefore);render(prior.end+(time-passage.start),prior,paperFrame,true);renderer.setRenderTarget(null);cutKey=key;
      introBlend=true;blend=smoother((time-passage.start)/musicGrid.introDissolve);host.dataset.liveBlend='1';host.dataset.introBlend=blend.toFixed(4);if(fallbackBridge)fallbackBridge.hidden=true;
     }}
    }else if(time>=musicGrid.entrance&&cutBefore){cutBefore.dispose();cutAfter.dispose();cutBefore=cutAfter=null;cutSize='';cutKey='';}
   }
   const now=performance.now(),dt=Math.min(.05,(now-previousFrame)/1000||.016);previousFrame=now;
   for(let i=0;i<16;i++){const target=energy.active?(energy.spectrum?.[i]??[energy.bass,energy.mids,energy.highs][Math.min(2,Math.floor(i/6))]):0;spectrum[i]+=(target-spectrum[i])*(1-Math.exp(-dt/(target>spectrum[i]?(i<6?.055:.025):(i<6?.18:.075))));}
   const orbiting=time>=timing.orbit&&time<timing.end;
   for(const sheet of cache.values())sheet.group.visible=false;
   detail.visible=orbiting;board.visible=!orbiting;dinner.group.visible=false;
   const roll=Math.sin(time*.42)*.04+Math.sin(time*.17)*.019;
   camera.up.set(Math.sin(roll),Math.cos(roll),0);
   const dinnerState=passage?.id==='o10'&&paperFrame?dinner.render(camera,passage,time-passage.start,paperFrame):null;
   if(dinnerState){
     board.visible=false;current='o10';const state=dinnerState;
     const p=cache.get('o10')?.data.paper||[41,31,21];paperMaterial.uniforms.paper.value.set(p[0]/255,p[1]/255,p[2]/255);renderer.setClearColor(new THREE.Color().setRGB(p[0]/255,p[1]/255,p[2]/255,THREE.SRGBColorSpace),1);
     element.style.opacity=String(state.opacity);element.style.filter='none';element.dataset.drawing='o10';element.dataset.spatial='truth-dinner';element.dataset.orbitAzimuth=state.az.toFixed(5);element.dataset.beat=String(state.beat);element.dataset.phase=state.beat>=12?'hold':state.beat>=8?'pull':'orbit';element.dataset.dissolve=state.fade.toFixed(5);element.dataset.landing=state.landing.toFixed(5);
   }else if(orbiting){
     element.dataset.spatial='nozzle';prepareNozzle();if(!nozzleReady){hide();return false;}detail.children[0].material.uniforms.levels.value.set(energy.active?energy.bass:.6,energy.active?energy.mids:.6,energy.active?energy.highs:.6);
     renderer.setClearColor(0x100c10,1);element.style.filter='none';
     const elapsed=time-timing.orbit,duration=timing.end-timing.orbit,b=beatAt(orbitPlan,elapsed),motion=phraseMotion(orbitPlan,elapsed),u=clamp((b-4)/8),angle=-.8+smoother(u)*Math.PI*1.4,radius=Math.max(220,135/camera.aspect)*(1+.35*(1-smoother(b/4))+.3*smoother((b-12)/4))/motion.zoom;
     const bank=-motion.roll*Math.PI/180;camera.up.set(Math.sin(bank),Math.cos(bank),0);camera.position.set(Math.sin(angle)*radius,45+40*Math.sin(smoother(u)*Math.PI),Math.cos(angle)*radius);camera.lookAt(0,0,0);
     element.style.opacity=String(smoother(b/2)*(1-smoother((b-12)/4)));element.dataset.drawing='nozzle-orbit';
   }else{
     if(!passage){hide();return false;}
     element.dataset.spatial='drawing';current=passage.id;prepare(current);const sheet=cache.get(current);if(!sheet){hide();return false;}
     sheet.group.visible=true;
     const duration=passage.end-passage.start,elapsed=time-passage.start,u=clamp(elapsed/duration);
     const drawDuration=passage.leadEnd,musicalElapsed=inkTime(passage,elapsed),progress=clamp(musicalElapsed/drawDuration);
     const plan=sheet.plans[passage.start],leadIndex=plan.leadIndex;
     const leadProgress=clamp((musicalElapsed-passage.leadStart)/(passage.leadEnd-passage.leadStart));
     sheet.material.uniforms.leadIndex.value=leadIndex;sheet.material.uniforms.leadProgress.value=leadProgress;sheet.material.uniforms.progress.value=progress;sheet.material.uniforms.pulse.value=energy.active?energy.bass:0;
     sheet.material.uniforms.audible.value=energy.active?1:0;
     if(plan.choirWindows)for(let v=0;v<6;v++){const [start,end]=plan.choirWindows[v];sheet.material.uniforms.choirProgress.value[v]=clamp((musicalElapsed-start)/(end-start));}
     sheet.pm.uniforms.mutedHero.value=plan.mutedHero??-1;
     bassAttacksAt(time,energy.active&&time>=musicGrid.entrance,beatFrame);
     sheet.pm.uniforms.beatTimes.value.set(beatFrame[0]-passage.start,beatFrame[2]-passage.start);
     sheet.pm.uniforms.beatStrengths.value.set(beatFrame[1],beatFrame[3]);
     sheet.pm.uniforms.penTable.value=plan.texture;sheet.pm.uniforms.tableSize.value.set(plan.penWidth,plan.penRows||20);sheet.pm.uniforms.elapsed.value=elapsed;sheet.pm.uniforms.audible.value=energy.active?1:0;
     const paper=sheet.data.paper;paperMaterial.uniforms.paper.value.set(paper[0]/255,paper[1]/255,paper[2]/255);renderer.setClearColor(new THREE.Color(paper[0]/255,paper[1]/255,paper[2]/255),1);
     const [bw,bh]=sheet.data.size,fit=Math.max(bh/2,bw/(2*camera.aspect))/Math.tan(24*Math.PI/180)*1.22;
     const at=Math.min(elapsed,duration+(passage.tail||0))*plan.cameraFPS,i=Math.min(plan.camera.length/7-2,Math.floor(at)),uPose=at-i;
     for(let j=0;j<7;j++)pose[j]=plan.camera[i*7+j]+(plan.camera[(i+1)*7+j]-plan.camera[i*7+j])*uPose;
     camera.position.set(pose[0],pose[1],pose[2]*fit);camera.up.set(Math.sin(pose[6]),Math.cos(pose[6]),0);camera.lookAt(pose[3],pose[4],pose[5]);
     const pull=pullAt(passage,elapsed);
     // Register early in the retreat; both layers keep pulling back together while dissolving.
     const registration=sheet.data.registration;
     let landed=0,fade=0;
     if(paperFrame&&registration){
       const {width,height,scale,x,y,roll}=paperFrame,r=roll*Math.PI/180,c=Math.cos(r),sn=Math.sin(r);
       const dx=(registration.center[0]/2560-x)*width*scale,dy=(registration.center[1]/1080-y)*height*scale;
       const unit=registration.unit*width*scale/2560;
       sheet.placement.paperOrigin.value.set(2*(c*dx-sn*dy)/w,-2*(sn*dx+c*dy)/h);
       sheet.placement.paperX.value.set(2*c*unit/w,-2*sn*unit/h);
       sheet.placement.paperY.value.set(2*sn*unit/w,2*c*unit/h);
       landed=smoother(pull/.5);
       fade=smoother((pull-.5)/.5);
     }else fade=smoother((pull-.5)/.5);
     sheet.placement.landing.value=landed;
     element.style.opacity=String((passage.intro?1:smoother(elapsed/(passage.beats?.[1]||.32)))*(1-fade));
     // A subpixel focus dissolve softens tiny differences in ink/antialiasing only.
     element.style.filter=fade>0?`blur(${(.65*Math.sin(fade*Math.PI)).toFixed(3)}px)`:'none';
     element.dataset.landing=landed.toFixed(4);element.dataset.dissolve=fade.toFixed(4);
     element.dataset.phase=elapsed>=passage.holdStart?'hold':elapsed>=passage.followEnd?'pull':'follow';
     element.dataset.beat=String(beatAt(passage,elapsed));element.dataset.phrase=String(passage.phrase??-1);
     element.dataset.range=(camera.position.z/fit).toFixed(4);element.dataset.leadProgress=leadProgress.toFixed(4);
     camera.updateMatrixWorld();const table=plan.texture.image.data,px=Math.min(plan.penWidth-1,Math.floor(elapsed*plan.penFPS)),off=((14+leadIndex)*plan.penWidth+px)*4;
     const penInFrame=new THREE.Vector3(table[off],table[off+1],table[off+2]).project(camera);element.dataset.followError=Math.hypot(penInFrame.x,penInFrame.y).toFixed(4);
     element.dataset.spectrumPeak=Math.max(...spectrum).toFixed(4);
     element.dataset.drawing=current;element.dataset.progress=progress.toFixed(3);
   }
   element.style.display='block';
   if(Number(element.style.opacity)>.001){
    if(introBlend){renderer.setRenderTarget(cutAfter);renderer.render(scene,camera);renderer.setRenderTarget(null);cutMaterial.uniforms.before.value=cutBefore.texture;cutMaterial.uniforms.after.value=cutAfter.texture;cutMaterial.uniforms.blend.value=blend;renderer.render(cutScene,cutCamera);}
    else renderer.render(scene,camera);
   }
   return true;
 }
 function hide(){element.style.display='none';host.dataset.liveBlend='0';}
 element.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;hide();});
 prepare('o03');
 return {render,prepare,prepareNozzle,setAudioLevels(value){energy=value;},hide};
}
