"""Isolated frequency inputs must light their own radiator laser, not every laser."""
import functools,io,sys,threading,json
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
  browser=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=browser.new_page(viewport={'width':1440,'height':1400});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda e:errors.append(e.text) if e.type=='error' and 'WebGL' in e.text else None)
  page.goto(url,wait_until='domcontentloaded');page.locator('.gallery-launch').click()
  def seek():page.locator('.tour-seek').fill('2.4');page.locator('.tour-seek').dispatch_event('input')
  seek();page.wait_for_function('document.querySelector(".fusion-flight")?.dataset.drawing==="o03"')
  def spectrum(bins):
   page.evaluate('(bins)=>window.dispatchEvent(new CustomEvent("destiny-audio",{detail:{active:true,bass:0,mids:0,highs:0,spectrum:bins}}))',bins)
   for _ in range(25):page.wait_for_timeout(40);seek()
   return np.asarray(Image.open(io.BytesIO(page.screenshot())).convert('RGB')).astype(float)
  # Locate the six real pen tips in the prepared camera view; measure their rendered response.
  asset=json.loads((root/'site/src/data/film-assets.json').read_text())['o03'];asset=root/'site/public'/asset.lstrip('/')
  meta=json.loads(asset.with_suffix('.json').read_text());plan=meta['plans']['0']
  data=np.fromfile(asset.with_suffix('.bin'),dtype='<f4')
  c=plan['camera'];camera=data[c['offset']:c['offset']+c['count']].reshape(-1,7)
  f=2.4*plan['cameraFPS'];i=int(f);pose=camera[i]*(1-(f-i))+camera[i+1]*(f-i)
  box=page.locator('.fusion-flight').bounding_box();w,h=box['width'],box['height'];aspect=w/h;tan=np.tan(np.deg2rad(24))
  fit=max(meta['size'][1]/2,meta['size'][0]/(2*aspect))/tan*1.22
  origin=pose[:3].copy();origin[2]*=fit;z=origin-pose[3:6];z/=np.linalg.norm(z);right=np.cross([np.sin(pose[6]),np.cos(pose[6]),0],z);right/=np.linalg.norm(right);up=np.cross(z,right)
  d=plan['pens'];pens=data[d['offset']:d['offset']+d['count']].reshape(plan['penRows'],plan['penWidth'],4);centers=[]
  f=2.4*plan['penFPS'];i=int(f)
  for voice in range(6):
   at=pens[20+voice,i,:3]*(1-(f-i))+pens[20+voice,i+1,:3]*(f-i);v=at-origin;depth=-np.dot(v,z)
   x=round(box['x']+w/2*(1+np.dot(v,right)/(depth*tan*aspect)));y=round(box['y']+h/2*(1-np.dot(v,up)/(depth*tan)))
   assert box['x']+8<x<box['x']+w-8 and box['y']+8<y<box['y']+h-8,(voice,x,y,box)
   centers.append((x,y))
  results=[]
  for voice,group in enumerate([range(0,3),range(3,6),range(6,9),range(9,12),range(12,14),range(14,16)]):
   baseline=spectrum([0]*16);bins=[0]*16
   for i in group:bins[i]=.9
   delta=np.abs(spectrum(bins)-baseline)
   levels=[round(float(delta[y-5:y+6,x-5:x+6].mean()),2) for x,y in centers]
   assert levels[voice]>8 and levels[voice]>max(v for i,v in enumerate(levels) if i!=voice)*3,(voice,levels)
   results.append(levels)
  spectrum([.65]*16);page.screenshot(path='/tmp/destiny-blog-review/laser-six-voices.png')
  page.set_viewport_size({'width':390,'height':844});seek();page.wait_for_timeout(150);page.screenshot(path='/tmp/destiny-blog-review/laser-six-voices-mobile.png')
  assert not errors,errors;browser.close();print(json.dumps({'result':'PASS','isolatedBandImageChanges':results},indent=2))
finally:
 if server:server.shutdown()
