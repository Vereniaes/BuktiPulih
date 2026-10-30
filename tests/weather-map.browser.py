# Todo:
# -> Inspect real weather fields on both maps, desktop and phones.
# -> Verify one active layer, source details, camera changes and failure recovery.

# --- Weather browser verification ---
import asyncio,json,re,sys,subprocess
from pathlib import Path
from playwright.async_api import async_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT.parent/'knowledge/current-weather-maps-2026-10-30'
NODE='/home/vereniaes/.nvm/versions/node/v24.22.0/bin/node'
PROJECTION=subprocess.check_output([NODE,'-e',"const ts=require('typescript'),fs=require('fs');process.stdout.write(ts.transpileModule(fs.readFileSync('src/components/maps/map-projection.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);"],cwd=ROOT).decode().replace('export function','function')
FIND_API="""const el=document.querySelector('[data-map-controls]');let f=el[Object.keys(el).find(k=>k.startsWith('__reactFiber$'))];while(f&&!f.memoizedProps?.api?.getView)f=f.return;const api=f?.memoizedProps?.api;if(!api)return null;"""
async def ready(page):
 await expect(page.get_by_role('button',name='Pilihan cuaca',exact=True)).to_be_enabled(timeout=60000)
 await expect(page.locator('[data-weather-field]')).to_have_count(1,timeout=65000)
async def choose(page,group,sub=None):
 button=page.get_by_role('button',name='Pilihan cuaca',exact=True)
 if await button.get_attribute('aria-expanded')!='true':await button.click()
 await page.get_by_role('button',name=group,exact=True).click()
 if sub:await page.get_by_role('button',name=sub,exact=True).click()
 await page.get_by_role('button',name='Tutup pilihan cuaca',exact=True).click()
