"""Visual checks for every final-bar pulse, beat-shaped banking, and authentic dinner orbit."""
import functools,json,sys,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];out=Path('/tmp/destiny-blog-review');out.mkdir(exist_ok=True);server=None
if len(sys.argv)>1:url=sys.argv[1]
else:
 class Quiet(SimpleHTTPRequestHandler):
  def log_message(self,*a):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root/'site/dist')));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/draft/dfe721c83120beddf965ffaf03237223/'
score=json.loads((root/'site/src/data/drawing-score.json').read_text());dinner=next(s for s in score if s['id']=='o10');regular=next(s for s in score if s.get('phrase')==1)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=browser.new_page(viewport={'width':1440,'height':1000});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda e:errors.append(e.text) if e.type=='error' and any(x in e.text for x in ['WebGL','Shader','GL_INVALID']) else None)
  page.add_init_script('window.measure=false;window.costs=[];window.longTasks=[];const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>raf(t=>{const a=performance.now();fn(t);if(window.measure)window.costs.push(performance.now()-a)});new PerformanceObserver(list=>{if(window.measure)window.longTasks.push(...list.getEntries().map(e=>e.duration))}).observe({type:"longtask",buffered:true});');
  page.goto(url,wait_until='domcontentloaded');page.locator('.gallery-launch').click()
  def seek(t):page.locator('.tour-seek').fill(f'{t:.2f}'.rstrip('0').rstrip('.'));page.locator('.tour-seek').dispatch_event('input')
  seek(regular['start']+regular['beats'][7]);page.wait_for_function('document.querySelector(".fusion-flight")?.dataset.drawing==="o01"')
  rolls=[]
  for i in range(8,16):
   seek(regular['start']+regular['beats'][i]);peak=page.locator('.viewer-canvas').evaluate('(e)=>({pulse:+e.dataset.beatPulse,scale:+e.dataset.paperScale,roll:+e.dataset.paperRoll})');assert peak['pulse']>.97,(i,peak)
   rolls.append(abs(peak['roll']));seek(regular['start']+(regular['beats'][i]+regular['beats'][i+1])/2);assert float(page.locator('.viewer-canvas').get_attribute('data-beat-pulse'))<.001
   if i>=12:assert peak['scale']>float(page.locator('.viewer-canvas').get_attribute('data-paper-scale'))*1.02
  assert rolls[0]>15 and rolls[0]>rolls[1]>rolls[2]>rolls[3]>rolls[4] and rolls[4]==0,rolls
  for i in [8,9,10,11,12,13]:
   seek(regular['start']+regular['beats'][i]);page.screenshot(path=str(out/f'bank-beat-{i}.png'))
  orbit=next(p for p in json.loads((root/'site/src/data/music-grid.json').read_text())['phrases'] if p['kind']=='orbit')
  for i in range(8,16):
   seek(orbit['beats'][i]);assert float(page.locator('.viewer-canvas').get_attribute('data-beat-pulse'))>.97
  angles=[]
  for i in [1,4,6,8,9,10,11,12,14]:
   seek(dinner['start']+dinner['beats'][i]);page.wait_for_function('document.querySelector(".fusion-flight")?.dataset.spatial==="truth-dinner"',timeout=60000)
   state=page.locator('.fusion-flight').evaluate('(e)=>({a:+e.dataset.orbitAzimuth,fade:+e.dataset.dissolve,opacity:+e.style.opacity})');angles.append(state['a']);page.screenshot(path=str(out/f'truth-beat-{i}.png'))
   if i==11:assert .4<state['fade']<.6
   if i>=12:assert state['opacity']<.00001
  assert max(angles)-min(angles)>1.2,angles
  page.set_viewport_size({'width':390,'height':844});seek(dinner['start']+dinner['beats'][6]);page.screenshot(path=str(out/'truth-mobile.png'));assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  # Warm real playback across the 3D retreat and the following object.
  page.set_viewport_size({'width':1440,'height':1000});seek(dinner['start']+2)
  page.evaluate('window.pauses=0;document.querySelector(".tour-music").addEventListener("pause",()=>window.pauses++)');page.locator('.music-toggle').click();page.wait_for_function('!document.querySelector(".tour-music").paused&&document.querySelector(".tour-music").currentTime>161',timeout=60000)
  page.evaluate('window.measure=true');page.wait_for_function('document.querySelector(".tour-music").currentTime>168',timeout=30000);page.evaluate('window.measure=false');assert page.evaluate('window.pauses')==0
  profile=page.evaluate('(()=>{const a=costs.sort((a,b)=>a-b);return {callbacks:a.length,p95:a[Math.floor(a.length*.95)],max:a.at(-1),longTasks}})()');print('Warmed dinner playback:',profile,flush=True)
  page.emulate_media(reduced_motion='reduce');seek(regular['start']+regular['beats'][12]);assert float(page.locator('.viewer-canvas').get_attribute('data-beat-pulse'))==0;assert not page.locator('.fusion-flight').is_visible()
  assert not errors,errors;browser.close();print('PASS: all eight final-half beats accent, 16-degree bank settles on beat 12, full-frame pulses, dinner 3D orbit and registered dissolve, mobile and reduced motion.')
finally:
 if server:server.shutdown()
