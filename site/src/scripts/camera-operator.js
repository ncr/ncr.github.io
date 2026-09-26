// A damped camera operator follows the actual pen, not a pre-authored spatial spline.
// Fixed-rate integration is cached: seek/replay never depends on previous rendered frames.
const clamp=t=>Math.max(0,Math.min(1,t));
const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
function noise(t,seed){
 const n=Math.floor(t),f=t-n,u=f*f*f*(f*(f*6-15)+10);
 const value=k=>{let h=Math.imul(k+seed,374761393);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295*2-1;};
 return value(n)*(1-u)+value(n+1)*u;
}
export function createOperator(nib,plan,fit){
 const dt=1/90,frames=[],duration=plan.end-plan.start,seed=plan.seed;
 const pos=[0,0,fit],pv=[0,0,0],aim=[0,0,0],av=[0,0,0];let roll=0,rv=0;
 const spring=(p,v,g,omega,damping)=>{for(let j=0;j<3;j++){v[j]+=(omega*omega*(g[j]-p[j])-2*damping*omega*v[j])*dt;p[j]+=v[j]*dt;}};
 for(let i=0;i<=Math.ceil(duration/dt)+1;i++){
  const t=i*dt,enter=ease(t/plan.establish),pull=ease((t-plan.followEnd)/(plan.holdStart-plan.followEnd));
  const p=nib(t),a=nib(t+.045),z=nib(t-.045),len=Math.hypot(a.x-z.x,a.y-z.y)||1,tx=(a.x-z.x)/len,ty=(a.y-z.y)/len;
  const flight=enter*(1-pull),breath=noise(t*.7,seed),sway=noise(t*.91,seed+71);
  const offset=8+seed%7,range=.24+(seed%5)*.014;
  const goal=[flight*(p.x-tx*14-ty*offset+breath*3.5),flight*(p.y-ty*14+tx*offset+sway*3),fit*(1-flight*(1-range))+breath*1.5*flight];
  const ahead=nib(t+.095),gaze=[ahead.x*flight+breath*flight,ahead.y*flight+sway*flight,4*flight];
  spring(pos,pv,goal,8.5,.9);spring(aim,av,gaze,22,.96);
  const desiredRoll=(noise(t*.55,seed+139)*.034+tx*.012)*flight;
  rv+=(30*(desiredRoll-roll)-9*rv)*dt;roll+=rv*dt;
  frames.push([...pos,...aim,roll]);
 }
 return time=>{
  const t=clamp(time/duration)*duration/dt,i=Math.min(frames.length-2,Math.floor(t)),u=t-i;
  return frames[i].map((v,j)=>v+(frames[i+1][j]-v)*u);
 };
}
