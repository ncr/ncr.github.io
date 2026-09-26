// A damped camera operator follows the actual pen, not a pre-authored spatial spline.
// Fixed-rate integration is cached: seek/replay never depends on previous rendered frames.
const clamp=t=>Math.max(0,Math.min(1,t));
const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
function noise(t,seed){
 const n=Math.floor(t),f=t-n,u=f*f*f*(f*(f*6-15)+10);
 const value=k=>{let h=Math.imul(k+seed,374761393);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295*2-1;};
 return value(n)*(1-u)+value(n+1)*u;
}
export function createOperator(nib,plan,fit,beats=[]){
 const dt=1/90,frames=[],duration=plan.end-plan.start,seed=plan.seed;
 const pos=[0,0,fit],pv=[0,0,0],aim=[0,0,0],av=[0,0,0];let roll=0,rv=0;
 if(plan.intro){const p=nib(0),ahead=nib(.095);pos.splice(0,3,p.x-4,p.y+4,fit*plan.closeRange);aim.splice(0,3,ahead.x,ahead.y,4);}
 const beatPulse=time=>{
  if(time<20.443)return 0;let lo=0,hi=beats.length;
  while(lo<hi){const m=(lo+hi)>>1;if(beats[m][0]<=time)lo=m+1;else hi=m;}
  let pulse=0;for(let j=Math.max(0,lo-2);j<lo;j++){const age=time-beats[j][0];if(age<.38)pulse+=(age<.065?ease(age/.065):1-ease((age-.065)/.315))*beats[j][1];}
  return Math.min(1,pulse)*ease((time-20.443)/1.76);
 };
 const spring=(p,v,g,omega,damping)=>{for(let j=0;j<3;j++){v[j]+=(omega*omega*(g[j]-p[j])-2*damping*omega*v[j])*dt;p[j]+=v[j]*dt;}};
 for(let i=0;i<=Math.ceil(duration/dt)+1;i++){
  const t=i*dt,enter=plan.intro?1:ease(t/plan.establish),pull=ease((t-plan.followEnd)/(plan.holdStart-plan.followEnd));
  const p=nib(t),a=nib(t+.045),z=nib(t-.045),len=Math.hypot(a.x-z.x,a.y-z.y)||1,tx=(a.x-z.x)/len,ty=(a.y-z.y)/len;
  const flight=enter*(1-pull),breath=noise(t*.7,seed),sway=noise(t*.91,seed+71);
  const offset=plan.intro?4:8+seed%7,range=plan.closeRange??(.24+(seed%5)*.014),beat=beatPulse(plan.start+t);
  const goal=[flight*(p.x-tx*14-ty*offset+breath*3.5),flight*(p.y-ty*14+tx*offset+sway*3),fit*(1-flight*(1-range))+breath*.002*fit*flight];
  const ahead=nib(t+.095),gaze=[ahead.x*flight+breath*flight,ahead.y*flight+sway*flight,4*flight];
  spring(pos,pv,goal,8.5,.9);spring(aim,av,gaze,22,.96);
  const desiredRoll=(noise(t*.55,seed+139)*.034+tx*.012)*flight;
  rv+=(30*(desiredRoll-roll)-9*rv)*dt;roll+=rv*dt;
  frames.push([pos[0],pos[1],pos[2]*(1-beat*.035*flight),...aim,roll+beat*.012*flight*(seed%2?1:-1)]);
 }
 return time=>{
  const t=clamp(time/duration)*duration/dt,i=Math.min(frames.length-2,Math.floor(t)),u=t-i;
  return frames[i].map((v,j)=>v+(frames[i+1][j]-v)*u);
 };
}
