"""Four uninterrupted close-up stories, first reveal on the musical entrance."""
import functools,json,sys,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];server=None
if len(sys.argv)>1:url=sys.argv[1]
else:
 class Quiet(SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root/'site/dist')));threading.Thread(target=server.serve_forever,daemon=True).start()
 url=f'http://127.0.0.1:{server.server_port}/draft/dfe721c83120beddf965ffaf03237223/'
score=json.loads((root/'site/src/data/drawing-score.json').read_text());tour=json.loads((root/'site/src/data/destiny-tour.json').read_text());assert len(json.loads((root/'site/src/data/destiny-gallery.json').read_text()))==42
grid=json.loads((root/'site/src/data/music-grid.json').read_text())
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=browser.new_page(viewport={'width':1440,'height':1000});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda e:errors.append(e.text) if e.type=='error' and 'WebGL' in e.text else None)
  page.goto(url,wait_until='domcontentloaded');assert 'noindex' in page.locator('meta[name=robots]').get_attribute('content');page.locator('.gallery-launch').click()
  def seek(t):page.locator('.tour-seek').fill(str(round(t,2)));page.locator('.tour-seek').dispatch_event('input')
  for t in [.03,3,5.8,6.3,9,11.75,14,16.9,17.4,19.9,20.4]:
   shot=next(s for s in score if s['start']<=t<s['end']);seek(t)
   page.wait_for_function('(id)=>document.querySelector(".fusion-flight")?.dataset.drawing===id',arg=shot['id'])
   assert page.locator('.fusion-flight').evaluate('(e)=>Number(e.dataset.range)<.23&&Number(e.dataset.dissolve)===0&&Number(e.style.opacity)===1')
   assert float(page.locator('.viewer-canvas').get_attribute('data-paper-scale'))>3
   assert page.locator('.viewer-title').inner_text()=='Światło i linie'
  for at in [5.85,11.31,16.963]:
   seek(round(at+grid['introDissolve']/2,3));page.wait_for_function('document.querySelector(".viewer-canvas").dataset.liveBlend==="1"');assert not page.locator('.scene-bridge').is_visible()
   assert .48<float(page.locator('.viewer-canvas').get_attribute('data-intro-blend'))<.52
  seek(grid['beats'][12]);assert page.locator('.fusion-flight').evaluate('(e)=>Number(e.dataset.dissolve)>.5&&Number(e.style.opacity)>0')
  seek(grid['firstReveal']+.02);assert page.locator('.fusion-flight').evaluate('(e)=>e.dataset.phase==="hold"&&Number(e.style.opacity)===0');assert page.locator('.viewer-title').inner_text()=='Sky Racer'
  page.screenshot(path='/tmp/destiny-blog-review/mystery-first-reveal.png')
  seek(19.9);page.evaluate('window.pauses=0;document.querySelector(".tour-music").addEventListener("pause",()=>window.pauses++)');page.locator('.music-toggle').click()
  page.wait_for_function('!document.querySelector(".tour-music").paused&&document.querySelector(".tour-music").currentTime>25',timeout=60000);assert page.evaluate('window.pauses')==0
  page.set_viewport_size({'width':390,'height':844});seek(14);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path='/tmp/destiny-blog-review/mystery-live-mobile.png')
  assert not errors,errors;browser.close();print('PASS: four mystery objects, three GPU close-up dissolves, no overview before entrance, full reveal on beat 14, uninterrupted actual MP3 through entrance, mobile, 42 sheets, noindex.')
finally:
 if server:server.shutdown()
