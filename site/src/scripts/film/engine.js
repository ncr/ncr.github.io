// Music-video renderer. Everything on screen is a pure function of the
// soundtrack time, so seeking, pausing and frame export give the same picture.
// Sources are the released film images, thumbnails, the shared atlas and the
// original vector paths; the nozzle and dinner reuse their real 3D geometry.
import * as THREE from 'three';
import {edit,sheets,beat,duration} from './edit.js';
import grid from '../../data/music-grid.json';
import bass from '../../data/bass-beats.json';
import sheetData from '../../data/film-sheets.json';
import {createDinner} from '../truth-dinner-flight.js';

const G=grid.beats;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const EASE={l:u=>u,io:u=>u*u*u*(u*(u*6-15)+10),o:u=>1-(1-u)**3,i:u=>u*u*u,s:u=>(1-2**(-10*u))/(1-2**-10),h:u=>u<1?0:1};
const ease=(e,u)=>(EASE[e]||EASE.io)(clamp(u));
const smooth=u=>{u=clamp(u);return u*u*(3-2*u);};

/** Value of a [[t,v,easing]] track at time t; holds outside its range. */
function track(keys,t){
 if(!keys?.length)return 0;
 if(t<=keys[0][0])return keys[0][1];
 for(let i=0;i<keys.length-1;i++){const a=keys[i],c=keys[i+1];if(t<c[0])return a[1]+(c[1]-a[1])*ease(c[2]||'io',(t-a[0])/(c[0]-a[0]));}
 return keys.at(-1)[1];
}
/** Interpolated camera key. Width interpolates in log space so zooms feel even. */
function camAt(keys,t,resolve=k=>k){
 const first=resolve(keys[0]);if(t<=keys[0].t||keys.length===1)return {...first};
 for(let i=0;i<keys.length-1;i++){
  const a=resolve(keys[i]),c=resolve(keys[i+1]);
  if(t<keys[i+1].t||i===keys.length-2){
   const u=ease(keys[i+1].e,(t-keys[i].t)/(keys[i+1].t-keys[i].t)),m=(p,q)=>p+(q-p)*u;
   return {x:m(a.x,c.x),y:m(a.y,c.y),w:Math.exp(m(Math.log(a.w),Math.log(c.w))),pitch:m(a.pitch,c.pitch),yaw:m(a.yaw,c.yaw),roll:m(a.roll,c.roll),fov:m(a.fov,c.fov)};
  }
 }
 return {...resolve(keys.at(-1))};
}
function beatIndex(t){let lo=0,hi=G.length-1;if(t<G[0])return -1;while(lo<hi){const m=(lo+hi+1)>>1;if(G[m]<=t)lo=m;else hi=m-1;}return lo;}
const attacks=bass.beats;
function attackStrength(t){let lo=0,hi=attacks.length-1;while(lo<hi){const m=(lo+hi)>>1;if(attacks[m][0]<t)lo=m+1;else hi=m;}let best=0;for(const k of [lo-1,lo]){const a=attacks[k];if(a&&Math.abs(a[0]-t)<.07)best=Math.max(best,a[1]);}return best;}
const strengthScale=Math.max(...attacks.map(a=>a[1]))||1;
/** Punch envelope: fast attack, short release on selected beats. */
function punchAt(p,t,t0){
 if(!p)return 0;const n=beatIndex(t);if(n<0)return 0;
 for(let k=n;k>=Math.max(0,n-2);k--){
  if(k%p.every)continue;const at=G[k];if(at<Math.max(t0,p.from||0)-.01)return 0;
  const age=t-at,s=.55+.45*clamp(attackStrength(at)/strengthScale*1.6);return p.amp*s*(1-Math.exp(-age*45))*Math.exp(-age*6.5);
 }
 return 0;
}
function beatPhase(t){const n=beatIndex(t);if(n<0||n>=G.length-1)return {n,u:0};return {n,u:(t-G[n])/(G[n+1]-G[n])};}

