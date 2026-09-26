"""Integration checks for cut dissolves, actual soundtrack FFT and continuity.
Build first. Run with Python Playwright; an optional URL tests the deployed draft.
Software-GL timings describe this test environment, not a device FPS promise.
"""
import functools,json,sys,threading
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];server=None
if len(sys.argv)>1:url=sys.argv[1]
else:
 class Quiet(SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root/'site/dist')))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 url=f'http://127.0.0.1:{server.server_port}/draft/dfe721c83120beddf965ffaf03237223/'
shots=json.loads((root/'site/src/data/destiny-tour.json').read_text());score=json.loads((root/'site/src/data/drawing-score.json').read_text())
out=Path('/tmp/destiny-blog-review');out.mkdir(exist_ok=True)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  page=browser.new_page(viewport={'width':1440,'height':1000});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('console',lambda e:errors.append(e.text) if e.type=='error' and any(x in e.text for x in ['WebGL','Shader','GL_INVALID']) else None)
  page.add_init_script('''window.measure=false;window.costs=[];window.longTasks=[];const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>raf(t=>{const a=performance.now();fn(t);if(window.measure)window.costs.push(performance.now()-a)});new PerformanceObserver(list=>{if(window.measure)window.longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))}).observe({type:'longtask',buffered:true});''')
  page.goto(url,wait_until='domcontentloaded');page.locator('.gallery-launch').click()
  def seek(t):
   page.locator('.tour-seek').fill(f'{t:.2f}'.rstrip('0').rstrip('.'));page.locator('.tour-seek').dispatch_event('input')
  cuts=0
  for n,s in enumerate(shots[1:],1):
   prior=next((p for p in score if p['start']<=s['at']-.001<p['end']),None)
   current=next((p for p in score if p['start']<=s['at']<p['end']),None)
   if shots[n-1]['id']==s['id'] and not(s['motion']=='cut' and not(current and current==prior)):continue
   span=min(.85,((shots[n+1]['at'] if n+1<len(shots) else 299.21)-s['at'])*.24)
   seek(s['at']+span*.15);bridge=page.locator('.scene-bridge');assert bridge.is_visible(),s
   first=float(bridge.evaluate('(e)=>e.style.opacity'))
   page.wait_for_function('document.querySelector(".scene-bridge img").complete&&document.querySelector(".scene-bridge img").naturalWidth>0')
   seek(s['at']+span*.7);assert 0<float(bridge.evaluate('(e)=>e.style.opacity'))<first<1
   seek(s['at']+span+.05);assert not bridge.is_visible();cuts+=1
  for t in [8.3,8.6,8.95,116.7,126.9]:
   seek(t);page.wait_for_timeout(150);page.screenshot(path=str(out/f'film-blend-{t}.png'))
  # Real MP3, uninterrupted across object/3D handoffs and persistent controls.
  seek(1.5);page.wait_for_function('document.querySelector(".fusion-flight").dataset.drawing==="o03"')
  page.evaluate('window.fft=[];window.pauses=0;window.originalAudio=document.querySelector(".tour-music");originalAudio.addEventListener("pause",()=>window.pauses++);window.addEventListener("destiny-audio",e=>{if(e.detail.active)window.fft.push(e.detail.spectrum)})')
  page.locator('.music-toggle').click();page.wait_for_function('!originalAudio.paused&&originalAudio.currentTime>1.7',timeout=60000)
  page.screenshot(path=str(out/'film-real-audio-particles.png'))
  page.evaluate('window.measure=true');page.wait_for_timeout(11000);page.evaluate('window.measure=false')
  fft=page.evaluate('window.fft');assert len(fft)>30 and all(len(v)==16 for v in fft)
  assert max(max(v) for v in fft)>.1 and any(max(v)-min(v)>.1 for v in fft)
  assert page.evaluate('window.pauses')==0
  profile=page.evaluate('(()=>{let a=window.costs.sort((a,b)=>a-b);return {callbacks:a.length,callbackP50:a[Math.floor(a.length*.5)],callbackP95:a[Math.floor(a.length*.95)],callbackMax:a.at(-1),longTasks:window.longTasks}})()')
  for t in [27.7,51.5,115.8,126.3]:
   page.evaluate('(t)=>originalAudio.currentTime=t',t);page.wait_for_timeout(1200)
   assert page.evaluate('!originalAudio.paused&&window.pauses===0&&document.querySelector(".tour-music")===originalAudio')
  page.locator('.viewer-close').click();page.wait_for_timeout(450);page.locator('.music-hide').click();page.locator('.soundtrack-reveal').click();page.locator('.gallery-launch').click();page.wait_for_timeout(300)
  assert page.evaluate('!originalAudio.paused&&window.pauses===0&&document.querySelector(".tour-music")===originalAudio')
  # Controlled spectral input: same camera/time must produce a visibly different particle fan.
  seek(2.4)
  def energy(value):
   page.evaluate('(v)=>window.dispatchEvent(new CustomEvent("destiny-audio",{detail:{active:true,bass:0,mids:0,highs:0,spectrum:Array(16).fill(v)}}))',value)
   for _ in range(15):page.wait_for_timeout(40);seek(2.4)
   return page.locator('.fusion-flight').screenshot()
  dark=energy(0);bright=energy(.85);assert dark!=bright,'Spectrum must change rendered particles at fixed camera/time'
  (out/'film-equalizer-particles.png').write_bytes(bright)
  page.set_viewport_size({'width':390,'height':844});seek(8.5);page.wait_for_timeout(150);page.screenshot(path=str(out/'film-mobile-blend.png'));assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  # Free gallery then return must restore the tour frame's explicit size.
  page.locator('.viewer-grid-toggle').click();page.locator('.grid-close').click();page.locator('.tour-return').click();assert page.locator('.viewer-frame').evaluate('(e)=>parseFloat(e.style.width)>0')
  assert not errors,errors
  print(json.dumps({'result':'PASS','cutDissolves':cuts,'realSpectrumSamples':len(fft),'audioPauses':0,'softwareGLProfile':profile},indent=2),flush=True)
  browser.close()
finally:
 if server:server.shutdown()
