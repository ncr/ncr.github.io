// One audio graph for the persistent media element. No second player, no beat simulation.
const audio=document.querySelector('.tour-music');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let context,analyser,data,tickId=0,previous=0;
const bands={bass:0,mids:0,highs:0,level:0,active:false};
const spectrum=new Float32Array(16),meter=document.querySelectorAll('.music-meter i');let spectralRanges=[];
function publish(){window.dispatchEvent(new CustomEvent('destiny-audio',{detail:{...bands,spectrum:Array.from(spectrum)}}));}
async function activate(){
 try{
  if(!context){
   const AudioContext=window.AudioContext||window.webkitAudioContext;
   if(!AudioContext)return;
   context=new AudioContext();analyser=context.createAnalyser();analyser.fftSize=1024;analyser.smoothingTimeConstant=.82;
   const source=context.createMediaElementSource(audio);source.connect(analyser);analyser.connect(context.destination);data=new Uint8Array(analyser.frequencyBinCount);
   spectralRanges=Array.from({length:16},(_,i)=>[Math.max(1,Math.floor(40*(14000/40)**(i/16)/(context.sampleRate/analyser.fftSize))),Math.min(data.length-1,Math.ceil(40*(14000/40)**((i+1)/16)/(context.sampleRate/analyser.fftSize)))]);
  }
  if(context.state==='suspended')await context.resume();
  if(!audio.paused)start();
 }catch{ /* Native audio remains the fallback when Web Audio is unavailable. */ }
}
function reset(){cancelAnimationFrame(tickId);tickId=0;for(const key of ['bass','mids','highs','level'])bands[key]=0;bands.active=false;spectrum.fill(0);meter.forEach(el=>el.style.height='3px');publish();}
function tick(now){
 if(audio.paused||audio.ended){reset();return;}
 if(analyser&&context.state==='running'&&now-previous>=1000/30){
  previous=now;analyser.getByteFrequencyData(data);
  function mean(low,high){const step=context.sampleRate/analyser.fftSize;const a=Math.max(1,Math.floor(low/step)),b=Math.min(data.length-1,Math.ceil(high/step));let sum=0;for(let i=a;i<=b;i++)sum+=data[i]/255;return sum/Math.max(1,b-a+1);}
  const audible=audio.volume>0&&!audio.muted&&!audio.seeking;
  for(const [key,lo,hi]of [['bass',35,180],['mids',180,2200],['highs',2200,12000]]){
   const target=audible?mean(lo,hi):0;bands[key]+=(target-bands[key])*(target>bands[key]?.45:.14);
  }
  for(let i=0;i<16;i++){const [a,b]=spectralRanges[i];let sum=0;for(let j=a;j<=b;j++)sum+=data[j]/255;const target=audible?sum/(b-a+1):0;spectrum[i]+=(target-spectrum[i])*(target>spectrum[i]?.55:.2);}
  bands.level=(bands.bass+bands.mids+bands.highs)/3;bands.active=audible;
  [bands.bass,bands.mids,bands.highs,bands.level].forEach((v,i)=>{if(meter[i])meter[i].style.height=(reduced.matches?(audible?8:3):3+v*15)+'px';});
  publish();
 }
 tickId=requestAnimationFrame(tick);
}
function start(){if(!tickId)tickId=requestAnimationFrame(tick);}
// Resume the graph during the actual user gesture, before any asynchronous MP3 load.
document.addEventListener('click',e=>{
 if(e.target.closest('.music-toggle')||(e.target.closest('.gallery-launch')&&document.cookie.split('; ').includes('destiny-sound=on')))activate();
},true);
audio.addEventListener('playing',()=>{if(context)activate();});audio.addEventListener('pause',reset);audio.addEventListener('ended',reset);
