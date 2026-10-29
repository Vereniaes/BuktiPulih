# Verify date/time drafts, historical WIB queries and responsive map controls.
import asyncio,json,re
from datetime import datetime,timedelta,timezone
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.async_api import async_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'knowledge/hotspot-date-time-2026-10-28';URL='http://localhost:3001/?tab=fire'
NOW=datetime(2026,10,28,12,30,tzinfo=timezone.utc)
def wib(value):return (value+timedelta(hours=7)).strftime('%Y-%m-%dT%H:%M')
def point(id,time,satellite='VIIRS_NOAA20_NRT',confidence='high',frp=20):return {'id':id,'coordinates':[-2,114+len(id)/10],'observed_at':time.isoformat(),'satellite':satellite,'confidence':confidence,'frp_mw':frp}
POINTS=[point('one',NOW-timedelta(hours=1)),point('two',NOW-timedelta(hours=8),'VIIRS_NOAA21_NRT','nominal',5),point('three',NOW-timedelta(hours=48),confidence='low',frp=None),point('start',NOW-timedelta(hours=50),frp=50),point('end',NOW.replace(minute=0)-timedelta(hours=36)+timedelta(minutes=59,seconds=59),'VIIRS_NOAA21_NRT','nominal',10),point('outside',NOW.replace(minute=0)-timedelta(hours=36)+timedelta(hours=1))]
OLD=datetime(2025,8,1,tzinfo=timezone.utc)
ARCHIVE=[point('archive20',OLD+timedelta(hours=10),'VIIRS_NOAA20_SP'),point('archive21',OLD+timedelta(hours=12),'VIIRS_NOAA21_SP','nominal',15)]
CATALOG={'sources':[{'name':'VIIRS_NOAA20_NRT','min_date':'2026-08-01','max_date':'2026-10-28'},{'name':'VIIRS_NOAA20_SP','min_date':'2018-04-01','max_date':'2026-07-31'},{'name':'VIIRS_NOAA21_NRT','min_date':'2024-01-17','max_date':'2026-10-28'},{'name':'VIIRS_NOAA21_SP','min_date':'2023-03-01','max_date':'2026-07-31'}],'fetched_at':NOW.isoformat(),'status':'complete'}
def result(points):return {'data':{'observations':points,'bounds':[94,-12,142,8],'fetched_at':NOW.isoformat(),'observed_at':points[0]['observed_at'] if points else None,'status':'complete','sources':[{'name':'VIIRS_NOAA20_NRT','available':True},{'name':'VIIRS_NOAA21_NRT','available':True}]}}
async def fixture(browser,width=1440,height=1000,en=False,zone='America/Los_Angeles'):
 context=await browser.new_context(viewport={'width':width,'height':height},timezone_id=zone,locale='en-US')
 if en:await context.add_init_script("localStorage.setItem('buktipulih_language','en')")
 calls=[];errors=[];mode={'value':'ready'}
 async def fire(route):
  params=parse_qs(urlparse(route.request.url).query);calls.append(params)
  if mode['value']=='error':await route.fulfill(status=503,json={'error':{'message':'Data titik panas belum tersedia.'}});return
  points=ARCHIVE if params.get('start',[''])[0].startswith('2025') else POINTS
  if 'start' in params:
   a=datetime.fromisoformat(params['start'][0].replace('Z','+00:00'));b=datetime.fromisoformat(params['end'][0].replace('Z','+00:00'))
   points=[p for p in points if a<=datetime.fromisoformat(p['observed_at'])<=b]
  await route.fulfill(json=result([] if mode['value']=='empty' else points))
 await context.route('**/api/v1/external/hotspots?**',fire)
 await context.route('**/api/v1/external/hotspots/availability',lambda r:r.fulfill(json={'data':CATALOG}))
 page=await context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(15000)
 await page.clock.install(time=NOW);await page.goto(URL,wait_until='domcontentloaded')
 if en:
  if width<=1100:await page.get_by_role('button',name='Buka navigasi',exact=True).click()
  await page.get_by_role('button',name='Pilih bahasa',exact=True).click()
  if width<=1100:await page.get_by_role('button',name=re.compile('Tutup navigasi|Close navigation')).click()
 await page.get_by_role('button',name=re.compile('^Layers' if en else '^Lapisan')).first.wait_for()
 if not await page.get_by_role('complementary').count():await page.get_by_role('button',name=re.compile('^Layers' if en else '^Lapisan')).first.click()
 await expect(page.get_by_label('Start hour (WIB)' if en else 'Jam mulai (WIB)',exact=True)).to_be_visible()
 await expect(page.get_by_role('button',name='Hotspots 2' if en else 'Titik panas 2',exact=True)).to_be_visible()

 return context,page,calls,errors,mode
