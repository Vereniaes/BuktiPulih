# Check optional downloads, constrained-device settings and real NASA gaps.
import asyncio,json,re
from pathlib import Path
from playwright.async_api import async_playwright,expect
OUT=Path(__file__).resolve().parents[1]/"knowledge/map-performance-2026-10-27"
URL="http://localhost:3001/?tab=fire"
async def main():
 report={'checks':[],'errors':[]}
 async with async_playwright() as p:
  browser=await p.chromium.launch()
  page=await browser.new_page(viewport={'width':1440,'height':900})
  await page.add_init_script("Object.defineProperty(navigator,'deviceMemory',{get:()=>2});Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>2});")
  await page.clock.install()
  requests=[];page.on('request',lambda r:requests.append(r.url));page.on('pageerror',lambda e:report['errors'].append(str(e)))
  await page.goto(URL,wait_until='domcontentloaded')
  await expect(page.get_by_role('button',name='Muat ulang sumber',exact=True)).to_be_enabled(timeout=30000)
  await page.add_style_tag(content='nextjs-portal{display:none!important}')
  await page.wait_for_timeout(800)
  assert not any('/wind' in u or '/map-imagery' in u or 'gibs.' in u or '/plots' in u or '/timeline' in u for u in requests),requests
  await expect(page.get_by_label('Kualitas peta')).to_have_value('auto')
  report['checks'].append('Light initial map requests hotspots only; inactive sources and overview are deferred')
  calls=len([u for u in requests if '/hotspots?' in u])
  await page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
  await page.clock.fast_forward(600001);await page.wait_for_timeout(300)
  assert len([u for u in requests if '/hotspots?' in u])==calls
  await page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))")
  await page.wait_for_timeout(500)
  assert len([u for u in requests if '/hotspots?' in u])>calls
  assert not any('/wind' in u or '/map-imagery' in u for u in requests)
  resumed=len([u for u in requests if '/hotspots?' in u])
  await page.clock.fast_forward(300001);await page.wait_for_timeout(500)
  assert len([u for u in requests if '/hotspots?' in u])>resumed
  report['checks'].append('Hidden tabs pause polling; stale enabled source refreshes on return and keeps its five-minute cadence')
  await page.get_by_role('checkbox',name='Citra satelit',exact=True).check()
  await page.wait_for_function("[...document.querySelectorAll('canvas.leaflet-tile')].some(c=>Number(c.dataset.coverage)>0)",timeout=35000)
  await page.get_by_text('Satelit, tanggal & opasitas',exact=True).click()
  date=page.get_by_label('Tanggal citra · UTC')
  dates=await date.locator('option').all_text_contents()
  today=await page.evaluate('new Date().toISOString().slice(0,10)')
  assert await date.input_value()!=today or len(dates)==1
  await page.screenshot(path=str(OUT/'final-imagery-desktop.png'))
  await date.select_option(dates[0])
  await page.wait_for_function("[...document.querySelectorAll('canvas.leaflet-tile')].some(c=>c.dataset.coverage==='0')",timeout=35000)
  assert await page.evaluate("[...document.querySelectorAll('canvas.leaflet-tile')].filter(c=>c.dataset.coverage==='0').every(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.filter((_,i)=>i%4===3).every(a=>a===0))")
  await page.screenshot(path=str(OUT/'final-missing-imagery.png'))
  report['checks'].append('Real current-day black NASA tiles remain transparent above the basemap')
  before=len(requests)
  for _ in range(4):await page.get_by_role('button',name='Zoom in',exact=True).click();await page.wait_for_timeout(300)
  nasa=[u for u in requests[before:] if 'gibs.' in u and '.jpeg' in u]
  assert nasa and max(int(u.split('/')[-3]) for u in nasa)<=6,nasa
  position=await page.locator('.leaflet-map-pane').get_attribute('style')
  await page.get_by_label('Kualitas peta').select_option('detail');await page.wait_for_timeout(500)
  assert await page.locator('.leaflet-map-pane').get_attribute('style')==position
  assert any('gibs.' in u and '.jpeg' in u and int(u.split('/')[-3])>6 for u in requests),requests[-20:]
  await page.reload(wait_until='domcontentloaded');await expect(page.get_by_label('Kualitas peta')).to_have_value('detail')
  assert await page.get_by_role('checkbox',name='Citra satelit',exact=True).is_checked()==False
  report['checks'].append('Automatic low graphics caps imagery resolution; manual detail preserves viewport and persists')
  await page.get_by_label('Kualitas peta').select_option('low')
  await page.wait_for_timeout(800);await page.screenshot(path=str(OUT/'final-desktop.png'))
  await page.route('**/World_Topo_Map/**',lambda route:route.abort())
  await page.get_by_role('button',name='Muat ulang sumber',exact=True).click()
  await expect(page.get_by_text('Peta dasar belum lengkap. Coba muat ulang.',exact=True)).to_be_visible()
  await page.unroute('**/World_Topo_Map/**')
  await expect(page.get_by_role('button',name='Muat ulang sumber',exact=True)).to_be_enabled(timeout=20000)
  await page.get_by_role('button',name='Muat ulang sumber',exact=True).click()
  await expect(page.get_by_text('Peta dasar belum lengkap. Coba muat ulang.',exact=True)).to_have_count(0)
  report['checks'].append('Failed basemap keeps controls usable and recovers through reload')
  for label in ['Beranda','Pemulihan','Ruang Suara Hijau','Karhutla']:
   await page.locator('nav').get_by_role('button',name=label,exact=True).click();await page.wait_for_timeout(400)
  assert any('/plots' in u for u in requests)
  report['checks'].append('Deferred tab content and overview requests load on navigation')
  await page.close()
  for width,height in [(390,844),(320,568)]:
   mobile=await browser.new_page(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,reduced_motion='reduce')
   mobile.on('pageerror',lambda e:report['errors'].append(str(e)))
   cdp=await mobile.context.new_cdp_session(mobile)
   await cdp.send('Emulation.setCPUThrottlingRate',{'rate':20})
   await mobile.goto(URL,wait_until='domcontentloaded')
   await expect(mobile.get_by_role('button',name='Cari di area ini',exact=True)).to_be_visible(timeout=45000)
   await mobile.add_style_tag(content='nextjs-portal{display:none!important}')
   await mobile.get_by_role('button',name=re.compile('^Lapisan')).click()
   await mobile.get_by_label('Kualitas peta').select_option('low')
   await mobile.get_by_role('button',name='Tutup panel',exact=True).click()
   await mobile.get_by_role('button',name='Zoom in',exact=True).click()
   await mobile.wait_for_timeout(1000)
   assert not await mobile.evaluate('document.documentElement.scrollWidth>innerWidth')
   await mobile.screenshot(path=str(OUT/f'final-mobile-{width}.png'))
   await mobile.close()
  report['checks'].append('Touch controls work at 320/390 px with 20x CPU slowdown and reduced motion')
  assert not report['errors'],report['errors']
  (OUT/'adaptive-browser-report.json').write_text(json.dumps(report,indent=2))
  print(json.dumps(report))
  await browser.close()
asyncio.run(main())