const ROLE={structure:[.9,.86,.78,.25],detail:[.62,.66,.7,.6],cable:[1,.7,.36,1],accent:[1,.78,.42,.9],radiator:[.46,.86,.98,.8],fine:[.7,.72,.76,.7]};
const PAPER_VERT=`varying vec2 w;void main(){w=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const PAPER_FRAG=`uniform vec3 paper;uniform float gridAmt;varying vec2 w;
float line(float v,float s,float px){float d=abs(fract(v/s+.5)-.5)*s;return 1.-smoothstep(0.,px,d);}
void main(){
 vec2 q=w/vec2(1280.,540.);float light=exp(-dot(q,q)*.55);
 float px=max(fwidth(w.x),fwidth(w.y))*1.2;
 float g=max(line(w.x,40.,px),line(w.y,40.,px))*.35*smoothstep(7.,16.,40./px)+max(line(w.x,200.,px*1.3),line(w.y,200.,px*1.3))*.65*smoothstep(7.,16.,200./px);
 float fade=exp(-length(q)*.12);
 vec3 c=paper*(.62+.55*light)+paper*g*gridAmt*.55*fade+vec3(.012)*g*gridAmt*fade;
 gl_FragColor=vec4(c,1.);
}`;
const TEX_VERT=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const TEX_FRAG=`uniform sampler2D map;uniform float opacity;uniform vec3 wipe;varying vec2 vUv;
void main(){
 vec4 c=texture2D(map,vUv);
 float edge=smoothstep(0.,.012,vUv.x)*smoothstep(0.,.012,1.-vUv.x)*smoothstep(0.,.03,vUv.y)*smoothstep(0.,.03,1.-vUv.y);
 float a=opacity;
 if(wipe.z>0.){float s=dot(vUv-.5,wipe.xy)+.5;a*=clamp((wipe.z*1.25-s)/.25,0.,1.);}
 gl_FragColor=vec4(c.rgb,a*edge);
}`;
const LINE_VERT=`attribute float along;attribute float rank;attribute float rnd;attribute float len;attribute vec4 ink;attribute vec2 centre;
uniform vec4 orderW;uniform vec2 sweepDir;uniform float span;uniform float depth;uniform vec4 bounds;
varying float birth;varying vec3 col;varying float xn;varying float weight;
void main(){
 vec2 c=(centre-bounds.xy)/bounds.zw;
 float sweep=clamp(dot(c,normalize(sweepDir))*.5+.5,0.,1.);
 float radial=clamp(length(c)*.72,0.,1.);
 float key=dot(orderW,vec4(sweep,radial,rank,rnd))/max(.001,dot(orderW,vec4(1.)));
 float s=span*(.3+1.4*len);
 birth=key*(1.-s)+along*s;
 col=ink.rgb;weight=.6+.4*(1.-ink.a*.6);xn=position.x/2560.+.5;
 vec3 p=position;p.z=depth*((ink.a-.5)*1.6+(rnd-.5)*.7);
 gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;
const LINE_FRAG=`uniform float progress;uniform float head;uniform float alpha;uniform float glow;uniform float shimmer;uniform float shimmerPos;uniform float bass;uniform float ghost;
varying float birth;varying vec3 col;varying float xn;varying float weight;
void main(){
 float d=progress-birth;
 if(d<0.){if(ghost<=0.)discard;gl_FragColor=vec4(col*ghost*glow,1.);return;}
 float hot=exp(-d/max(head,.0005));
 float wave=shimmer*exp(-pow((xn-shimmerPos)*7.,2.));
 vec3 c=col*weight*(alpha*(1.+bass*.5)+wave*1.6)*glow+vec3(1.,.93,.8)*hot*2.4*glow;
 gl_FragColor=vec4(c,1.);
}`;
const WALL_VERT=`attribute vec2 tile;attribute float tileIndex;uniform float time;uniform float wave;uniform vec2 ringCentre;uniform float ring;uniform float pulse;
varying vec2 vUv;varying float lift;
void main(){vUv=uv;vec3 p=position;
 float d=length(tile-ringCentre)/2780.;
 float r=exp(-pow(d-ring,2.)*1.6);
 lift=wave*(r*.9+.1*sin(time*1.7+tileIndex*1.3))+pulse*r;
 p.z+=lift*420.;
 gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
const WALL_FRAG=`uniform sampler2D map;uniform float bright;varying vec2 vUv;varying float lift;void main(){vec4 c=texture2D(map,vUv);gl_FragColor=vec4(c.rgb*(bright+lift*.55),1.);}`;
const QUAD_VERT=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const COMPOSITE_FRAG=`uniform sampler2D A;uniform sampler2D B;uniform int mode;uniform float u;uniform vec2 dir;uniform vec2 centre;uniform vec2 blurA;uniform float zoomA;uniform float flash;uniform float exposure;uniform float aspect;varying vec2 vUv;
vec3 blurSample(sampler2D t,vec2 uv,vec2 v,float z,vec2 c){
 vec3 s=vec3(0.);for(int i=0;i<9;i++){float f=float(i)/8.-.5;vec2 q=uv+v*f+(uv-c)*z*f;s+=texture2D(t,clamp(q,.001,.999)).rgb;}return s/9.;}
void main(){
 vec2 uv=vUv;vec3 c;
 if(mode==0){c=blurSample(A,uv,blurA,zoomA,vec2(.5));}
 else if(mode==1){c=mix(texture2D(A,uv).rgb,texture2D(B,uv).rgb,smoothstep(0.,1.,u));}
 else if(mode==2){
  float e=u*u*(3.-2.*u),sa=pow(u,2.),sb=pow(1.-u,2.);vec2 d=dir*vec2(1.,-1.);
  vec3 a=blurSample(A,uv+d*sa*.9,d*(sa*1.8+.02),0.,vec2(.5)),b=blurSample(B,uv-d*sb*.9,d*(sb*1.8+.02),0.,vec2(.5));
  c=mix(a,b,smoothstep(.42,.58,u));
 }else if(mode==3){
  float sa=1.+4.*u*u*u,sb=mix(.35,1.,1.-pow(1.-u,3.));
  vec3 a=blurSample(A,centre+(uv-centre)/sa,vec2(0.),.35*u,centre);
  vec3 b=blurSample(B,.5+(uv-.5)/sb,vec2(0.),.3*(1.-u),vec2(.5));
  c=mix(a,b,smoothstep(.4,.6,u));
 }else if(mode==4){
  float s=dot(uv-.5,dir)+.5,edge=u*1.2-.1;
  c=s<edge?texture2D(B,uv).rgb:texture2D(A,uv).rgb;
  c+=vec3(.55,.8,1.)*exp(-abs(s-edge)*90.)*1.6*(1.-u*.5);
 }else{
  vec2 q=(uv-.5)*vec2(aspect,1.);float r=length(q),edge=u*u*.6*max(aspect,1.)+.001;
  c=r<edge?texture2D(B,uv).rgb:texture2D(A,uv).rgb*(1.-u*.6);
  c+=vec3(.6,.82,1.)*exp(-abs(r-edge)*60.)*1.4*(1.-u);
 }
 c=c*exposure+vec3(1.,.97,.92)*flash;
 gl_FragColor=vec4(c,1.);
}`;
const BRIGHT_FRAG=`uniform sampler2D src;varying vec2 vUv;void main(){vec3 c=texture2D(src,vUv).rgb;float l=max(max(c.r,c.g),c.b);gl_FragColor=vec4(c*smoothstep(.42,1.1,l),1.);}`;
const BLUR_FRAG=`uniform sampler2D src;uniform vec2 step;varying vec2 vUv;void main(){vec3 s=texture2D(src,vUv).rgb*.227;
 s+=(texture2D(src,vUv+step*1.38).rgb+texture2D(src,vUv-step*1.38).rgb)*.316;s+=(texture2D(src,vUv+step*3.23).rgb+texture2D(src,vUv-step*3.23).rgb)*.07;gl_FragColor=vec4(s,1.);}`;
const FINAL_FRAG=`uniform sampler2D src;uniform sampler2D bloom;uniform float bloomAmt;uniform float time;uniform float aspect;varying vec2 vUv;
void main(){
 vec3 c=texture2D(src,vUv).rgb+texture2D(bloom,vUv).rgb*bloomAmt;
 vec2 q=(vUv-.5)*vec2(aspect,1.);float v=1.-smoothstep(.55,1.6,length(q)/max(1.,aspect*.62));
 c*=mix(.72,1.,v);
 c=1.-exp(-c*1.08);
 float g=fract(sin(dot(vUv*vec2(1733.,977.)+time*61.,vec2(12.9898,78.233)))*43758.5453)-.5;
 c+=g*.018;
 gl_FragColor=vec4(pow(c,vec3(1./2.2)),1.);
}`;
const MODES={cut:0,fade:1,whip:2,zoom:3,wipe:4,iris:5};

export function createFilm(host,onReady=()=>{}){
 const renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});
 const lowMemory=(navigator.deviceMemory||8)<=4||Math.min(screen.width,screen.height)<700;
 renderer.setPixelRatio(Math.min(devicePixelRatio,lowMemory?1.25:1.6));
 renderer.outputColorSpace=THREE.LinearSRGBColorSpace;renderer.autoClear=false;
 const canvas=renderer.domElement;canvas.className='destiny-film';canvas.setAttribute('aria-hidden','true');host.append(canvas);
 const anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());

 // ── Scenes ──
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,10,200000);
 const paperU={paper:{value:new THREE.Color()},gridAmt:{value:.5}};
 const paper=new THREE.Mesh(new THREE.PlaneGeometry(60000,60000),new THREE.ShaderMaterial({uniforms:paperU,vertexShader:PAPER_VERT,fragmentShader:PAPER_FRAG,depthWrite:false,extensions:{derivatives:true}}));
 paper.position.z=-400;paper.renderOrder=0;scene.add(paper);
 const texU={map:{value:null},opacity:{value:1},wipe:{value:new THREE.Vector3()}};
 const sheetPlane=new THREE.Mesh(new THREE.PlaneGeometry(2560,1080),new THREE.ShaderMaterial({uniforms:texU,vertexShader:TEX_VERT,fragmentShader:TEX_FRAG,transparent:true,depthWrite:false}));
 sheetPlane.renderOrder=1;scene.add(sheetPlane);
 const lineU={progress:{value:0},head:{value:.01},alpha:{value:1},glow:{value:1},shimmer:{value:0},shimmerPos:{value:-1},bass:{value:0},orderW:{value:new THREE.Vector4()},sweepDir:{value:new THREE.Vector2(1,0)},span:{value:.2},depth:{value:0},bounds:{value:new THREE.Vector4(0,0,1280,540)},ghost:{value:0}};
 const lineMaterial=new THREE.ShaderMaterial({uniforms:lineU,vertexShader:LINE_VERT,fragmentShader:LINE_FRAG,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending});
 const lines=new THREE.LineSegments(new THREE.BufferGeometry(),lineMaterial);lines.frustumCulled=false;lines.renderOrder=2;scene.add(lines);

 // Wall of all sheets: one atlas texture, one draw call.
 const ids=Object.keys(sheets),COLS=7,ROWS=Math.ceil(ids.length/COLS),PX=2780,PY=1300;
 const tilePos={};ids.forEach((id,i)=>{tilePos[id]=[((i%COLS)-(COLS-1)/2)*PX,((ROWS-1)/2-Math.floor(i/COLS))*PY];});
 const wallU={map:{value:null},time:{value:0},wave:{value:0},ringCentre:{value:new THREE.Vector2()},ring:{value:0},pulse:{value:0},bright:{value:1}};
 const wallScene=new THREE.Scene();
 {const pos=[],uv=[],tile=[],index=[],tileIndex=[];ids.forEach((id,i)=>{const [cx,cy]=tilePos[id],[u0,v0,u1,v1]=sheets[id].uv,b=pos.length/3;
   for(const [dx,dy,uu,vv] of [[-1,-1,u0,v0],[1,-1,u1,v0],[1,1,u1,v1],[-1,1,u0,v1]]){pos.push(cx+dx*1280,cy+dy*540,0);uv.push(uu,vv);tile.push(cx,cy);tileIndex.push(i);}
   index.push(b,b+1,b+2,b,b+2,b+3);});
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('tile',new THREE.Float32BufferAttribute(tile,2));g.setAttribute('tileIndex',new THREE.Float32BufferAttribute(tileIndex,1));g.setIndex(index);
  const m=new THREE.Mesh(g,new THREE.ShaderMaterial({uniforms:wallU,vertexShader:WALL_VERT,fragmentShader:WALL_FRAG,depthWrite:true}));m.frustumCulled=false;wallScene.add(m);}
 const heroU={map:{value:null},opacity:{value:0},wipe:{value:new THREE.Vector3()}};
 const hero=new THREE.Mesh(new THREE.PlaneGeometry(2560,1080),new THREE.ShaderMaterial({uniforms:heroU,vertexShader:TEX_VERT,fragmentShader:TEX_FRAG,transparent:true,depthTest:false,depthWrite:false}));hero.renderOrder=3;wallScene.add(hero);

 // Real 3D nozzle (56 source parts merged offline) and the original dinner scene.
 const nozzleScene=new THREE.Scene();let nozzle=null,nozzlePending=null;
 const nozzleU={levels:{value:new THREE.Vector3(.6,.6,.6)},glow:{value:1}};
 function prepareNozzle(){if(nozzlePending)return nozzlePending;nozzlePending=Promise.all([fetch('/gallery/destiny/film-data/nozzle.json').then(r=>r.json()),fetch('/gallery/destiny/film-data/nozzle.bin').then(r=>r.arrayBuffer())]).then(([m,b])=>{
  const g=new THREE.BufferGeometry(),n=m.vertices;g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(b,0,n*3),3));g.setAttribute('inkColor',new THREE.BufferAttribute(new Float32Array(b,n*12,n*3),3));g.setAttribute('band',new THREE.BufferAttribute(new Float32Array(b,n*24,n),1));
  g.computeBoundingSphere();
  const mat=new THREE.ShaderMaterial({uniforms:nozzleU,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:`attribute vec3 inkColor;attribute float band;uniform vec3 levels;uniform float glow;varying vec3 c;void main(){c=inkColor*(.45+.7*(band<.5?levels.x:band<1.5?levels.y:levels.z))*glow;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 c;void main(){gl_FragColor=vec4(c,1.);}`});
  nozzle=new THREE.LineSegments(g,mat);nozzle.frustumCulled=false;nozzleScene.add(nozzle);onReady();
 }).catch(()=>{});return nozzlePending;}
 const dinnerScene=new THREE.Scene(),dinner=createDinner(dinnerScene,renderer);let dinnerRequested=false;

 // ── Assets ──
 const textures=new Map(),drawings=new Map();let atlas=null,atlasPending=null,pendingCount=0;
 const LIMIT={film:lowMemory?6:12,thumb:lowMemory?10:18,drawing:lowMemory?6:12};
 function touch(map,key){const v=map.get(key);map.delete(key);map.set(key,v);return v;}
 function evict(map,kind,keep){let n=[...map.keys()].filter(k=>k.startsWith(kind)).length;for(const [k,v]of map){if(n<=LIMIT[kind])break;if(!k.startsWith(kind)||keep.has(k)||!v.texture&&!v.geometry)continue;v.texture?.dispose();v.geometry?.dispose();map.delete(k);n--;}}
 function loadTexture(url){
  pendingCount++;
  return fetch(url).then(r=>{if(!r.ok)throw Error(r.status);return r.blob();}).then(b=>createImageBitmap(b,{imageOrientation:'flipY'})).then(bitmap=>{
   const t=new THREE.Texture(bitmap);t.flipY=false;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=anisotropy;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.needsUpdate=true;renderer.initTexture(t);return t;
  }).finally(()=>{pendingCount--;});
 }
 function texture(id,kind){
  const key=kind+':'+id;
  if(textures.has(key))return touch(textures,key).texture||null;
  const entry={texture:null};textures.set(key,entry);
  loadTexture(sheets[id][kind]).then(t=>{entry.texture=t;onReady();}).catch(()=>{entry.failed=true;});
  return null;
 }
 function bestTexture(id,prefer){return (prefer==='thumb'?texture(id,'thumb')||textures.get('film:'+id)?.texture:texture(id,'film')||texture(id,'thumb'))||null;}
 function drawing(id){
  const key='drawing:'+id;
  if(drawings.has(key))return touch(drawings,key).geometry||null;
  const entry={geometry:null};drawings.set(key,entry);pendingCount++;
  fetch(sheets[id].drawing).then(r=>{if(!r.ok)throw Error(r.status);return r.json();}).then(d=>{entry.geometry=buildLines(d);onReady();}).catch(()=>{entry.failed=true;}).finally(()=>pendingCount--);
  return null;
 }
 function buildLines(d){
  const r=d.registration,strokes=d.strokes.map(s=>{const p=s.p.map(([x,y])=>[r.center[0]+x*r.unit-1280,540-(r.center[1]-y*r.unit)]);let len=0;for(let i=1;i<p.length;i++)len+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);return {p,len,role:s.role,name:s.name};}).filter(s=>s.p.length>1);
  const order=[...strokes].sort((a,b)=>b.len-a.len);order.forEach((s,i)=>s.rank=i/Math.max(1,order.length-1));
  let seed=7;const rand=()=>(seed=(seed*16807)%2147483647)/2147483647;
  const pos=[],along=[],rank=[],rnd=[],ink=[],centre=[],lens=[],maxLen=Math.max(...strokes.map(s=>s.len));let bx0=1e9,by0=1e9,bx1=-1e9,by1=-1e9;
  for(const s of strokes)for(const [x,y]of s.p){bx0=Math.min(bx0,x);bx1=Math.max(bx1,x);by0=Math.min(by0,y);by1=Math.max(by1,y);}
  for(const s of strokes){
   const cx=s.p.reduce((a,q)=>a+q[0],0)/s.p.length,cy=s.p.reduce((a,q)=>a+q[1],0)/s.p.length,rr=rand(),role=ROLE[s.role]||ROLE.detail;let acc=0;
   for(let i=1;i<s.p.length;i++){const a=s.p[i-1],c=s.p[i],l=Math.hypot(c[0]-a[0],c[1]-a[1]);
    for(const [q,f] of [[a,acc],[c,acc+l]]){pos.push(q[0],q[1],0);lens.push(Math.sqrt(s.len/maxLen));along.push(f/Math.max(1e-3,s.len));rank.push(s.rank);rnd.push(rr);ink.push(...role);centre.push(cx,cy);}acc+=l;}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('along',new THREE.Float32BufferAttribute(along,1));g.setAttribute('rank',new THREE.Float32BufferAttribute(rank,1));g.setAttribute('rnd',new THREE.Float32BufferAttribute(rnd,1));g.setAttribute('ink',new THREE.Float32BufferAttribute(ink,4));g.setAttribute('centre',new THREE.Float32BufferAttribute(centre,2));g.setAttribute('len',new THREE.Float32BufferAttribute(lens,1));
  g.userData.bounds=[(bx0+bx1)/2,(by0+by1)/2,Math.max(1,(bx1-bx0)/2),Math.max(1,(by1-by0)/2)];
  return g;
 }
 function loadAtlas(){if(atlasPending)return;atlasPending=loadTexture(sheetData.atlas).then(t=>{atlas=t;onReady();}).catch(()=>{});}

 // What each shot needs, for prefetching ahead of the playhead.
 function needs(s,out){
  if(s.kind==='sheet'){out.add((s.panel||s.res==='thumb'?'thumb:':'film:')+s.id);if(s.ink)out.add('drawing:'+s.id);}
  else if(s.kind==='panels')for(const p of s.panels)for(const c of p.seq||[p.shot])needs({...c,panel:true},out);
  else if(s.kind==='wall'){out.add('atlas');for(const [id]of s.focus||[])out.add('film:'+id);}
  else out.add(s.kind);
 }
 function prefetch(t){
  const want=new Set();for(const s of edit.shots)if(s.t1>t-.5&&s.t0<t+9)needs(s,want);
  for(const k of want){
   const [kind,id]=k.split(':');
   if(kind==='film'||kind==='thumb')texture(id,kind);else if(kind==='drawing')drawing(id);else if(k==='atlas')loadAtlas();else if(k==='nozzle')prepareNozzle();else if(k==='dinner'&&!dinnerRequested){dinnerRequested=true;dinner.prepare().then(onReady);}
  }
  evict(textures,'film',want);evict(textures,'thumb',want);evict(drawings,'drawing',want);
  return want;
 }

 // ── Cameras ──
 function aimSheet(c,aspect,cover,clampView,shake){
  const h=c.w*1080/2560,visW=cover?Math.min(c.w,h*aspect):Math.max(c.w,h*aspect),visH=visW/aspect;
  let x=c.x-1280,y=540-c.y;
  if(clampView){const mx=Math.max(0,1280-visW/2),my=Math.max(0,540-visH/2);x=clamp(x,-mx,mx);y=clamp(y,-my,my);}
  place(x,y,0,visH,c,shake);
 }
 function place(x,y,z,visH,c,shake={}){
  camera.fov=c.fov;const d=visH/2/Math.tan(c.fov*Math.PI/360)/(1+(shake.punch||0));
  const p=c.pitch*Math.PI/180,yw=c.yaw*Math.PI/180,r=(c.roll+(shake.roll||0))*Math.PI/180;
  const ty=y+(shake.bob||0);
  camera.position.set(x+d*Math.cos(p)*Math.sin(yw),ty-d*Math.sin(p),z+d*Math.cos(p)*Math.cos(yw));
  camera.up.set(Math.sin(r),Math.cos(r),0);camera.lookAt(x,ty,z);
  camera.near=Math.max(5,d*.02);camera.far=d*60+80000;camera.updateProjectionMatrix();
 }

 // ── Shot rendering ──
 let energy={active:false,bass:0,mids:0,highs:0};
 function drawSheet(s,t,aspect,panel=false){
  const c=camAt(s.cam,t),punch=punchAt(s.punch,t,s.t0),ph=beatPhase(t);
  const bob=s.bob?-s.bob*Math.abs(Math.sin(Math.PI*ph.u))*c.w/800:0;
  const roll=s.swing&&ph.n>=0?s.swing*(ph.n%2?1:-1)*Math.exp(-ph.u*2.5)*(t>=s.t0?1:0):0;
  camera.aspect=aspect;aimSheet(c,aspect,s.cover,s.clamp,{punch,bob,roll});
  const p=sheets[s.id].paper;paperU.paper.value.setRGB(p[0]/255,p[1]/255,p[2]/255,THREE.SRGBColorSpace);paperU.gridAmt.value=s.grid;
  const texAmt=track(s.tex,t),tex=texAmt>.001?bestTexture(s.id,panel||s.res==='thumb'?'thumb':'film'):null;
  sheetPlane.visible=Boolean(tex);
  if(tex){texU.map.value=tex;texU.opacity.value=texAmt;texU.wipe.value.set(...(s.wipe||[0,0]),s.wipe?texAmt:0);if(s.wipe)texU.opacity.value=1;}
  const geometry=s.ink||s.shimmer?drawing(s.id):null;lines.visible=Boolean(geometry);
  if(geometry){
   lines.geometry=geometry;
   const progress=s.ink?track(s.ink,t):1,rate=s.ink?Math.abs(track(s.ink,t+.05)-track(s.ink,t-.05))*10:0;
   lineU.progress.value=progress>=.999?1.02:progress;lineU.head.value=Math.max(.002,rate*.16);
   lineU.orderW.value.set(...s.order);lineU.sweepDir.value.set(...s.dir);lineU.span.value=s.span;lineU.depth.value=track(s.depth,t);lineU.bounds.value.set(...geometry.userData.bounds);lineU.ghost.value=s.ghost||0;
   const shown=s.ink?1:0;lineU.alpha.value=shown*(1-.82*clamp(texAmt))+.02;lineU.glow.value=s.glow*(1+punch*4);
   const barT=ph.n>=0?(ph.n%4+ph.u)/4:((t/.5367/4)%1);lineU.shimmer.value=s.shimmer*(1-Math.exp(-barT*30));lineU.shimmerPos.value=barT*1.5-.25;
   lineU.bass.value=energy.active?energy.bass:0;
   if(!s.ink&&s.shimmer)lineU.alpha.value=0;
  }
  renderer.render(scene,camera);
  return {punch,exposure:track(s.exposure,t)*(1+punch*1.8),c};
 }
 function wallResolver(aspect){
  return k=>{
   if(!k.ref)return k;const r=k.ref;let x=0,y=0,w=r.w;
   if(r.tile){[x,y]=tilePos[r.tile];x+=(r.dx||0)*PX;y+=(r.dy||0)*PY;}
   if(w==='all')w=Math.max(COLS*PX,ROWS*PY*2560/1080)*(r.grow||1);
   return {...k,x,y,w};
  };
 }
 function drawWall(s,t,aspect){
  if(!atlas){loadAtlas();return null;}
  const c=camAt(s.cam,t,wallResolver(aspect)),punch=punchAt(s.punch,t,s.t0);
  camera.aspect=aspect;const h=c.w*1080/2560,visW=Math.max(c.w,h*aspect);place(c.x,c.y,0,visW/aspect,c,{punch});
  wallU.map.value=atlas;wallU.time.value=t;
  // Focus tile shows its full film image when the camera is close.
  const focus=(s.focus||[]).reduce((best,f)=>!best||Math.abs(f[1]-t)<Math.abs(best[1]-t)?f:best,null);
  const close=1-smooth((c.w-3400)/4200);
  wallU.wave.value=(s.wave?.4:0)*(1-close);
  const ph=beatPhase(t);wallU.ring.value=ph.n>=0?((ph.n%8)+ph.u)*.9:0;wallU.pulse.value=(s.wave||0)*.25*(1-close)*Math.exp(-ph.u*4)*(ph.n>=0?1:0);
  if(focus){const [fx,fy]=tilePos[focus[0]];wallU.ringCentre.value.set(fx,fy);}
  wallU.bright.value=.92+(energy.active?energy.bass*.25:0);
  const ft=focus&&close>.01?texture(focus[0],'film'):null;hero.visible=Boolean(ft);
  if(ft){const [fx,fy]=tilePos[focus[0]];hero.position.set(fx,fy,2);heroU.map.value=ft;heroU.opacity.value=close;}
  renderer.setClearColor(0x07090e,1);renderer.clear();
  renderer.render(wallScene,camera);
  return {punch,exposure:(s.exposure?track(s.exposure,t):1)*(1+punch*1.5),c};
 }
 function orbitCam(s,t,aspect,radius,centre){
  const keys=s.orbit;let k=keys[0];let az=k[1],el=k[2],rf=k[3];
  for(let i=0;i<keys.length-1;i++){const a=keys[i],c=keys[i+1];if(t>=a[0]&&(t<c[0]||i===keys.length-2)){const u=ease(c[4]||'io',(t-a[0])/(c[0]-a[0]));az=a[1]+(c[1]-a[1])*u;el=a[2]+(c[2]-a[2])*u;rf=a[3]+(c[3]-a[3])*u;}}
  if(t>=keys.at(-1)[0]){[,az,el,rf]=keys.at(-1);}
  const punch=punchAt(s.punch,t,s.t0),fit=radius/Math.tan(17.5*Math.PI/180)/Math.min(1,aspect*.8),d=fit*rf/(1+punch);
  camera.aspect=aspect;camera.fov=35;const A=az*Math.PI/180,E=el*Math.PI/180;
  camera.position.set(centre.x+Math.sin(A)*Math.cos(E)*d,centre.y+Math.sin(E)*d,centre.z+Math.cos(A)*Math.cos(E)*d);camera.up.set(0,1,0);camera.lookAt(centre);
  camera.near=d*.02;camera.far=d*20;camera.updateProjectionMatrix();
  return punch;
 }
 function drawNozzle(s,t,aspect){
  if(!nozzle){prepareNozzle();return null;}
  const sphere=nozzle.geometry.boundingSphere,punch=orbitCam(s,t,aspect,sphere.radius,sphere.center);
  nozzleU.levels.value.set(energy.active?energy.bass:.6,energy.active?energy.mids:.6,energy.active?energy.highs:.6);nozzleU.glow.value=.62+punch*3;
  const p=s.paper;renderer.setClearColor(new THREE.Color().setRGB(p[0]/255,p[1]/255,p[2]/255,THREE.SRGBColorSpace),1);renderer.clear();
  renderer.render(nozzleScene,camera);return {punch,exposure:1+punch,c:null};
 }
 const dinnerCentre=new THREE.Vector3(0,20,0);
 function drawDinner(s,t,aspect){
  if(!dinnerRequested){dinnerRequested=true;dinner.prepare().then(onReady);}
  if(!dinner.isReady())return null;
  orbitCam(s,t,aspect,420,dinnerCentre);dinner.group.visible=true;
  const p=s.paper;renderer.setClearColor(new THREE.Color().setRGB(p[0]/255,p[1]/255,p[2]/255,THREE.SRGBColorSpace),1);renderer.clear();
  renderer.render(dinnerScene,camera);return {punch:0,exposure:1.05,c:null};
 }
 function panelRects(layout,aspect){
  const cols=(n,m)=>{const r=[];for(let j=0;j<m;j++)for(let i=0;i<n;i++)r.push([i/n,1-(j+1)/m,(i+1)/n,1-j/m]);return r;};
  if(layout==='grid2')return cols(2,2);
  if(layout==='grid3')return aspect>2.2?cols(3,3):cols(3,3);
  if(layout==='split2')return aspect>1.1?cols(2,1):cols(1,2);
  return aspect>1?cols(3,1):cols(1,3);
 }
 function drawPanels(s,t,W,H,target){
  const rects=panelRects(s.layout,W/H),gap=Math.max(2,Math.round(3*renderer.getPixelRatio()));let result={punch:0,exposure:1,c:null};
  target.scissorTest=true;
  s.panels.forEach((p,i)=>{
   if(t<p.open)return;
   const shot=p.seq?p.seq.find(q=>t>=q.t0&&t<q.t1)||(t<p.seq[0].t0?p.seq[0]:p.seq.at(-1)):p.shot;
   let [x0,y0,x1,y1]=rects[i];const open=ease('o',(t-p.open)/.28);
   const cx=(x0+x1)/2,cy=(y0+y1)/2;const vertical=(x1-x0)<(y1-y0)*W/H*1.01&&s.layout==='strips3';
   if(vertical){y0=cy-(cy-y0)*open;y1=cy+(y1-cy)*open;}else{x0=cx-(cx-x0)*open;x1=cx+(x1-cx)*open;}
   let ox=0,oy=0;if(p.close&&t>p.close){const u=ease('i',(t-p.close)/(beat(80)-beat(78)));if(W/H>1)oy=p.slide*u*1.1;else ox=p.slide*u*1.1;}
   const px=Math.round((x0+ox)*W)+gap,py=Math.round((y0+oy)*H)+gap,pw=Math.round((x1-x0)*W)-2*gap,phh=Math.round((y1-y0)*H)-2*gap;
   if(pw<2||phh<2)return;
   const vx=clamp(px,0,W),vy=clamp(py,0,H),vw=clamp(px+pw,0,W)-vx,vh=clamp(py+phh,0,H)-vy;if(vw<1||vh<1)return;
   target.scissor.set(vx,vy,vw,vh);target.viewport.set(px,py,pw,phh);renderer.setRenderTarget(target);
   const r=drawSheet({...shot,panel:true},t,pw/phh,true);if(r&&r.punch>result.punch)result=r;
  });
  target.scissorTest=false;target.scissor.set(0,0,W,H);target.viewport.set(0,0,W,H);renderer.setRenderTarget(target);
  return result;
 }
 /** Render every shot active at `select` (a side of a cut) at animation time t into target. */
 function drawFrame(select,t,target,W,H){
  target.scissorTest=false;target.scissor.set(0,0,W,H);target.viewport.set(0,0,W,H);renderer.setRenderTarget(target);renderer.setClearColor(0x07090e,1);renderer.clear();
  const active=edit.shots.filter(s=>s.t0<=select&&select<s.t1).sort((a,b)=>(a.kind==='panels')-(b.kind==='panels'));
  let out=null;
  for(const s of active){
   let r=null;
   if(s.kind==='sheet')r=drawSheet(s,t,W/H);
   else if(s.kind==='panels')r=drawPanels(s,t,W,H,target);
   else if(s.kind==='wall')r=drawWall(s,t,W/H);
   else if(s.kind==='nozzle')r=drawNozzle(s,t,W/H);
   else if(s.kind==='dinner')r=drawDinner(s,t,W/H);
   out=r||out;
   if(!r&&s.kind!=='panels')out=out||{punch:0,exposure:1,c:null,missing:true};
  }
  dinner.group.visible=false;
  return out||{punch:0,exposure:1,c:null};
 }

 // ── Post ──
 const quadCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1),quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2)),quadScene=new THREE.Scene();quadScene.add(quad);
 const mat=(frag,uniforms)=>new THREE.ShaderMaterial({uniforms,vertexShader:QUAD_VERT,fragmentShader:frag,depthTest:false,depthWrite:false});
 const compU={A:{value:null},B:{value:null},mode:{value:0},u:{value:0},dir:{value:new THREE.Vector2(1,0)},centre:{value:new THREE.Vector2(.5,.5)},blurA:{value:new THREE.Vector2()},zoomA:{value:0},flash:{value:0},exposure:{value:1},aspect:{value:1}};
 const composite=mat(COMPOSITE_FRAG,compU),brightU={src:{value:null}},bright=mat(BRIGHT_FRAG,brightU),blurU={src:{value:null},step:{value:new THREE.Vector2()}},blur=mat(BLUR_FRAG,blurU);
 const finalU={src:{value:null},bloom:{value:null},bloomAmt:{value:.7},time:{value:0},aspect:{value:1}},final=mat(FINAL_FRAG,finalU);
 let rtA,rtB,rtC,rtH,rtV,size='';
 function targets(W,H){
  const key=W+'x'+H;if(key===size)return;size=key;for(const r of [rtA,rtB,rtC,rtH,rtV])r?.dispose();
  const o={type:THREE.HalfFloatType,depthBuffer:true};
  const samples=lowMemory?2:4;rtA=new THREE.WebGLRenderTarget(W,H,{...o,samples});rtB=new THREE.WebGLRenderTarget(W,H,{...o,samples});rtC=new THREE.WebGLRenderTarget(W,H,{type:THREE.HalfFloatType,depthBuffer:false});
  const q=[Math.max(1,W>>2),Math.max(1,H>>2)];rtH=new THREE.WebGLRenderTarget(...q,{type:THREE.HalfFloatType,depthBuffer:false});rtV=new THREE.WebGLRenderTarget(...q,{type:THREE.HalfFloatType,depthBuffer:false});
 }
 function pass(material,target){quad.material=material;renderer.setRenderTarget(target);renderer.render(quadScene,quadCam);}

 // Screen-space motion of the look target, for camera motion blur.
 const probe=new THREE.Vector3();
 function motionOf(s,t,aspect){
  if(!s||s.kind!=='sheet')return null;
  const dt=1/60,c0=camAt(s.cam,t-dt),c1=camAt(s.cam,t);if(t-dt<s.t0)return null;
  aimSheet(c0,aspect,s.cover,s.clamp);camera.updateMatrixWorld();probe.set(c1.x-1280,540-c1.y,0).project(camera);
  const vx=-probe.x/2,vy=-probe.y/2,zoom=Math.log(c0.w/c1.w);
  return {v:[vx,vy],zoom};
 }
 function cutsAround(t){
  let prev=null,next=null;for(const c of edit.cuts){if(c.at<=t)prev=c;else{next=c;break;}}return {prev,next};
 }

 let lastW=0,lastH=0,failed=false,lastTime=-1,previousPrefetch=-10,lastFrameAt=0,slowFrames=0,quality=1;
 function render(t,{force=false}={}){
  if(failed)return false;
  const W0=host.clientWidth,H0=host.clientHeight;if(!W0||!H0)return false;
  // Adaptive resolution: if frames take too long during playback, render fewer pixels.
  const now=performance.now(),gap=now-lastFrameAt;lastFrameAt=now;
  if(gap<120&&Math.abs(t-lastTime)>0&&Math.abs(t-lastTime)<.2){slowFrames=slowFrames*.95+(gap>24?.05:0);if(slowFrames>.5&&quality>.55){quality*=.8;slowFrames=0;lastW=0;}}
  if(W0!==lastW||H0!==lastH){renderer.setPixelRatio(quality*Math.min(devicePixelRatio,lowMemory?1.25:1.6,Math.sqrt((lowMemory?1.4e6:2.6e6)/(W0*H0))));renderer.setSize(W0,H0,false);lastW=W0;lastH=H0;}
  const W=Math.round(W0*renderer.getPixelRatio()),H=Math.round(H0*renderer.getPixelRatio());targets(W,H);
  if(Math.abs(t-previousPrefetch)>.25){prefetch(t);previousPrefetch=t;}
  canvas.style.display='block';host.dataset.filmActive='1';
  const {prev,next}=cutsAround(t);let mode=0,u=0,flash=0,selA=t,selB=null,dir=[1,0],centre=[.5,.5],fromBlack=1;
  if(prev){
   const post=prev.post??(prev.type==='whip'?.16:prev.type==='zoom'?.3:prev.type==='iris'?.5:0),age=t-prev.at;
   if(prev.type==='flash')flash=(prev.amt??1)*Math.exp(-age/.075)*.85;
   if(prev.type==='black')fromBlack=smooth(age/post);
   else if(age<post&&MODES[prev.type]){mode=MODES[prev.type];const pre=prev.pre??(prev.type==='whip'?.16:0);u=(age+pre)/(pre+post);selA=prev.at-1e-4;selB=t;dir=prev.dir||dir;centre=prev.center||centre;}
  }
  if(!selB&&next&&MODES[next.type]){const pre=next.pre??(next.type==='whip'?.16:0),post=next.post??(next.type==='whip'?.16:next.type==='zoom'?.3:.5);if(next.at-t<pre){mode=MODES[next.type];u=(t-(next.at-pre))/(pre+post);selA=t;selB=next.at+1e-4;dir=next.dir||dir;centre=next.center||centre;}}
  const a=drawFrame(selA,t,rtA,W,H);
  if(selB!==null)drawFrame(selB,t,rtB,W,H);
  // Motion blur follows the camera of the main shot.
  const main=edit.shots.find(s=>s.t0<=selA&&selA<s.t1&&s.kind==='sheet');const m=mode===0?motionOf(main,t,W/H):null;
  compU.A.value=rtA.texture;compU.B.value=(selB!==null?rtB:rtA).texture;compU.mode.value=mode;compU.u.value=clamp(u);compU.dir.value.set(...dir);compU.centre.value.set(...centre);
  compU.blurA.value.set(m?clamp(m.v[0]*1.2,-.05,.05):0,m?clamp(m.v[1]*1.2,-.05,.05):0);compU.zoomA.value=m?clamp(m.zoom*1.4,-.06,.06):0;
  compU.flash.value=flash;compU.exposure.value=a.exposure*fromBlack;compU.aspect.value=W/H;
  pass(composite,rtC);
  brightU.src.value=rtC.texture;pass(bright,rtH);
  blurU.src.value=rtH.texture;blurU.step.value.set(1/rtH.width,0);pass(blur,rtV);
  blurU.src.value=rtV.texture;blurU.step.value.set(0,1/rtH.height);pass(blur,rtH);
  blurU.src.value=rtH.texture;blurU.step.value.set(2/rtH.width,0);pass(blur,rtV);
  blurU.src.value=rtV.texture;blurU.step.value.set(0,2/rtH.height);pass(blur,rtH);
  finalU.src.value=rtC.texture;finalU.bloom.value=rtH.texture;finalU.bloomAmt.value=.75+a.punch*6+(energy.active?energy.bass*.5:0);finalU.time.value=t;finalU.aspect.value=W/H;
  quad.material=final;renderer.setRenderTarget(null);renderer.setViewport(0,0,W0,H0);renderer.render(quadScene,quadCam);
  canvas.dataset.time=t.toFixed(3);canvas.dataset.pending=String(pendingCount);lastTime=t;
  return true;
 }
 function hide(){canvas.style.display='none';delete host.dataset.filmActive;}
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;hide();});
 prefetch(0);
 return {render,hide,setAudioLevels(v){energy=v;},pending:()=>pendingCount,prefetch,
  /** Resolves once every asset needed around time t is decoded (used by frame export). */
  ready(t){prefetch(t);return new Promise(res=>{const check=()=>{const want=prefetch(t);const missing=[...want].some(k=>{const [kind,id]=k.split(':');if(kind==='film'||kind==='thumb'){const e=textures.get(k);return e&&!e.texture&&!e.failed;}if(kind==='drawing'){const e=drawings.get(k);return e&&!e.geometry&&!e.failed;}if(k==='atlas')return !atlas;if(k==='nozzle')return !nozzle;if(k==='dinner')return !dinner.isReady();return false;});if(!missing)res();else setTimeout(check,50);};check();});}};
}
