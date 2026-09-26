import score from '../data/bass-beats.json';
// Timestamp lookup only: audio analysis is done offline from the exact recording.
// Two overlapping bursts at most; seeking never carries emitter state between scenes.
export function bassAttacksAt(time,active,out){
 let lo=0,hi=score.beats.length;
 while(lo<hi){const mid=(lo+hi)>>1;if(score.beats[mid][0]<=time)lo=mid+1;else hi=mid;}
 for(let slot=0;slot<2;slot++){
  const beat=score.beats[lo-1-slot];out[slot*2]=beat?.[0]??-1000;
  out[slot*2+1]=active&&beat&&time-beat[0]<.55?beat[1]:0;
 }
 return out;
}
