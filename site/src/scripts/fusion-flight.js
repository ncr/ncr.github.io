import * as THREE from 'three';
import nozzle from '../data/fusion-nozzle.json';
import timing from '../data/flight-timing.json';

const clamp=t=>THREE.MathUtils.clamp(t,0,1);
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const hash=name=>[...name].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,0);
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const length=p=>p.slice(1).reduce((s,v,i)=>s+distance(v,p[i]),0);
const pointVertex=`attribute float strength;attribute float diameter;varying float alpha;void main(){alpha=strength;gl_PointSize=diameter;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const pointFragment=`varying float alpha;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float core=exp(-r*r*28.);float halo=pow(1.-r,2.);vec3 colour=mix(vec3(.35,.75,1.),vec3(1.,.94,.76),core);gl_FragColor=vec4(colour,(core+halo*.55)*alpha);}`;

// Projected vectors from the actual released sheets. Only the nozzle is a full 3D model.
// Other sheets float as linework, with slight depth separation; no invented reverse side.
export function createFlight(host,onReady=()=>{}){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
 const element=renderer.domElement;element.className='fusion-flight';element.setAttribute('aria-hidden','true');host.append(element);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(48,1,.2,4000);
 const cache=new Map(),pending=new Map(),unavailable=new Set();
 let current,lastW=0,lastH=0,failed=false,energy={active:false,bass:0,mids:0,highs:0};
 const paperMaterial=new THREE.ShaderMaterial({uniforms:{paper:{value:new THREE.Vector3(.1,.05,.05)}},vertexShader:`varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform vec3 paper;varying vec2 v;void main(){float grain=fract(sin(dot(v,vec2(127.1,311.7)))*43758.5453);float light=exp(-length((v-.5)*2.)*2.);gl_FragColor=vec4(paper*(.66+light*.5)+(grain-.5)*.008,1.);}`});
 const board=new THREE.Mesh(new THREE.PlaneGeometry(3500,2500),paperMaterial);board.position.z=-25;scene.add(board);
 const detail=new THREE.Group();scene.add(detail);detail.visible=false;
 for(const part of nozzle){
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(part.v,3));g.setIndex(part.i);
   detail.add(new THREE.LineSegments(new THREE.EdgesGeometry(g,9),new THREE.LineBasicMaterial({color:part.name.includes('coil')?0xd7b783:0x77b6cc,transparent:true,opacity:.72})));g.dispose();
 }
 function build(data){
   const group=new THREE.Group(),positions=[],colors=[],growth=[],lanes=Array.from({length:14},()=>[]),pens=[];
   const ranked=data.strokes.map(p=>({...p,total:length(p.p)})).filter(p=>p.total>.12).sort((a,b)=>b.total-a.total);
   // A few long structural paths carry laser accents. Small detail stays quiet.
   const leaders=new Set(),families=new Set();
   for(const p of ranked){const family=p.name.replace(/\d+/g,'');if(leaders.size<6&&!families.has(family)&&!/soil section|floor|ground|shadow/i.test(p.name)){leaders.add(p);families.add(family);}}
   for(const p of ranked)if(!leaders.has(p))lanes[hash(p.name)%14].push(p);
   for(const p of leaders)lanes.push([p]);
   const all=[];
   lanes.forEach((items,lane)=>{
     const total=items.reduce((s,p)=>s+Math.max(9,p.total)+5,0);let cursor=0;
     const lead=lane>=14,leadIndex=lane-14;
     const start=lead?.015+leadIndex*.075:lane%4*.012,span=lead?.39:.96-start,strokes=[];
     for(const path of items){
       const work=Math.max(9,path.total),a=start+cursor/total*span,b=start+(cursor+work)/total*span;cursor+=work+5;
       const z=/radiator|cable|accent|outline/.test(path.role)?6:2;
       const color=new THREE.Color(/cable|accent|coil/.test(path.role)?0xe8ba79:/radiator|screen|glass/.test(path.role)?0x8ad3e1:0xdbcbb3);
       const distances=[0];for(let i=1;i<path.p.length;i++)distances.push(distances.at(-1)+distance(path.p[i],path.p[i-1]));
       for(let i=1;i<path.p.length;i++)for(const j of [i-1,i]){positions.push(...path.p[j],z);colors.push(color.r,color.g,color.b);growth.push(a+distances[j]/path.total*(b-a));}
       const stroke={path,start:a,end:b,distances,total:path.total,z,laser:leaders.has(path),seed:hash(path.name)};strokes.push(stroke);all.push(stroke);
     }
     pens.push(strokes);
   });
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('inkColor',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('birth',new THREE.Float32BufferAttribute(growth,1));
   const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{progress:{value:0},pulse:{value:0}},vertexShader:`attribute vec3 inkColor;attribute float birth;varying vec3 color;varying float born;void main(){color=inkColor;born=birth;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float progress;uniform float pulse;varying vec3 color;varying float born;void main(){float laid=step(born,progress);float tip=laid*(1.-smoothstep(0.,.012,progress-born));gl_FragColor=vec4(sqrt(color)*(.7+tip*.65+pulse*.18),.045+laid*.85);}`});
   group.add(new THREE.LineSegments(geometry,material));
   const count=20+6*28,pp=new Float32Array(count*3),aa=new Float32Array(count),ss=new Float32Array(count),pg=new THREE.BufferGeometry();
   pg.setAttribute('position',new THREE.BufferAttribute(pp,3));pg.setAttribute('strength',new THREE.BufferAttribute(aa,1));pg.setAttribute('diameter',new THREE.BufferAttribute(ss,1));
   const pm=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:pointVertex,fragmentShader:pointFragment});
   const points=new THREE.Points(pg,pm);points.frustumCulled=false;group.add(points);
   const heroes=all.filter(s=>s.laser).sort((a,b)=>a.start-b.start);
   scene.add(group);group.visible=false;
   return {data,group,material,pens,heroes,pp,aa,ss,pg,dispose(){scene.remove(group);geometry.dispose();material.dispose();pg.dispose();pm.dispose();}};
 }
 function prepare(id){
   if(cache.has(id)||pending.has(id)||unavailable.has(id))return;
   const promise=fetch(`/gallery/destiny/drawing/${id}.json`).then(r=>{if(!r.ok)throw Error(r.status);return r.json();}).then(data=>{
     if(failed)return;
     cache.set(id,build(data));
     // At most current, next, and four recent sheets live on the GPU.
     for(const [key,value]of cache){if(cache.size<=6)break;if(key!==current){value.dispose();cache.delete(key);}}
     onReady();
   }).catch(()=>unavailable.add(id)).finally(()=>pending.delete(id));pending.set(id,promise);
 }
 function sample(stroke,amount){
   const d=clamp(amount)*stroke.total,ds=stroke.distances;
   let lo=1,hi=ds.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(ds[mid]<d)lo=mid+1;else hi=mid;}
   const a=stroke.path.p[lo-1],b=stroke.path.p[lo],u=(d-ds[lo-1])/Math.max(.001,ds[lo]-ds[lo-1]);
   return new THREE.Vector3(a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,stroke.z+.4);
 }
 function updateInk(sheet,progress,elapsed,duration){
   sheet.material.uniforms.progress.value=progress;sheet.material.uniforms.pulse.value=energy.active?energy.bass:0;
   sheet.aa.fill(0);let particle=20;
   const write=(i,p,alpha,size)=>{sheet.pp.set(p.toArray(),i*3);sheet.aa[i]=alpha;sheet.ss[i]=size*Math.min(devicePixelRatio,1.5);};
   sheet.pens.forEach((strokes,i)=>{
     const s=strokes.find(s=>s.start<=progress&&s.end>=progress);if(!s)return;
     const u=(progress-s.start)/(s.end-s.start),p=sample(s,u);
     write(i,p,s.laser?1:.65,s.laser?26:4);
   });
   for(const s of sheet.heroes){
     const u=(progress-s.start)/(s.end-s.start);if(u<0||u>1.15)continue;
     const band=energy.active?.65+energy.highs*.7:.75;
     // A short ignition at the start; small sparks then trail that same moving nib.
     // Analytic ages/seeds make seeking deterministic, with no frame-rate-dependent emitter.
     for(let j=0;j<28;j++){
       if(particle>=sheet.aa.length)break;
       const age=((elapsed*1.6+j*.618+s.seed%97*.01)%1)*.42;
       const previous=progress-age/(duration*.82),v=(previous-s.start)/(s.end-s.start);if(v<0||v>1)continue;
       const p=sample(s,v),a=(s.seed%360+j*137.508)*Math.PI/180;
       const ignition=1-smooth(u/.2),spread=(9+ignition*25)*age;
       p.x+=Math.cos(a)*spread;p.y+=Math.sin(a)*spread-age*age*12;p.z+=Math.sin(a*1.7)*spread+1;
       write(particle++,p,(1-age/.42)**1.5*band,3.5+ignition*3);
     }
   }
   sheet.pg.attributes.position.needsUpdate=true;sheet.pg.attributes.strength.needsUpdate=true;sheet.pg.attributes.diameter.needsUpdate=true;
 }
 function render(time,passage){
   if(failed)return false;
   const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return false;
   if(w!==lastW||h!==lastH){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();lastW=w;lastH=h;}
   const orbiting=time>=timing.orbit&&time<timing.end;
   for(const sheet of cache.values())sheet.group.visible=false;
   detail.visible=orbiting;board.visible=!orbiting;
   const roll=Math.sin(time*.42)*.04+Math.sin(time*.17)*.019;
   camera.up.set(Math.sin(roll),Math.cos(roll),0);
   if(orbiting){
     detail.children.forEach((line,i)=>line.material.opacity=energy.active?.35+.55*[energy.bass,energy.mids,energy.highs][i%3]:.72);
     renderer.setClearColor(0x100c10,1);
     const elapsed=time-timing.orbit,duration=timing.end-timing.orbit,u=clamp(elapsed/duration),angle=-.8+u*Math.PI*1.4,radius=Math.max(220,135/camera.aspect)*(1+.35*(1-smooth(elapsed/1.7)));
     camera.position.set(Math.sin(angle)*radius,45+40*Math.sin(u*Math.PI),Math.cos(angle)*radius);camera.lookAt(0,0,0);
     element.style.opacity=String(smooth(elapsed/.5)*(1-smooth((elapsed-duration+.8)/.8)));element.dataset.drawing='nozzle-orbit';
   }else{
     if(!passage){hide();return false;}
     current=passage.id;prepare(current);const sheet=cache.get(current);if(!sheet){hide();return false;}
     sheet.group.visible=true;
     const duration=passage.end-passage.start,elapsed=time-passage.start,u=clamp(elapsed/duration);
     const progress=clamp(u/.83);updateInk(sheet,progress,elapsed,duration);
     const paper=sheet.data.paper.map(v=>v/255);paperMaterial.uniforms.paper.value.set(...paper);renderer.setClearColor(new THREE.Color(...paper),1);
     const [bw,bh]=sheet.data.size;
     const fit=Math.max(bh/2,bw/(2*camera.aspect))/Math.tan(24*Math.PI/180)*1.22;
     const hero=sheet.heroes[passage.seed%sheet.heroes.length]||sheet.pens.flat()[0];
     const tracking=sample(hero,clamp((progress-hero.start)/(hero.end-hero.start)));
     // Establish silhouette, follow a genuine contour, then reconnect to the whole sheet.
     // Six flight grammars + different paths/orientations avoid the same repeated zoom.
     const enter=smooth((u-.14)/.25),leave=1-smooth((u-.67)/.28),dive=enter*leave;
     const target=new THREE.Vector3(),pos=new THREE.Vector3(0,0,fit);
     const phase=u*Math.PI*2+passage.seed*.01;
     switch(passage.view){
       case 0:target.copy(tracking).multiplyScalar(.62*dive);pos.set(target.x-35*dive,target.y-45*dive,fit*(1-.47*dive));break;
       case 1:target.set(bw*(u-.5)*.32*dive,bh*.08*dive,0);pos.set(target.x+55*dive,target.y,fit*(1-.38*dive));break;
       case 2:target.copy(tracking).multiplyScalar(.5*dive);pos.set(target.x+Math.sin(phase)*85*dive,target.y+Math.cos(phase)*55*dive,fit*(1-.42*dive));break;
       case 3:target.set(bw*.12*dive,bh*(.5-u)*.4*dive,0);pos.set(target.x-70*dive,target.y+25*dive,fit*(1-.4*dive));break;
       case 4:target.copy(tracking).multiplyScalar(.65*dive);pos.set(target.x+45*dive,target.y-55*dive,fit*(1-.48*dive));break;
       default:target.set(bw*(.5-u)*.35*dive,-bh*.08*dive,0);pos.set(target.x,target.y+70*dive,fit*(1-.36*dive));
     }
     camera.position.copy(pos);camera.lookAt(target);
     element.style.opacity=String(smooth(elapsed/.32)*(1-smooth((elapsed-duration+.42)/.42)));
     element.dataset.drawing=current;element.dataset.progress=progress.toFixed(3);
   }
   element.style.display='block';renderer.render(scene,camera);return true;
 }
 function hide(){element.style.display='none';}
 element.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;hide();});
 prepare('o03');
 return {render,prepare,setAudioLevels(value){energy=value;},hide};
}
