// Shared by offline camera/pen baking and the renderer: a single musical clock.
export const clamp=t=>Math.max(0,Math.min(1,t));
export const smoother=t=>{t=clamp(t);return t*t*t*(t*(t*6-15)+10);};
export function beatAt(plan,t){
 const b=plan.beats;if(!b)return 0;let lo=0,hi=b.length-1;
 while(lo<hi){const m=(lo+hi+1)>>1;if(b[m]<=t)lo=m;else hi=m-1;}
 return lo+clamp((t-b[lo])/((b[lo+1]??b[lo]+.535)-b[lo]));
}
export function inkTime(plan,t){
 if(!plan.beats||t<plan.beats[0])return t;const beat=beatAt(plan,t),i=Math.min(plan.beats.length-2,Math.floor(beat)),u=clamp(beat-i);
 // Acceleration lands on each pulse; no stepped positions or stop-start pen.
 return plan.beats[i]+(plan.beats[i+1]-plan.beats[i])*(u+.55*Math.sin(2*Math.PI*u)/(2*Math.PI));
}
export function pullAt(plan,t){
 if(!plan.beats)return clamp((t-plan.followEnd)/(plan.holdStart-plan.followEnd));
 return clamp((beatAt(plan,t)-plan.pullBeat)/(plan.revealBeat-plan.pullBeat));
}
