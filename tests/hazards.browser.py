"""Inspect real satellite imagery, then exercise source edge cases with isolated fixtures."""
import asyncio, json, re
from datetime import datetime, timezone, timedelta
from pathlib import Path
from playwright.async_api import async_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"knowledge/map-performance-2026-10-27"
URL="http://localhost:3001/?tab=fire"
async def main():
 report={"layouts":[],"checks":[],"errors":[]}
 async with async_playwright() as p:
  browser=await p.chromium.launch()
  context=await browser.new_context(viewport={"width":1440,"height":900},timezone_id="Asia/Jakarta")
  page=await context.new_page()
  await page.clock.install()
  page.on("pageerror",lambda e:report["errors"].append({"message":str(e),"stack":e.stack,"url":page.url}))
  page.on("console",lambda m:report["errors"].append(m.text) if m.type=="error" and "hydration" in m.text.lower() else None)
  async def ready():
   await expect(page.get_by_role("button",name="Cari di area ini",exact=True)).to_be_visible(timeout=30000)
   await page.add_style_tag(content="nextjs-portal{display:none!important}")
  async def panel():
   if not await page.get_by_role("complementary",name="Lapisan dan filter").count():
    await page.get_by_role("button",name=re.compile("^Lapisan"),exact=False).click()
  async def shot(name):await page.screenshot(path=str(OUT/name))
  for motion in ["no-preference","reduce"]:
   await page.emulate_media(reduced_motion=motion)
   for width,height in [(1440,900),(1024,768),(768,1024),(390,844),(320,568),(844,390)]:
    await page.set_viewport_size({"width":width,"height":height});await page.goto(URL,wait_until="domcontentloaded");await ready();await page.wait_for_timeout(350)
    for state in ["initial","panel"]:
     if state=="panel":await panel()
     layout=await page.evaluate("""() => {
      const shell=document.querySelector('section[aria-label="Peta pemantauan satelit"]');
      const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom,right:r.right}};
      const aside=shell.querySelector('aside');
      return {overflow:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight+1,shell:rect(shell),map:rect(shell.querySelector('.leaflet-container')),panel:aside?rect(aside):null,
       controls:[...shell.querySelectorAll('button')].filter(e=>e.checkVisibility()).every(e=>e.getBoundingClientRect().height>=43.5)};
     }""")
     assert not layout["overflow"] and layout["controls"],layout
     assert abs(layout["shell"]["bottom"]-height)<1,layout
     if width<=860 and layout["panel"]:assert abs(layout["map"]["bottom"]-layout["panel"]["y"])<1,layout
     report["layouts"].append({"width":width,"height":height,"motion":motion,"state":state,**layout})
    if width in [1440,390] and motion=="no-preference":
     await page.wait_for_timeout(5000);await shot(f"live-{width}-panel.png")
     await page.get_by_role("button",name="Tutup panel",exact=True).click();await shot(f"live-{width}-map.png")
  await page.set_viewport_size({"width":1440,"height":900});await page.goto(URL,wait_until="domcontentloaded");await ready()
  await expect(page.get_by_role("button",name="Muat ulang sumber")).to_be_enabled(timeout=35000)
  assert await page.locator('canvas.leaflet-tile').count()==0
  await page.get_by_role("checkbox",name="Citra satelit",exact=True).check()
  await page.wait_for_function("[...document.querySelectorAll('canvas.leaflet-tile')].some(c=>Number(c.dataset.coverage)>0)",timeout=35000)
  await page.get_by_role("checkbox",name="Angin",exact=True).check()
  await expect(page.locator('.leaflet-wind-pane .leaflet-marker-icon').first).to_be_attached(timeout=25000)
  report["checks"].append("Live NASA tiles and real ECMWF wind loaded")
  await expect(page.get_by_text(re.compile("^Citra ·"))).to_be_visible(timeout=30000)
  await shot("live-desktop-wind.png")
  now=datetime.now(timezone.utc)
  def point(id,hours,lon,confidence,satellite,frp):return {"id":id,"coordinates":[-2,lon],"observed_at":(now-timedelta(hours=hours)).isoformat(),"confidence":confidence,"satellite":satellite,"frp_mw":frp}
  points=[point("one",1,114,"high","VIIRS_NOAA20_NRT",20),point("two",8,116,"nominal","VIIRS_NOAA21_NRT",5),point("three",48,118,"low","VIIRS_NOAA20_NRT",None)]
  data={"observations":points,"bounds":[94,-12,142,8],"fetched_at":now.isoformat(),"observed_at":points[0]["observed_at"],"status":"complete","sources":[{"name":"VIIRS_NOAA20_NRT","available":True},{"name":"VIIRS_NOAA21_NRT","available":True}]}
  mode="ready";calls=[]
  async def fire_route(route):
   calls.append(route.request.url)
   if mode=="error":return await route.fulfill(status=503,json={"error":"FIRMS_NOT_CONFIGURED"})
   if mode=="empty":return await route.fulfill(json={"data":{**data,"observations":[],"observed_at":None}})
   return await route.fulfill(json={"data":data})
  await page.route("**/api/v1/external/hotspots?**",fire_route)
  await page.goto(URL,wait_until="domcontentloaded");await ready()
  await expect(page.get_by_role("button",name="Titik panas 2",exact=True)).to_be_visible()
  import importlib.util
  spec=importlib.util.spec_from_file_location("hotspot_time",ROOT/"tests/hotspot-time.browser.py");calendar_ui=importlib.util.module_from_spec(spec);spec.loader.exec_module(calendar_ui)
  def wib(value):return (value+timedelta(hours=7)).strftime("%Y-%m-%dT%H:%M")
  await calendar_ui.fill(page,wib(now-timedelta(hours=6)),wib(now))
  await page.get_by_role("button",name="Terapkan",exact=True).click();await expect(page.get_by_role("button",name="Titik panas 1",exact=True)).to_be_visible()
  await calendar_ui.fill(page,wib(now-timedelta(hours=71)),wib(now))
  await page.get_by_role("button",name="Terapkan",exact=True).click();await expect(page.get_by_role("button",name="Titik panas 3",exact=True)).to_be_visible()
  await page.get_by_text("Filter deteksi",exact=True).click()
  await page.get_by_label("Satelit",exact=True).select_option("VIIRS_NOAA21_NRT");await expect(page.get_by_role("button",name="Titik panas 1",exact=True)).to_be_visible()
  await page.get_by_label("Satelit",exact=True).select_option("all")
  await page.get_by_label("Keyakinan deteksi",exact=True).select_option("high");await expect(page.get_by_role("button",name="Titik panas 1",exact=True)).to_be_visible()
  await page.get_by_label("Keyakinan deteksi",exact=True).select_option("all")
  await page.get_by_label("Daya radiasi minimum",exact=True).select_option("10");await expect(page.get_by_role("button",name="Titik panas 1",exact=True)).to_be_visible()
  await page.get_by_label("Daya radiasi minimum",exact=True).select_option("0")
  report["checks"].append("Time, satellite, confidence and FRP filters combine")
  await page.get_by_role("checkbox",name="Citra satelit",exact=True).check()
  await page.get_by_text("Satelit, tanggal & opasitas",exact=True).click()
  dates=await page.get_by_label("Tanggal citra · UTC").locator("option").all_text_contents()
  await page.get_by_label("Tanggal citra · UTC").select_option(dates[1]);await page.wait_for_function("[...document.querySelectorAll('canvas.leaflet-tile')].some(c=>c.dataset.coverage!==undefined)",timeout=35000)
  await page.get_by_label("Opasitas",exact=True).fill("40")
  await page.wait_for_function("[...document.querySelectorAll('.leaflet-satellite-pane .leaflet-layer')].some(e=>e.style.opacity==='0.4')")
  await page.get_by_role("checkbox",name="Citra satelit",exact=True).uncheck();await expect(page.locator('canvas.leaflet-tile')).to_have_count(0)
  await page.get_by_role("checkbox",name="Citra satelit",exact=True).check()
  report["checks"].append("Imagery date, opacity and independent visibility")
  await page.get_by_role("button",name="Cari di area ini",exact=True).click()
  await page.get_by_role("button",name=re.compile("NOAA-20.*20 MW")).click()
  await expect(page.get_by_role("heading",name="Titik panas terdeteksi")).to_be_focused()
  await expect(page.get_by_text("VIIRS · NOAA-20",exact=True)).to_be_visible()
  await page.get_by_role("button",name="Kembali ke lapisan").click()
  await page.get_by_role("button",name="Titik panas 3",exact=True).click()
  await page.get_by_role("button",name=re.compile("NOAA-21.*5 MW")).click()
  await expect(page.get_by_text("VIIRS · NOAA-21",exact=True)).to_be_visible()
  report["checks"].append("Area results and consecutive selections focus location details")
  await page.get_by_role("button",name="Tutup panel",exact=True).click();await expect(page.get_by_role("button",name=re.compile("^Lapisan"))).to_be_focused()
  await page.keyboard.press("Enter");await page.keyboard.press("Escape");await expect(page.get_by_role("complementary",name="Lapisan dan filter")).to_have_count(0)
  await page.get_by_role("button",name="Layar penuh",exact=True).click();await page.wait_for_function("Boolean(document.fullscreenElement)");await page.get_by_role("button",name="Keluar layar penuh",exact=True).click()
  report["checks"].append("Keyboard dismissal/focus return and fullscreen")
  for state in ["empty","error"]:
   mode=state;await page.goto(URL,wait_until="domcontentloaded");await ready();await expect(page.get_by_role("button",name="Muat ulang sumber")).to_be_enabled(timeout=35000)
   await page.get_by_role("button",name="Cari di area ini",exact=True).click()
   await expect(page.get_by_text("Tidak ada deteksi yang cocok. Ubah filter atau cari di area lain." if state=="empty" else "Sumber titik panas belum tersedia.",exact=True)).to_be_visible()
  report["checks"].append("Unavailable source is distinct from a successful empty result")
  mode="ready";await page.get_by_role("button",name="Muat ulang sumber",exact=True).click();await expect(page.get_by_role("button",name=re.compile("NOAA-20.*20 MW"))).to_be_visible()
  report["checks"].append("Retry recovers after source failure")
  await page.get_by_role("button",name="Tutup panel",exact=True).click()
  await page.get_by_role("button",name="Zoom in",exact=True).click();await page.wait_for_timeout(500)
  transform=await page.locator(".leaflet-map-pane").get_attribute("style")
  count=len(calls);await page.clock.fast_forward(300001)
  await page.wait_for_timeout(1000)
  assert len(calls)>count
  assert transform==await page.locator(".leaflet-map-pane").get_attribute("style")
  report["checks"].append("Five-minute refresh preserves the current map viewport")
  await panel();await page.get_by_role("button",name=re.compile("^Lapisan$"),exact=True).click()
  await page.get_by_role("checkbox",name="Angin",exact=True).check()
  await expect(page.locator('.leaflet-wind-pane .leaflet-marker-icon').first).to_be_attached(timeout=25000)
  markers=page.locator('.leaflet-wind-pane .leaflet-marker-icon')
  chosen=[]
  for index in range(await markers.count()):
   box=await markers.nth(index).bounding_box()
   if box and 350<box["x"]<1300 and 250<box["y"]<750:chosen.append(index)
  for index in chosen[:2]:
   await markers.nth(index).click();await expect(page.get_by_role("heading",name="Angin permukaan",exact=True)).to_be_focused()
  assert len(chosen)>=2
  report["checks"].append("Consecutive wind-marker clicks remain usable above the selection halo")
  await page.goto("http://localhost:3001/",wait_until="domcontentloaded");await expect(page.get_by_text("Melihat hutan pulih,",exact=False).first).to_be_visible(timeout=15000)
  report["checks"].append("Homepage remains available")
  (OUT/"satellite-browser-report.json").write_text(json.dumps(report,indent=2))
  assert not report["errors"],report["errors"]
  print(json.dumps({"layouts":len(report["layouts"]),"checks":report["checks"],"errors":report["errors"]}))
  await browser.close()
asyncio.run(main())
