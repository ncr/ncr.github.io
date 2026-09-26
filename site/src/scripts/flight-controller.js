import timing from '../data/flight-timing.json';
import score from '../data/drawing-score.json';
let flight,loading=false,disabled=false,last,energy;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function update(detail){
  last=detail;
  if(disabled||reduced.matches||!detail.active||!detail.enabled){flight?.hide();return;}
  if(!flight&&!loading){loading=true;import('./fusion-flight.js').then(({createFlight})=>{try{flight=createFlight(document.querySelector('.viewer-canvas'),()=>last&&update(last));if(energy)flight.setAudioLevels(energy);update(last);}catch{disabled=true;}}).catch(()=>disabled=true);}
  if(flight){
    const passage=score.find(s=>detail.time>=s.start&&detail.time<s.end);
    const next=score.find(s=>s.start>detail.time);
    if(next&&next.start-detail.time<6)flight.prepare(next.id);
    if(passage||detail.time>=timing.orbit&&detail.time<timing.end)flight.render(detail.time,passage);
    else flight.hide();
  }
}
window.addEventListener('destiny-camera',e=>update(e.detail));
window.addEventListener('destiny-audio',e=>{energy=e.detail;flight?.setAudioLevels(energy);});
reduced.addEventListener('change',()=>last&&update(last));
