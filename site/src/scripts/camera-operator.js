import {pullAt,inkTime,smoother,phraseMotion,beatAt} from './musical-motion.js';
// A damped camera operator follows the actual pen, not a pre-authored spatial spline.
// Fixed-rate integration is cached: seek/replay never depends on previous rendered frames.
const clamp=t=>Math.max(0,Math.min(1,t));
const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
function noise(t,seed){
 const n=Math.floor(t),f=t-n,u=f*f*f*(f*(f*6-15)+10);
 const value=k=>{let h=Math.imul(k+seed,374761393);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295*2-1;};
 return value(n)*(1-u)+value(n+1)*u;
}
export function createOperator(nib,plan,fit,beats=[],contourCue=null){
 const dt=1/90,frames=[],duration=plan.end-plan.start+(plan.tail||0),seed=plan.seed;
 const pos=[0,0,fit],pv=[0,0,0],aim=[0,0,0],av=[0,0,0];let roll=0,rv=0;
 const initial=nib(0),initialAim=nib(.095),close=plan.closeRange??(.24+(seed%5)*.014);
 pos.splice(0,3,initial.x-4,initial.y+4,fit*close);aim.splice(0,3,initialAim.x,initialAim.y,4);
 const beatPulse=time=>{
  if(time<21.663)return 0;let lo=0,hi=beats.length;
  while(lo<hi){const m=(lo+hi)>>1;if(beats[m][0]<=time+.065)lo=m+1;else hi=m;}
  let pulse=0;for(let j=Math.max(0,lo-2);j<lo;j++){const age=time-beats[j][0]+.065;if(age<.38)pulse+=(age<.065?ease(age/.065):1-ease((age-.065)/.315))*beats[j][1];}
  return Math.min(1,pulse)*ease((time-21.663)/1.075);
 };
 const spring=(p,v,g,omega,damping)=>{for(let j=0;j<3;j++){v[j]+=(omega*omega*(g[j]-p[j])-2*damping*omega*v[j])*dt;p[j]+=v[j]*dt;}};
 for(let i=0;i<=Math.ceil(duration/dt)+1;i++){
  const t=i*dt,motion=phraseMotion(plan,t),enter=plan.intro?1:smoother(t/plan.establish),pull=smoother(pullAt(plan,t));
  const p=nib(inkTime(plan,t)),a=nib(inkTime(plan,t+.045)),z=nib(inkTime(plan,t-.045)),len=Math.hypot(a.x-z.x,a.y-z.y)||1,tx=(a.x-z.x)/len,ty=(a.y-z.y)/len;
  const flight=1,breath=noise(t*.7,seed),sway=noise(t*.91,seed+71);
  const offset=plan.intro?4:8+seed%7,range=plan.closeRange??(.24+(seed%5)*.014),beat=beatPulse(plan.start+t);
  const goal=[flight*(p.x-tx*14-ty*offset+breath*3.5),flight*(p.y-ty*14+tx*offset+sway*3),fit*(1-flight*(1-range))+breath*.002*fit*flight];
  const ahead=nib(inkTime(plan,t+.095)),gaze=[ahead.x*flight+breath*flight,ahead.y*flight+sway*flight,4*flight];
  spring(pos,pv,goal,8.5,.9);spring(aim,av,gaze,22,.96);
  const desiredRoll=(noise(t*.55,seed+139)*.034+tx*.012)*flight;
  rv+=(30*(desiredRoll-roll)-9*rv)*dt;roll+=rv*dt;
  // Apply the scored approach/retreat after spring integration: it arrives on the downbeat, without spring lag.
  // Only the authored contour interludes open to a medium shot: the detail gets a stage,
  // while the complete wallpaper is still withheld until the last two beats.
  const stage=contourCue&&!plan.intro?smoother((beatAt(plan,t)-2)/4):0;
  const focus=1-.85*stage,distance=pos[2]*(1-stage)+fit*.60*stage;
  frames.push([pos[0]*focus*enter*(1-pull),pos[1]*focus*enter*(1-pull),((distance*(1-beat*.035)*enter+fit*(1-enter))*(1-pull)+fit*pull)/motion.zoom,...aim.map(v=>v*focus*enter*(1-pull)),(roll+beat*.012*(seed%2?1:-1))*enter*(1-pull)-motion.roll*Math.PI/180]);
 }
 return time=>{
  const t=clamp(time/duration)*duration/dt,i=Math.min(frames.length-2,Math.floor(t)),u=t-i;
  return frames[i].map((v,j)=>v+(frames[i+1][j]-v)*u);
 };
}
