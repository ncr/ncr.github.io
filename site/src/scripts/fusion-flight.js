import * as THREE from 'three';
import paths from '../data/fusion-strokes.json';
import nozzle from '../data/fusion-nozzle.json';
import timing from '../data/flight-timing.json';

// Original contiguous strokes drawn by sixteen coordinated virtual pens in 3D.
export function createFlight(host) {
  const renderer = new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.setClearColor(0x100c10,1);
  const element=renderer.domElement;element.className='fusion-flight';element.setAttribute('aria-hidden','true');host.append(element);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(48,1,.2,4000);
  const positions=[],colors=[],growth=[],heroes=[];
  function length(p){return p.slice(1).reduce((s,v,i)=>s+Math.hypot(v[0]-p[i][0],v[1]-p[i][1]),0);}
  function depth(p){return p.role==='radiator'||p.role==='cable'?12:p.role==='accent'?8:3;}
  const routePath=paths.filter(p=>p.name.startsWith('liquid tin stream')).sort((a,b)=>length(b.p)-length(a.p))[0];
  const route=new THREE.CatmullRomCurve3(routePath.p.map(p=>new THREE.Vector3(p[0],p[1],depth(routePath))),false,'centripetal');
  const lanes=Array.from({length:16},()=>[]),pens=[];
  const hash=name=>[...name].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,0);
  for(const path of paths){if(path===routePath)continue;lanes[hash(path.name)%16].push(path);}
  function addStroke(path,start,end,hero=false){
    const total=length(path.p),distances=[0];
    for(let i=1;i<path.p.length;i++)distances.push(distances.at(-1)+Math.hypot(path.p[i][0]-path.p[i-1][0],path.p[i][1]-path.p[i-1][1]));
    const color=new THREE.Color(hero?0x9bdcff:path.role==='radiator'?0x66b8d3:path.role==='cable'?0xe8b465:0xd6bca4),z=depth(path);
    for(let i=1;i<path.p.length;i++)for(const j of [i-1,i]){
      positions.push(path.p[j][0],path.p[j][1],z);colors.push(color.r,color.g,color.b);
      growth.push(start+distances[j]/total*(end-start));heroes.push(hero?1:0);
    }
    return {path,start,end,distances,total,z,color};
  }
  for(const [lane,items]of lanes.entries()){
    // Long contours first, then smaller details; a pen lifts across disconnected paths.
    items.sort((a,b)=>length(b.p)-length(a.p));
    const total=items.reduce((sum,p)=>sum+Math.max(12,length(p.p))+8,0);let cursor=0;
    const start=lane%4*.018,span=.94-start,strokes=[];
    for(const path of items){const work=Math.max(12,length(path.p));strokes.push(addStroke(path,start+cursor/total*span,start+(cursor+work)/total*span));cursor+=work+8;}
    pens.push(strokes);
  }
  addStroke(routePath,0,1,true);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('inkColor',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('birth',new THREE.Float32BufferAttribute(growth,1));geometry.setAttribute('hero',new THREE.Float32BufferAttribute(heroes,1));
  const material=new THREE.ShaderMaterial({uniforms:{progress:{value:0},routeGrowth:{value:0},pulse:{value:0}},vertexShader:`attribute vec3 inkColor;attribute float birth;attribute float hero;varying float isHero;varying vec3 color;varying float born;void main(){isHero=hero;color=inkColor;born=birth;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float progress;uniform float routeGrowth;uniform float pulse;varying float isHero;varying vec3 color;varying float born;void main(){float front=mix(progress,routeGrowth,isHero);float laid=step(born,front);float tip=laid*(1.-smoothstep(0.,.009,front-born));gl_FragColor=vec4(sqrt(color)*(.17+laid*.56+tip*.55+pulse*.13),1.);}`});
  const drawing=new THREE.LineSegments(geometry,material);scene.add(drawing);
  const tipPositions=new Float32Array(16*3),tipGeometry=new THREE.BufferGeometry();tipGeometry.setAttribute('position',new THREE.BufferAttribute(tipPositions,3));
  const tips=new THREE.Points(tipGeometry,new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:`void main(){gl_PointSize=3.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(.76,.9,1.,(1.-smoothstep(.15,.5,d))*.85);}`}));tips.frustumCulled=false;scene.add(tips);
  function updatePens(progress){
    pens.forEach((strokes,i)=>{
      const stroke=strokes.find(s=>s.start<=progress&&s.end>=progress);
      if(!stroke){tipPositions.set([0,0,-100],i*3);return;}
      const distance=(progress-stroke.start)/(stroke.end-stroke.start)*stroke.total;
      let n=stroke.distances.findIndex(d=>d>=distance);n=Math.max(1,n);
      const a=stroke.path.p[n-1],b=stroke.path.p[n],mix=(distance-stroke.distances[n-1])/Math.max(.001,stroke.distances[n]-stroke.distances[n-1]);
      tipPositions.set([a[0]+(b[0]-a[0])*mix,a[1]+(b[1]-a[1])*mix,stroke.z+.2],i*3);
    });tipGeometry.attributes.position.needsUpdate=true;
  }
  const detail=new THREE.Group();scene.add(detail);detail.visible=false;
  for(const part of nozzle){
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(part.v,3));g.setIndex(part.i);g.computeVertexNormals();
    const coil=part.name.includes('coil');
    // Only technical linework: no filled surfaces, metallic shading or solid render.
    detail.add(new THREE.LineSegments(new THREE.EdgesGeometry(g,9),new THREE.LineBasicMaterial({color:coil?0xd7b783:0x77b6cc,transparent:true,opacity:.72})));
  }
  const board=new THREE.Mesh(new THREE.PlaneGeometry(1800,1100),new THREE.ShaderMaterial({vertexShader:`varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 v;void main(){float grain=fract(sin(dot(v,vec2(127.1,311.7)))*43758.5453);float light=exp(-length((v-.5)*2.)*2.);gl_FragColor=vec4(vec3(.055,.029,.03)+light*vec3(.055,.025,.02)+(grain-.5)*.012,1.);}`}));board.position.z=-5;scene.add(board);
  const guide=new THREE.Mesh(new THREE.SphereGeometry(.65,12,8),new THREE.MeshBasicMaterial({color:0xc5eeff}));scene.add(guide);
  let lastW=0,lastH=0,failed=false,energy={active:false,bass:0,mids:0,highs:0};
  element.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;element.style.display='none';});
  const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
  const mix=(a,b,t)=>a.clone().lerp(b,smooth(t));
  function render(absoluteTime){
    const orbiting=absoluteTime>=timing.orbit;
    const t=(absoluteTime-timing.start)/(timing.drawEnd-timing.start)*11.27;
    if(failed)return false;
    const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return false;
    if(w!==lastW||h!==lastH){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();lastW=w;lastH=h;}
    if(orbiting){
      drawing.visible=false;tips.visible=false;board.visible=false;guide.visible=false;detail.visible=true;
      detail.children.forEach((line,i)=>{line.material.opacity=energy.active?.35+.55*([energy.bass,energy.mids,energy.highs][i%3]):.72;});
      const elapsed=absoluteTime-timing.orbit,duration=timing.end-timing.orbit,u=THREE.MathUtils.clamp(elapsed/duration,0,1);
      const angle=-.8+u*Math.PI*1.4,radius=Math.max(220,135/camera.aspect)*(1+.35*(1-smooth(elapsed/1.7)));
      const roll=Math.sin(absoluteTime*.42)*.055+Math.sin(absoluteTime*.17)*.022;
      camera.up.set(Math.sin(roll),Math.cos(roll),0);camera.position.set(Math.sin(angle)*radius,45+40*Math.sin(u*Math.PI),Math.cos(angle)*radius);camera.lookAt(0,0,0);
      element.style.display='block';element.style.opacity=String(smooth(elapsed/.5)*(1-smooth((elapsed-duration+.8)/.8)));
      renderer.render(scene,camera);return true;
    }
    drawing.visible=true;tips.visible=true;board.visible=true;detail.visible=false;
    const u=THREE.MathUtils.clamp(t/11.27,0,1);
    element.style.display='block';element.style.opacity=String(smooth((t-.65)/.9)*(1-smooth((t-10.15)/1.12)));
    const progress=smooth(t/9.4);material.uniforms.progress.value=progress;updatePens(progress);
    // Live bass energy brightens ink; no full-screen flashes.
    material.uniforms.pulse.value=energy.active?energy.bass:0;
    const at=THREE.MathUtils.clamp((t-3.3)/3.5,0,1),point=route.getPointAt(at),ahead=route.getPointAt(Math.min(1,at+.07));
    material.uniforms.routeGrowth.value=Math.min(1,at+.1);guide.position.copy(route.getPointAt(Math.min(1,at+.1)));guide.visible=t<6.0;
    const tangent=route.getTangentAt(at),ride=point.clone().addScaledVector(tangent,-55).add(new THREE.Vector3(0,-35,150));
    const overview=new THREE.Vector3(0,-25,Math.max(650,540/camera.aspect));
    const final=new THREE.Vector3(0,0,Math.max(530,460/camera.aspect));
    const roll=Math.sin(absoluteTime*.42)*.055+Math.sin(absoluteTime*.17)*.022;
    camera.up.set(Math.sin(roll),Math.cos(roll),0);
    if(t<3){camera.position.copy(overview);camera.lookAt(0,0,0);}
    else if(t<4.8){camera.position.copy(mix(overview,ride,(t-3)/1.8));camera.lookAt(mix(new THREE.Vector3(),ahead,(t-3)/1.8));}
    else if(t<6.8){camera.position.copy(ride);camera.lookAt(ahead.clone().add(new THREE.Vector3(0,0,2)));}
    else {camera.position.copy(mix(ride,final,(t-6.8)/3.4));camera.lookAt(mix(ahead,new THREE.Vector3(),(t-6.8)/3.4));}
    renderer.render(scene,camera);
    return true;
  }
  return {render,setAudioLevels(value){energy=value;},hide(){element.style.display='none';}};
}