async def fill(page,start,end,en=False):
 await page.get_by_role('button',name='Choose date range' if en else 'Pilih rentang tanggal',exact=True).click()
 dialog=page.get_by_role('dialog',name='Choose dates' if en else 'Pilih tanggal',exact=True)
 await dialog.get_by_label('Year' if en else 'Tahun',exact=True).select_option(start[:4])
 await dialog.get_by_label('Month' if en else 'Bulan',exact=True).select_option(start[5:7])
 await dialog.locator(f'button[data-date="{start[:10]}"]').click()
 if not await dialog.locator(f'button[data-date="{end[:10]}"]').count():
  await dialog.get_by_role('button',name='Next month' if en else 'Bulan berikutnya',exact=True).click()
 await dialog.locator(f'button[data-date="{end[:10]}"]').click()
 await dialog.get_by_role('button',name='Use dates' if en else 'Gunakan tanggal',exact=True).click()
 await page.get_by_label('Start hour (WIB)' if en else 'Jam mulai (WIB)',exact=True).select_option(start[11:13])
 await page.get_by_label('End hour (WIB)' if en else 'Jam selesai (WIB)',exact=True).select_option(end[11:13])
async def apply(page,en=False):await page.get_by_role('button',name='Apply' if en else 'Terapkan',exact=True).click()
async def count(page,n,en=False):await expect(page.get_by_role('button',name=f'Hotspots {n}' if en else f'Titik panas {n}',exact=True)).to_be_visible()
async def main():
 results={};all_errors=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch();context,page,calls,errors,mode=await fixture(browser)
  assert await page.get_by_label('Jam mulai (WIB)',exact=True).input_value()==wib(NOW-timedelta(hours=24))[11:13]
  assert await page.get_by_label('Jam selesai (WIB)',exact=True).input_value()==wib(NOW)[11:13]
  assert all(params.get('hours')==['72'] for params in calls),calls
  assert await page.get_by_role('button',name=re.compile('^(6|12|24|72) jam$')).count()==0
  before=len(calls);await fill(page,wib(NOW-timedelta(hours=50)),wib(NOW-timedelta(hours=36)));await count(page,2);assert len(calls)==before
  await apply(page);await count(page,3)
  assert 'start' in calls[-1] and 'hours' not in calls[-1]
  assert calls[-1]['start']==[(NOW-timedelta(hours=50)).replace(minute=0).isoformat(timespec='milliseconds').replace('+00:00','Z')]
  await page.screenshot(path=str(OUT/'range-desktop-1440.png'))
  results['draft_apply_precise_UTC_query_and_WIB_in_US_browser']=True
  await page.get_by_role('button',name='Pilih rentang tanggal',exact=True).click()
  dialog=page.get_by_role('dialog',name='Pilih tanggal',exact=True)
  await dialog.get_by_label('Tahun',exact=True).select_option('2025');await dialog.get_by_label('Bulan',exact=True).select_option('08')
  await dialog.locator('button[data-date="2025-08-01"]').click()
  await expect(dialog.locator('button[data-date="2025-08-05"]')).to_be_enabled()
  await expect(dialog.locator('button[data-date="2025-08-06"]')).to_be_disabled()
  await expect(dialog.locator('button[data-date="2025-07-31"]')).to_be_disabled()
  await dialog.get_by_role('button',name='Tutup kalender',exact=True).click();await count(page,3)
  results['out_of_range_dates_disabled_before_apply']=True
  await fill(page,wib(NOW-timedelta(hours=50)),wib(NOW-timedelta(hours=36)));await apply(page);await count(page,3)
  await page.get_by_text('Filter deteksi',exact=True).click()
  for label,value,expected in [('Satelit','VIIRS_NOAA21_NRT',1),('Satelit','all',3),('Keyakinan deteksi','high',1),('Keyakinan deteksi','all',3),('Daya radiasi minimum','10',2),('Daya radiasi minimum','0',3)]:
   await page.get_by_label(label,exact=True).select_option(value);await count(page,expected)
  results['other_detection_filters_intersect_applied_dates']=True
  await fill(page,wib(OLD),wib(OLD+timedelta(days=1)));await apply(page);await count(page,2)
  await page.get_by_label('Satelit',exact=True).select_option('VIIRS_NOAA21_NRT');await count(page,1)
  await page.get_by_label('Satelit',exact=True).select_option('all');await count(page,2)
  await page.screenshot(path=str(OUT/'historical-SP-desktop.png'))
  await page.get_by_role('button',name='Tutup panel',exact=True).click();await page.get_by_role('button',name=re.compile('^Lapisan')).first.click()
  assert await page.get_by_label('Jam mulai (WIB)',exact=True).input_value()==wib(OLD)[11:13]
  await page.get_by_role('button',name='Terapkan',exact=True).focus();await page.keyboard.press('Enter');await count(page,2)
  await page.get_by_role('button',name='Titik panas 2',exact=True).click();await page.get_by_role('button',name=re.compile('NOAA-21.*15 MW')).click()
  await expect(page.get_by_role('heading',name='Titik panas terdeteksi',exact=True)).to_be_focused()
  await page.get_by_role('button',name='Kembali ke lapisan',exact=True).click();await page.get_by_role('button',name='Lapisan',exact=True).click()
  results['historical_SP_filter_panel_navigation_and_keyboard_apply']=True
  await fill(page,wib(NOW-timedelta(hours=40)),wib(NOW-timedelta(hours=38)));await apply(page);await count(page,0)
  await page.get_by_role('button',name='Titik panas 0',exact=True).click();await expect(page.get_by_text('Tidak ada deteksi yang cocok. Ubah filter atau cari di area lain.',exact=True)).to_be_visible()
  await page.get_by_role('button',name='Lapisan',exact=True).click();await fill(page,wib(OLD),wib(OLD+timedelta(days=1)));await apply(page);await count(page,2)
  mode['value']='error';await page.get_by_role('button',name='Muat ulang sumber',exact=True).click();await expect(page.get_by_text('Titik panas belum tersedia. Coba muat ulang sumber.',exact=True)).to_be_visible();await count(page,2)
  mode['value']='ready';await page.get_by_role('button',name='Muat ulang sumber',exact=True).click();await expect(page.get_by_text('Titik panas belum tersedia. Coba muat ulang sumber.',exact=True)).to_have_count(0);await count(page,2)
  before=len(calls);values=await page.locator('#hotspot-time-range select').evaluate_all('nodes=>nodes.map(n=>n.value)');transform=await page.locator('.leaflet-map-pane').get_attribute('style')
  await page.clock.fast_forward(300001);await page.wait_for_timeout(200)
  assert len(calls)>before and values==await page.locator('#hotspot-time-range select').evaluate_all('nodes=>nodes.map(n=>n.value)')
  assert transform==await page.locator('.leaflet-map-pane').get_attribute('style')
  results['empty_error_retry_and_polling_preserve_range_and_viewport']=True
  all_errors+=errors;await context.close()
  for width,height in [(390,844),(320,568),(768,1024),(844,390)]:
   context,page,calls,errors,mode=await fixture(browser,width,height)
   await expect(page.get_by_role('button',name='Kirim bukti',exact=True)).not_to_be_visible()
   await fill(page,wib(OLD),wib(OLD+timedelta(days=1)));await apply(page);await count(page,2)
   layout=await page.locator('#hotspot-time-range').evaluate("el=>({pageOverflow:document.documentElement.scrollWidth>innerWidth,formOverflow:el.scrollWidth>el.clientWidth,inputs:[...el.querySelectorAll('select,button')].map(n=>({height:n.getBoundingClientRect().height,overflow:n.scrollWidth>n.clientWidth}))})")
   assert not layout['pageOverflow'] and not layout['formOverflow'] and all(n['height']>=44 and not n['overflow'] for n in layout['inputs']),layout
   await page.get_by_role('button',name='Pilih rentang tanggal',exact=True).scroll_into_view_if_needed();await page.screenshot(path=str(OUT/f'range-mobile-{width}.png'))
   await page.get_by_role('button',name='Tutup panel',exact=True).click();await expect(page.get_by_role('button',name='Kirim bukti',exact=True)).to_be_visible()
   all_errors+=errors;await context.close()
  results['phone_tablet_landscape_apply_and_report_action_clearance']=True
  context,page,calls,errors,mode=await fixture(browser,390,844,True,'Pacific/Auckland')
  await fill(page,wib(OLD),wib(OLD+timedelta(days=1)),True);await apply(page,True);await count(page,2,True)
  assert await page.get_by_label('Start hour (WIB)',exact=True).input_value()==wib(OLD)[11:13]
  await page.screenshot(path=str(OUT/'range-en-390.png'));results['English_and_different_device_timezone_keep_WIB']=True
  all_errors+=errors;await context.close()
  context,page,calls,errors,mode=await fixture(browser)
  await fill(page,wib(OLD),wib(OLD+timedelta(days=1)));await apply(page);await count(page,2)
  started=asyncio.Event();release=asyncio.Event()
  async def delayed(route):
   params=parse_qs(urlparse(route.request.url).query)
   if params.get('start',[''])[0].startswith('2026-10-26'):
    started.set();await release.wait()
    try:await route.fulfill(json=result(POINTS))
    except Exception:pass
   else:await route.fallback()
  await page.route('**/api/v1/external/hotspots?**',delayed)
  await fill(page,wib(NOW-timedelta(hours=50)),wib(NOW-timedelta(hours=36)));await apply(page);await asyncio.wait_for(started.wait(),5)
  assert await page.get_by_role('button',name='Titik panas 2',exact=True).count()==0
  await fill(page,wib(OLD),wib(OLD+timedelta(days=1)));await apply(page);await count(page,2)
  release.set();await page.wait_for_timeout(200);await count(page,2)
  results['slow_previous_range_cannot_replace_new_dates']=True
  await page.unroute('**/api/v1/external/hotspots?**',delayed)
  async def unavailable(route):await route.fulfill(status=422,json={'error':{'code':'HOTSPOT_DATE_UNAVAILABLE','message':'Data NASA belum tersedia untuk tanggal tersebut.'}})
  await page.route('**/api/v1/external/hotspots?**',unavailable)
  await fill(page,wib(NOW-timedelta(hours=30)),wib(NOW-timedelta(hours=25)));await apply(page)
  await expect(page.get_by_text('Data NASA belum tersedia untuk tanggal tersebut.',exact=True)).to_be_visible()
  assert await page.get_by_role('button',name='Titik panas 2',exact=True).count()==0
  results['new_failed_range_does_not_display_old_observations']=True
  all_errors+=errors;await context.close();await browser.close()
 assert not all_errors,all_errors;results['page_errors']=all_errors
 (OUT/'browser-results.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
if __name__=='__main__':asyncio.run(main())