async def main():
 OUT.mkdir(exist_ok=True)
 report=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch()
  for width,height in [(1440,950),(390,844),(320,568)]:
   if len(sys.argv)>1 and str(width) not in sys.argv[1:]:continue
   context=await browser.new_context(viewport={'width':width,'height':height},timezone_id='Asia/Jakarta',is_mobile=width<600,has_touch=width<600)
   await context.add_init_script("Object.defineProperty(navigator,'deviceMemory',{get:()=>8});Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});")
   page=await context.new_page();page.set_default_timeout(60000);errors=[];calls=[]
   page.on('pageerror',lambda e:errors.append(re.sub(r'AIza[0-9A-Za-z_-]{20,}','[redacted]',str(e))))
   page.on('request',lambda req:calls.append(req.url) if '/api/v1/external/weather' in req.url else None)
   await page.goto('http://localhost:3001/?tab=fire',wait_until='domcontentloaded');await ready(page)
   assert await page.get_by_role('button',name='Street View',exact=True).count()==0
   await page.wait_for_timeout(2000)
   assert await page.locator('canvas[data-map-rain]').count()==0
   assert await page.locator('[data-rain-status]').count()==0
   initial=await page.evaluate('()=>{'+FIND_API+'return api.getView();}')
   error=await page.evaluate('()=>{'+PROJECTION+FIND_API+'const fast=snapshotProjection(api);return Math.max(...[[95,-10],[110,-4],[140,7],[118,0]].map(p=>{const a=fast(p),b=api.project(p);return Math.hypot(a.x-b.x,a.y-b.y);}));}')
   assert error<0.02,{'projection_error_px':error}
   for group,sub,metric in [('Hujan',None,'rain'),('Angin',None,'wind'),('Angin','Hembusan','gust'),('Suhu',None,'temperature'),('Suhu','Terasa','feels_like')]:
    await choose(page,group,sub)
    await expect(page.locator('[data-weather-field]')).to_have_attribute('data-weather-field',metric)
    assert await page.locator('[data-weather-legend]').count()==1
    assert await page.locator('[data-weather-wind]').count()==(1 if metric in ['wind','gust'] else 0)
    await page.wait_for_timeout(400)
    await page.screenshot(path=str(OUT/f'{metric}-{width}.png'))
   camera=await page.evaluate('()=>{'+FIND_API+'return api.getView();}')
   assert camera==initial,'Selecting fields must preserve the camera'
   assert len(calls)==1,{'requests':len(calls)}
   await page.get_by_role('button',name='Pilihan cuaca',exact=True).click()
   panel=await page.locator('[data-weather-panel]').bounding_box()
   assert panel['x']>=0 and panel['y']>=60 and panel['x']+panel['width']<=width+1,panel
   await page.get_by_role('button',name='Lihat cuaca di tengah peta',exact=True).click()
   await expect(page.locator('[data-weather-detail]')).to_contain_text('DWD ICON')
   await expect(page.locator('[data-weather-detail]')).to_contain_text('Estimasi model')
   await page.screenshot(path=str(OUT/f'detail-{width}.png'))
   await page.keyboard.press('Escape')
   await expect(page.get_by_role('button',name='Pilihan cuaca',exact=True)).to_be_focused()
   target=await page.evaluate('()=>{'+FIND_API+'const c=document.querySelector("canvas[data-map-markers]");let markerFiber=c[Object.keys(c).find(k=>k.startsWith("__reactFiber$"))];while(markerFiber&&!markerFiber.memoizedProps?.markers)markerFiber=markerFiber.return;const size=api.getSize();return markerFiber?.memoizedProps.markers.map(m=>({...api.project(m.point),id:m.id})).find(p=>p.id.startsWith("fire:")&&p.x>(innerWidth>860?350:24)&&p.x<size.width-70&&p.y>160&&p.y<size.height-270);}')
   if target:
    box=await page.locator('[data-map-engine]').bounding_box()
    await page.mouse.click(box['x']+target['x'],box['y']+target['y'])
    await expect(page.get_by_role('heading',name='Titik panas terdeteksi',exact=True)).to_be_visible()
    assert await page.locator('[data-weather-detail]').count()==0
    await page.get_by_role('button',name='Tutup panel',exact=True).click()

   await page.get_by_role('button',name='Pilihan cuaca',exact=True).click()
   await page.get_by_role('button',name='Nonaktifkan cuaca',exact=True).click()
   await expect(page.locator('[data-weather-field]')).to_have_count(0)
   await expect(page.locator('[data-weather-legend]')).to_have_count(0)
   await page.get_by_role('button',name='Tutup pilihan cuaca',exact=True).click()
   await page.get_by_role('button',name='Perbesar peta',exact=True).click()
   await page.wait_for_timeout(600)
   assert len(calls)==1
   await choose(page,'Suhu')
   assert len(calls)==1
   await page.get_by_role('button',name='Jelajah 3D',exact=True).click()
   await page.wait_for_function('()=>{'+FIND_API+'return api?.engine==="terrain";}',timeout=60000)
   await page.wait_for_timeout(2000)
   assert await page.evaluate('()=>{'+FIND_API+'return !!api.native.getLayer("bp-current-weather");}')
   await page.evaluate('()=>{'+FIND_API+'api.moveTo([116.4,-8.4],10);}')
   await page.wait_for_timeout(1800);await page.screenshot(path=str(OUT/f'terrain-{width}.png'))
   await page.get_by_role('button',name='Peta',exact=True).click()
   await page.wait_for_function('()=>{'+FIND_API+'return api?.engine==="google";}',timeout=60000)
   await ready(page)
   overflow=await page.evaluate('document.documentElement.scrollWidth>innerWidth')
   assert not overflow
   if errors:print('ERRORS',errors,flush=True)
   assert not errors,errors
   report.append({'width':width,'height':height,'errors':errors,'weather_requests':len(calls),'max_projection_error_px':error,'entity_click_checked':bool(target),'checks':['five metrics','one active field','source details and keyboard','same camera','no cloud stamps','off and no viewport refetch','Google/terrain georeference','no overflow']})
   await context.close()
  context=await browser.new_context(viewport={'width':1440,'height':950},timezone_id='Asia/Jakarta')
  page=await context.new_page();page.set_default_timeout(65000)
  await page.goto('http://localhost:3001/?tab=recovery',wait_until='domcontentloaded');await ready(page)
  await choose(page,'Angin','Hembusan');await page.wait_for_timeout(2000)
  await page.screenshot(path=str(OUT/'recovery-desktop.png'))
  await expect(page.locator('[data-weather-field]')).to_have_attribute('data-weather-field','gust')
  assert await page.get_by_role('button',name='Street View',exact=True).count()==0
  report.append({'page':'recovery','checks':['shared weather selectors','real grid','no Street View in map controls']})
  await context.close()
  context=await browser.new_context(viewport={'width':390,'height':844},timezone_id='Asia/Jakarta',is_mobile=True,has_touch=True)
  page=await context.new_page();page.set_default_timeout(60000)
  async def unavailable(route):await route.fulfill(status=503,json={'error':{'code':'WEATHER_UNAVAILABLE'}})
  await page.route('**/api/v1/external/weather',unavailable)
  await page.goto('http://localhost:3001/?tab=fire',wait_until='domcontentloaded')
  await expect(page.get_by_role('button',name='Pilihan cuaca',exact=True)).to_be_enabled()
  await expect(page.locator('[data-weather-legend]')).to_contain_text('Data belum tersedia')
  assert await page.locator('[data-weather-field]').count()==0
  await page.get_by_role('button',name='Pilihan cuaca',exact=True).click()
  await expect(page.locator('[data-weather-panel]')).to_contain_text('Data cuaca belum tersedia')
  await page.screenshot(path=str(OUT/'unavailable-mobile.png'))
  await page.unroute('**/api/v1/external/weather',unavailable)
  await page.get_by_role('button',name='Coba lagi',exact=True).click()
  await ready(page)
  report.append({'page':'unavailable390','checks':['no fabricated field','retry uses real source']})
  await browser.close()
 OUT.joinpath('browser-results.json').write_text(json.dumps(report,indent=2))
 print(json.dumps(report,indent=2))
asyncio.run(main())
# --- end of Weather browser verification ---
