# Todo:
# -> Verify Google, terrain, weather and satellite analysis interactions.
# -> Keep test observations isolated from application data.

# --- Browser verification ---
import asyncio, json, re, sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.async_api import async_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT.parent/"knowledge/google-maps-terrain-rain-2026-10-30"
GET_API="""()=>{const el=document.querySelector('[data-map-controls]');if(!el)return null;let f=el[Object.keys(el).find(k=>k.startsWith('__reactFiber$'))];while(f){const a=f.memoizedProps?.api;if(a?.getView)return {engine:a.engine,view:a.getView(),bounds:a.getBounds()};f=f.return;}return null;}"""
FIND_API="""const el=document.querySelector('[data-map-controls]');let f=el[Object.keys(el).find(k=>k.startsWith('__reactFiber$'))];while(!f.memoizedProps?.api?.getView)f=f.return;const api=f.memoizedProps.api;"""
async def engine(page,kind):await page.wait_for_function('('+GET_API+')()?.engine === '+json.dumps(kind),timeout=60000)
async def main():
 report=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch()
  for width,height in [(1440,1000),(1916,840),(390,844),(320,568),(800,1000)]:
   if len(sys.argv)>1 and str(width) not in sys.argv[1:]:continue
   context=await browser.new_context(viewport={"width":width,"height":height},is_mobile=width<600,has_touch=width<600,timezone_id="Asia/Jakarta",reduced_motion="reduce" if width==320 else "no-preference")
   page=await context.new_page();page.set_default_timeout(45000);errors=[]
   page.on('pageerror',lambda e:errors.append(re.sub(r'AIza[0-9A-Za-z_-]{20,}','[redacted]',str(e))))
   now=datetime.now(timezone.utc);stamp=now.isoformat()
   points=[{"id":"nearby-context","coordinates":[-8.415,116.415],"observed_at":(now-timedelta(hours=1)).isoformat(),"satellite":"VIIRS_NOAA20_NRT","confidence":"high","frp_mw":20}, {"id":"other","coordinates":[-2,114],"observed_at":(now-timedelta(hours=3)).isoformat(),"satellite":"VIIRS_NOAA21_NRT","confidence":"nominal","frp_mw":5}]
   async def fire(route):await route.fulfill(json={"data":{"observations":points,"bounds":[94,-12,142,8],"fetched_at":stamp,"observed_at":points[0]['observed_at'],"status":"complete","sources":[]}})
   async def weather(route):
    fields={key:[value]*15 for key,value in {'rain':0.8,'wind':18,'gust':30,'temperature':28,'feels_like':32,'u':3,'v':4}.items()}
    await route.fulfill(json={'data':{'grid':{'west':94,'south':-12,'step':12,'columns':5,'rows':3},'fields':fields,'valid_at':now.replace(minute=0,second=0,microsecond=0).isoformat(),'run_at':(now-timedelta(hours=6)).isoformat(),'fetched_at':stamp,'checked_at':stamp,'status':'ready','source':'Browser fixture','basis':'model','resolution_km':1300,'interval_seconds':3600}})
   await page.route(re.compile(r'/api/v1/external/hotspots\?'),fire)
   await page.route('**/api/v1/external/weather',weather)
   await page.goto('http://localhost:3001/?tab=fire',wait_until='domcontentloaded');await engine(page,'google')
   await page.add_style_tag(content='nextjs-portal{display:none!important}')
   await expect(page.get_by_role('button',name='Jelajah 3D',exact=True)).to_be_visible()
   if not await page.get_by_role('complementary',name='Lapisan dan filter').count():await page.get_by_role('button',name=re.compile('^Lapisan')).click()
   await page.get_by_role('button',name='Titik panas 2',exact=True).click()
   await page.get_by_role('button',name=re.compile('NOAA-20.*20 MW')).click()
   await expect(page.get_by_role('heading',name='Titik panas terdeteksi')).to_be_focused()
   await page.get_by_role('button',name='Jelajahi sekitar',exact=True).click();await engine(page,'terrain')
   await expect(page.get_by_role('heading',name='Lingkungan sekitar',exact=True)).to_be_visible()
   await page.wait_for_timeout(7000)
   snap=await page.evaluate(GET_API);assert abs(snap['view']['center'][0]-116.415)<.01,snap
   assert snap['view']['zoom']>14,snap
   elevation=await page.evaluate('()=>{'+FIND_API+'return api.native.queryTerrainElevation([116.415,-8.415]);}')
   assert elevation is not None,elevation
   await page.screenshot(path=str(OUT/f'fire-context-fixture-{width}.png'))
   await page.get_by_role('button',name='Tutupan lahan',exact=True).click();await expect(page.get_by_role('button',name='Tutupan lahan',exact=True)).to_have_attribute('aria-pressed','false')
   await page.get_by_role('button',name='Bangunan',exact=True).click();await expect(page.get_by_role('button',name='Bangunan',exact=True)).to_have_attribute('aria-pressed','false')
   await page.get_by_role('button',name='Tutup lingkungan sekitar',exact=True).click()
   await page.get_by_role('button',name='Tutup panel',exact=True).click()
   await page.get_by_role('button',name='Peta',exact=True).click();await engine(page,'google');await page.wait_for_timeout(1000)
   assert await page.locator('canvas[data-map-rain]').count()==0
   await page.get_by_role('button',name='Pilihan cuaca',exact=True).click()
   await page.get_by_role('button',name='Lihat cuaca di tengah peta',exact=True).click()
   await expect(page.locator('[data-weather-detail]')).to_be_visible()
   await page.screenshot(path=str(OUT/f'fire-weather-fixture-{width}.png'))
   await page.get_by_role('button',name='Tutup rincian cuaca',exact=True).click()
   pixel=await page.evaluate('()=>{'+FIND_API+'return api.project([116.415,-8.415]);}')
   box=await page.locator('[data-map-engine]').bounding_box()
   await page.evaluate('()=>{'+FIND_API+'window.mapTestClicks=[];api.onClick(event=>{window.mapTestClicks.push(event.pixel);},20);}')
   await page.mouse.click(box['x']+pixel['x'],box['y']+pixel['y'])
   await page.wait_for_timeout(400)
   if not await page.get_by_role('heading',name='Titik panas terdeteksi').count():
    await page.screenshot(path=str(OUT/f'entity-click-diagnostic-{width}.png'))
    diagnostic=await page.evaluate('()=>{'+FIND_API+'const p=api.project([116.415,-8.415]);const c=document.querySelector("canvas[data-map-markers]");return {view:api.getView(),pixel:p,clicks:window.mapTestClicks,canvas:c?{width:c.width,height:c.height}:null,text:[...document.querySelectorAll("h3,[data-weather-detail] strong")].map(e=>e.textContent)};}')
    print('ENTITY_CLICK_DIAGNOSTIC',json.dumps(diagnostic),flush=True)
   await expect(page.get_by_role('heading',name='Titik panas terdeteksi')).to_be_visible()
   assert await page.locator('[data-weather-detail]').count()==0,'Entity selection must take priority over weather'
   await page.get_by_role('button',name='Tutup panel',exact=True).click()
   await page.get_by_role('button',name='Pilihan cuaca',exact=True).click()
   await page.get_by_role('button',name='Nonaktifkan cuaca',exact=True).click()
   await page.get_by_role('button',name='Tutup pilihan cuaca',exact=True).click()
   if not await page.get_by_role('complementary',name='Lapisan dan filter').count():await page.get_by_role('button',name=re.compile('^Lapisan')).click()
   await page.get_by_role('button',name='Kembali ke lapisan',exact=True).click()
   await page.get_by_role('checkbox',name='Citra satelit',exact=True).check()
   await page.wait_for_timeout(6500)
   await page.get_by_text('Tampilan citra',exact=True).click()
   await page.get_by_label('Opasitas',exact=True).fill('40')
   await page.wait_for_timeout(700)
   await page.screenshot(path=str(OUT/f'fire-imagery-{width}.png'))
   await page.get_by_role('checkbox',name='Citra satelit',exact=True).uncheck()
   await page.get_by_role('button',name='Tutup panel',exact=True).click()
   layout=await page.evaluate('()=>({overflow:document.documentElement.scrollWidth>innerWidth,google:document.querySelectorAll(".gm-style").length,leaflet:document.querySelectorAll(".leaflet-container").length})')
   assert not layout['overflow'] and layout['google'] and not layout['leaflet'],layout
   assert not errors,errors
   report.append({"width":width,"checks":["Google and terrain","hotspot context flow","real DEM height","cover/building toggles","weather raster integration","entity click priority","NASA imagery/opacity","no Leaflet or overflow"],"layout":layout,"errors":errors})
   await context.close()
  await browser.close()
 OUT.mkdir(parents=True,exist_ok=True);(OUT/('map-browser-report-'+('-'.join(sys.argv[1:])or'all')+'.json')).write_text(json.dumps(report,indent=2))
 print(json.dumps(report,indent=2))
asyncio.run(main())
# --- end of Browser verification ---
