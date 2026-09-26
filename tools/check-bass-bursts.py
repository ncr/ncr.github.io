"""Verify a bass attack emits particles and the gap between attacks emits none."""
import functools,io,json,sys,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];server=None
if len(sys.argv)>1:url=sys.argv[1]
else:
 class Quiet(SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root/'site/dist')));threading.Thread(target=server.serve_forever,daemon=True).start()
 url=f'http://127.0.0.1:{server.server_port}/draft/dfe721c83120beddf965ffaf03237223/'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=browser.new_page(viewport={'width':1440,'height':1000});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda e:errors.append(e.text) if e.type=='error' and 'WebGL' in e.text else None)
  page.goto(url,wait_until='domcontentloaded');page.locator('.gallery-launch').click()
  def seek(t):page.locator('.tour-seek').fill(str(t));page.locator('.tour-seek').dispatch_event('input')
  def frame(t,active):
   page.evaluate('(active)=>window.dispatchEvent(new CustomEvent("destiny-audio",{detail:{active,bass:0,mids:0,highs:0,spectrum:Array(16).fill(0)}}))',active);seek(t)
   page.wait_for_function('document.querySelector(".fusion-flight")?.dataset.drawing==="o01"');page.wait_for_timeout(80)
   return page.locator('.fusion-flight').screenshot()
  deltas=[]
  # Attack near 24.353s, then a genuine gap long enough for all sparks to expire.
  for t in [24.46,24.82]:
   quiet=frame(t,False);lit=frame(t,True)
   a=np.asarray(Image.open(io.BytesIO(quiet))).astype(float);b=np.asarray(Image.open(io.BytesIO(lit))).astype(float)
   changed=int(np.count_nonzero(np.max(np.abs(a-b),axis=2)>5));deltas.append(changed)
   Path(f'/tmp/destiny-blog-review/bass-burst-{t}.png').write_bytes(lit)
  assert deltas[0]>30 and deltas[1]==0,deltas
  assert frame(14,False)==frame(14,True),'Intro must keep bass particles in reserve'
  assert frame(24.46,True)==frame(24.46,True),'Burst must be deterministic at a fixed soundtrack time'
  seek(22.3);start=float(page.locator('.viewer-canvas').get_attribute('data-paper-scale'));seek(23.7);end=float(page.locator('.viewer-canvas').get_attribute('data-paper-scale'));assert end<start*.98
  page.screenshot(path='/tmp/destiny-blog-review/slow-overview.png')
  page.emulate_media(reduced_motion='reduce');seek(22.3);a=page.locator('.viewer-canvas').get_attribute('data-paper-scale');seek(23.7);assert page.locator('.viewer-canvas').get_attribute('data-paper-scale')==a
  assert not errors,errors;browser.close();print('PASS: attack/gap changed pixels',deltas,'; overview scale',start,'→',end,'; reduced motion stays static')
finally:
 if server:server.shutdown()
