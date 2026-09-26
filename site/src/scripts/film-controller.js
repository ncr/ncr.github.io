// Loads the music-video renderer on demand and drives it from the tour clock.
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let film,loading=false,disabled=false,last,energy;
function update(detail){
 last=detail;
 if(disabled||reduced.matches||!detail.active||!detail.enabled){film?.hide();return;}
 if(!film&&!loading){
  loading=true;
  import('./film/engine.js').then(({createFilm})=>{
   try{film=createFilm(document.querySelector('.viewer-canvas'),()=>last&&update(last));window.destinyFilm=film;if(energy)film.setAudioLevels(energy);update(last);}
   catch(error){console.warn('Film renderer unavailable:',error);disabled=true;}
  }).catch(()=>disabled=true);
 }
 film?.render(detail.time);
}
window.addEventListener('destiny-camera',e=>update(e.detail));
window.addEventListener('destiny-audio',e=>{energy=e.detail;film?.setAudioLevels(energy);});
reduced.addEventListener('change',()=>last&&update(last));
