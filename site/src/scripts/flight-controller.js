import timing from '../data/flight-timing.json';
let flight,loading=false,disabled=false,last;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function update(detail){
  last=detail;
  if(disabled||reduced.matches||!detail.active||!detail.enabled){flight?.hide();return;}
  if(!flight&&!loading){loading=true;import('./fusion-flight.js').then(({createFlight})=>{try{flight=createFlight(document.querySelector('.viewer-canvas'));update(last);}catch{disabled=true;}}).catch(()=>disabled=true);}
  if(flight){if((detail.time>=timing.start&&detail.time<timing.drawEnd)||(detail.time>=timing.orbit&&detail.time<timing.end))flight.render(detail.time);else flight.hide();}
}
window.addEventListener('destiny-camera',e=>update(e.detail));

window.addEventListener('destiny-audio',e=>flight?.setAudioLevels(e.detail));
