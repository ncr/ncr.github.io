// Shared by offline camera/pen baking and the renderer: a single musical clock.
export const clamp=t=>Math.max(0,Math.min(1,t));
export const smoother=t=>{t=clamp(t);return t*t*t*(t*(t*6-15)+10);};
export function beatAt(plan,t){
 const b=plan.beats;if(!b)return 0;if(t<b[0])return (t-b[0])/(b[1]-b[0]);let lo=0,hi=b.length-1;
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
// Beat accents persist through the retreat and the full-sheet fourth bar.
export function phraseMotion(plan,t){
 if(!plan?.beats)return {roll:0,zoom:1,pan:0,light:1,pulse:0};
 const b=beatAt(plan,t),start=plan.pullBeat,end=plan.revealBeat;
 const u=b-Math.floor(b),clock=Math.floor(b)+u+.65*Math.sin(2*Math.PI*u)/(2*Math.PI);
 const settle=1-smoother((clock-start)/(end-start));
 const ready=smoother((b-(start-4))/4),sign=plan.seed%2?1:-1;
 const envelope=smoother((b-(start-1)))* (1-smoother((b-15)/1));
 const pulse=Math.pow((1+Math.cos(2*Math.PI*b))/2,5)*envelope;
 return {roll:sign*(16*ready*settle+.9*pulse*settle),zoom:1+.032*pulse,pan:.003*Math.sin(Math.PI*b/2)*pulse,light:1+.055*pulse,pulse};
}
