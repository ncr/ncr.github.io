// The same renderer is usable as a standalone wallpaper, outside this blog.
let renderer,profiles,ready;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let visible=false,enabled=true,current;
async function prepare(){
 if(!ready)ready=Promise.all([import(/* @vite-ignore */ '/gallery/destiny/ambient/renderer.js'),fetch('/gallery/destiny/ambient/profiles.json').then(r=>r.json())]).then(([module,data])=>{profiles=data;renderer=module.createAmbient(document.querySelector('.viewer-frame'));});
 await ready;
}
function state(){renderer?.setEnabled(visible&&enabled&&!reduced.matches&&!document.hidden);}
window.addEventListener('destiny-wallpaper',async e=>{
 current=e.detail;visible=true;
 try{await prepare();const w=current;await renderer.load(w.thumb,profiles[w.id]);state();}catch{renderer?.setEnabled(false);}
});
window.addEventListener('destiny-camera',e=>{visible=e.detail.active;enabled=e.detail.enabled;state();});
document.querySelector('#wallpaper-viewer').addEventListener('close',()=>{visible=false;state();});
reduced.addEventListener('change',state);document.addEventListener('visibilitychange',state);

window.addEventListener('destiny-audio',e=>renderer?.setAudioLevels(e.detail));
