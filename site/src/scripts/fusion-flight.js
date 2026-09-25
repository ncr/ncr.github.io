import * as THREE from 'three';
import paths from '../data/fusion-paths.json';
import nozzle from '../data/fusion-nozzle.json';
import timing from '../data/flight-timing.json';

// Source paths are the released drawing, lifted off its page as cylindrical ink.
export function createFlight(host) {
  const renderer = new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.setClearColor(0x100c10,1);
  const element=renderer.domElement;element.className='fusion-flight';element.setAttribute('aria-hidden','true');host.append(element);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(48,1,.2,4000);
  const positions=[],normals=[],colors=[],growth=[],heroes=[],indices=[];
  const routePath=paths.filter(p=>p.name.startsWith('liquid tin stream')).sort((a,b)=>length(b.p)-length(a.p))[0];
  function length(p){return p.slice(1).reduce((s,v,i)=>s+Math.hypot(v[0]-p[i][0],v[1]-p[i][1]),0);}
  function depth(p){return p.role==='radiator'||p.role==='cable'?12:p.role==='accent'?8:3;}
  const route=new THREE.CatmullRomCurve3(routePath.p.map(p=>new THREE.Vector3(p[0],p[1],depth(routePath))),false,'centripetal');
  for(const [pi,p] of paths.entries()){
    const z=depth(p),pts=p.p.map(v=>new THREE.Vector3(v[0],v[1],z));
    const total=length(p.p);let distance=0;
    const hero=p===routePath;
    const start=hero?0:Math.max(0,Math.min(.72,(pts[0].x+380)/1050+(pi%7)*.018));
    const col=new THREE.Color(hero?0x9bdcff:p.role==='radiator'?0x66b8d3:p.role==='cable'?0xe8b465:0xd6bca4);
    const radius=hero?.7:p.role==='structure'?.65:.40;
    const base=positions.length/3;
    for(let i=0;i<pts.length;i++){
      if(i)distance+=pts[i].distanceTo(pts[i-1]);
      const tangent=pts[Math.min(i+1,pts.length-1)].clone().sub(pts[Math.max(0,i-1)]).normalize();
      const side=new THREE.Vector3(-tangent.y,tangent.x,0);
      for(let k=0;k<6;k++){
        const a=k/6*Math.PI*2,n=side.clone().multiplyScalar(Math.cos(a)).add(new THREE.Vector3(0,0,Math.sin(a)));
        positions.push(pts[i].x+n.x*radius,pts[i].y+n.y*radius,z+n.z*radius);normals.push(n.x,n.y,n.z);colors.push(col.r,col.g,col.b);
        growth.push(hero?distance/total:start+distance/total*.25);heroes.push(hero?1:0);
      }
      if(i)for(let k=0;k<6;k++){const a=base+(i-1)*6+k,b=base+(i-1)*6+(k+1)%6,c=base+i*6+k,d=base+i*6+(k+1)%6;indices.push(a,c,b,b,c,d);}
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('inkColor',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('birth',new THREE.Float32BufferAttribute(growth,1));geometry.setAttribute('hero',new THREE.Float32BufferAttribute(heroes,1));geometry.setIndex(indices);
  const material=new THREE.ShaderMaterial({uniforms:{progress:{value:0},routeGrowth:{value:0},pulse:{value:0}},vertexShader:`attribute vec3 inkColor;attribute float birth;attribute float hero;varying float isHero;varying vec3 color;varying vec3 n;varying float born;void main(){isHero=hero;color=inkColor;n=normalMatrix*normal;born=birth;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float progress;uniform float routeGrowth;uniform float pulse;varying float isHero;varying vec3 color;varying vec3 n;varying float born;void main(){float front=mix(progress,routeGrowth,isHero);if(born>front)discard;float light=.42+.58*max(0.,dot(normalize(n),normalize(vec3(.2,.6,1.))));float tip=1.-smoothstep(0.,.023,front-born);gl_FragColor=vec4(sqrt(color)*(light+.2+tip*.7+pulse*.10),1.);}`});
  const drawing=new THREE.Mesh(geometry,material);scene.add(drawing);
  const detail=new THREE.Group();scene.add(detail);detail.visible=false;
  scene.add(new THREE.AmbientLight(0xcbd8ff,1.4));
  const key=new THREE.DirectionalLight(0xffe0bd,3);key.position.set(-100,200,250);scene.add(key);
  const rim=new THREE.DirectionalLight(0x69c8ff,2);rim.position.set(180,-40,-180);scene.add(rim);
  for(const part of nozzle){
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(part.v,3));g.setIndex(part.i);g.computeVertexNormals();
    const coil=part.name.includes('coil');
    const m=new THREE.MeshStandardMaterial({color:coil?0x516576:0x283544,metalness:.55,roughness:.36});
    detail.add(new THREE.Mesh(g,m));detail.add(new THREE.LineSegments(new THREE.EdgesGeometry(g,28),new THREE.LineBasicMaterial({color:coil?0xe7c18b:0x82c5e3,transparent:true,opacity:.65})));
  }
  const board=new THREE.Mesh(new THREE.PlaneGeometry(1800,1100),new THREE.ShaderMaterial({vertexShader:`varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 v;void main(){float grain=fract(sin(dot(v,vec2(127.1,311.7)))*43758.5453);float light=exp(-length((v-.5)*2.)*2.);gl_FragColor=vec4(vec3(.055,.029,.03)+light*vec3(.055,.025,.02)+(grain-.5)*.012,1.);}`}));board.position.z=-5;scene.add(board);
  const guide=new THREE.Mesh(new THREE.SphereGeometry(.65,12,8),new THREE.MeshBasicMaterial({color:0xc5eeff}));scene.add(guide);
  let lastW=0,lastH=0,failed=false;
  element.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;element.style.display='none';});
  const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
  const mix=(a,b,t)=>a.clone().lerp(b,smooth(t));
  function render(absoluteTime){
    const orbiting=absoluteTime>=timing.orbit;
    const t=(absoluteTime-timing.start)/(timing.orbit-timing.start)*11.27;
    if(failed)return false;
    const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return false;
    if(w!==lastW||h!==lastH){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();lastW=w;lastH=h;}
    if(orbiting){
      drawing.visible=false;board.visible=false;guide.visible=false;detail.visible=true;
      const elapsed=absoluteTime-timing.orbit,duration=timing.end-timing.orbit,u=THREE.MathUtils.clamp(elapsed/duration,0,1);
      const angle=-.8+u*Math.PI*1.4,radius=Math.max(220,135/camera.aspect)*(1+.35*(1-smooth(elapsed/1.7)));
      camera.up.set(0,1,0);camera.position.set(Math.sin(angle)*radius,45+40*Math.sin(u*Math.PI),Math.cos(angle)*radius);camera.lookAt(0,0,0);
      element.style.display='block';element.style.opacity=String(smooth(elapsed/.5)*(1-smooth((elapsed-duration+.8)/.8)));
      renderer.render(scene,camera);return true;
    }
    drawing.visible=true;board.visible=true;detail.visible=false;
    const u=THREE.MathUtils.clamp(t/11.27,0,1);
    element.style.display='block';element.style.opacity=String(smooth(t/.45)*(1-smooth((t-9.65)/1.62)));
    const progress=smooth(t/6.3);material.uniforms.progress.value=progress;
    // Gentle beat accents; no full-screen flashes.
    const beat=timing.beats.findLast(b=>b<=absoluteTime)??absoluteTime;material.uniforms.pulse.value=Math.exp(-(absoluteTime-beat)/.12);
    const at=THREE.MathUtils.clamp((t-1.8)/4.1,0,1),point=route.getPointAt(at),ahead=route.getPointAt(Math.min(1,at+.12));
    material.uniforms.routeGrowth.value=Math.min(1,at+.1);guide.position.copy(route.getPointAt(Math.min(1,at+.1)));guide.visible=t<6.0;
    const tangent=route.getTangentAt(at),ride=point.clone().addScaledVector(tangent,-32).add(new THREE.Vector3(0,-16,29));
    const overview=new THREE.Vector3(-180,-230,Math.max(580,500/camera.aspect));
    const final=new THREE.Vector3(0,0,Math.max(530,460/camera.aspect));
    camera.up.set(Math.sin(u*Math.PI)*.13,1,0);
    if(t<2){camera.position.copy(mix(overview,ride,t/2));camera.lookAt(mix(new THREE.Vector3(),ahead,t/2));}
    else if(t<5.9){camera.position.copy(ride);camera.lookAt(ahead.clone().add(new THREE.Vector3(0,0,2)));}
    else {camera.position.copy(mix(ride,final,(t-5.9)/3.6));camera.lookAt(mix(ahead,new THREE.Vector3(),(t-5.9)/3.6));}
    renderer.render(scene,camera);
    return true;
  }
  return {render,hide(){element.style.display='none';}};
}
