"""Browser smoke test for the built drawing score. Requires Python Playwright.
Build site first, then: python3 tools/check-drawing-tour.py [https://preview-url/]
"""
import functools,json,sys,threading
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
server=None
if len(sys.argv)>1:url=sys.argv[1]
else:
 class Quiet(SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root/'site/dist')))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 url=f'http://127.0.0.1:{server.server_port}/draft/dfe721c83120beddf965ffaf03237223/'
score=json.loads((root/'site/src/data/drawing-score.json').read_text())
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  page=browser.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url,wait_until='domcontentloaded');assert 'noindex' in page.locator('meta[name=robots]').get_attribute('content')
  page.locator('.gallery-launch').click()
  def seek(t):
   page.locator('.tour-seek').fill(f'{t:.2f}'.rstrip('0').rstrip('.'));page.locator('.tour-seek').dispatch_event('input')
  for shot in score:
   t=round(shot['start']+(shot['end']-shot['start'])*.43,2);seek(t)
   page.wait_for_function('(id)=>{const c=document.querySelector(".fusion-flight");return c?.dataset.drawing===id&&getComputedStyle(c).display!=="none"}',arg=shot['id'])
   bridge=min(2.3,(shot['end']-shot['start'])*.43)
   seek(round(shot['end']-bridge*.2,2))
   state=page.locator('.fusion-flight').evaluate('(e)=>({landing:Number(e.dataset.landing),dissolve:Number(e.dataset.dissolve),opacity:Number(e.style.opacity)})')
   assert state['landing']==1 and .45<state['dissolve']<.6 and .4<state['opacity']<.55,(shot,state)
  # Cold/evicted geometry must appear even while the timeline is paused.
  seek(3);page.wait_for_function('document.querySelector(".fusion-flight").dataset.drawing==="o03"')
  first=page.locator('.fusion-flight').screenshot();seek(4);seek(3)
  assert first==page.locator('.fusion-flight').screenshot(),'Seeking to the same clock must reproduce the same drawing/particles'
  page.locator('.viewer-fx').click();assert not page.locator('.fusion-flight').is_visible()
  page.locator('.viewer-fx').click();assert page.locator('.fusion-flight').is_visible()
  page.set_viewport_size({'width':390,'height':844});seek(54)
  page.wait_for_function('document.querySelector(".fusion-flight").dataset.drawing==="o13"')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.emulate_media(reduced_motion='reduce');page.wait_for_function('getComputedStyle(document.querySelector(".fusion-flight")).display==="none"')
  assert not errors,errors
  # A missing vector asset leaves the real wallpaper visible, without freezing controls.
  fallback=browser.new_page();fallback.route('**/drawing/o01.json*',lambda route:route.abort())
  fallback.goto(url,wait_until='domcontentloaded');fallback.locator('.gallery-launch').click()
  fallback.locator('.tour-seek').fill('12');fallback.locator('.tour-seek').dispatch_event('input');fallback.wait_for_timeout(500)
  assert not fallback.locator('.fusion-flight').is_visible()
  fallback.wait_for_function('Array.from(document.querySelectorAll(".viewer-image, .viewer-preview")).some(e=>e.complete&&e.naturalWidth>0&&getComputedStyle(e).visibility==="visible")')
  browser.close()
 print('PASS: all 43 passages and registered dissolves, paused cold seeks, deterministic particles, effects switch, mobile, reduced motion, missing-asset fallback.')
finally:
 if server:server.shutdown()
