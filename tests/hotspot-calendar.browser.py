# Verify bounded selection, hour queries and keyboard/mobile use.
import asyncio,importlib.util,json
from pathlib import Path
from playwright.async_api import expect
spec=importlib.util.spec_from_file_location('base',Path(__file__).with_name('hotspot-time.browser.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
OUT=m.ROOT/'knowledge/hotspot-range-calendar-2026-10-29'
async def open_calendar(page):
 await page.get_by_role('button',name='Pilih rentang tanggal',exact=True).click()
 return page.get_by_role('dialog',name='Pilih tanggal',exact=True)
async def main():
 results={};errors=[]
 async with m.async_playwright() as p:
  browser=await p.chromium.launch();context,page,calls,page_errors,mode=await m.fixture(browser)
  dialog=await open_calendar(page)
  await dialog.get_by_label('Tahun',exact=True).select_option('2025');await dialog.get_by_label('Bulan',exact=True).select_option('07')
  await dialog.locator('button[data-date="2025-07-29"]').click()
  await expect(dialog.locator('button[data-date="2025-08-02"]')).to_be_enabled();await expect(dialog.locator('button[data-date="2025-08-03"]')).to_be_disabled()
  await expect(dialog.locator('button[data-date="2025-07-28"]')).to_be_disabled()
  await dialog.locator('button[data-date="2025-08-03"]').evaluate('el=>el.click()')
  await expect(dialog.get_by_role('button',name='Gunakan tanggal',exact=True)).to_be_disabled()
  await dialog.locator('button[data-date="2025-08-02"]').click()
  assert await dialog.get_by_role('gridcell',selected=True).count()==5
  await expect(dialog.locator('button[data-date="2025-08-03"]')).to_be_disabled()
  await page.screenshot(path=str(OUT/'five-days-desktop.png'))
  await dialog.get_by_role('button',name='Gunakan tanggal',exact=True).click()
  await expect(page.get_by_role('button',name='Pilih rentang tanggal',exact=True)).to_be_focused()
  results['five_connected_dates_sixth_disabled_before_and_after_selection']=True
  hours=page.get_by_label('Jam mulai (WIB)',exact=True)
  assert await hours.locator('option').all_text_contents()==[f'{i:02}' for i in range(24)]
  assert await page.locator('input[type="time"],input[type="datetime-local"]').count()==0
  await hours.select_option('00');await page.get_by_label('Jam selesai (WIB)',exact=True).select_option('23');await m.apply(page)
  assert calls[-1]['start']==['2025-07-28T17:00:00.000Z'];assert calls[-1]['end']==['2025-08-02T16:59:59.999Z']
  results['whole_hour_options_and_five_dates_query_includes_final_hour']=True
  dialog=await open_calendar(page)
  await dialog.get_by_label('Tahun',exact=True).select_option('2024');await dialog.get_by_label('Bulan',exact=True).select_option('12')
  await dialog.locator('button[data-date="2024-12-29"]').click()
  if not await dialog.locator('button[data-date="2025-01-02"]').count():await dialog.get_by_role('button',name='Bulan berikutnya',exact=True).click()
  await expect(dialog.locator('button[data-date="2025-01-03"]')).to_be_disabled()
  await dialog.locator('button[data-date="2025-01-02"]').click();assert await dialog.get_by_role('gridcell',selected=True).count()==5
  await dialog.get_by_role('button',name='Ubah tanggal mulai',exact=True).click()
  await dialog.get_by_label('Tahun',exact=True).select_option('2025');await dialog.get_by_label('Bulan',exact=True).select_option('08')
  day=dialog.locator('button[data-date="2025-08-01"]');await day.focus();await page.keyboard.press('Enter');await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter')
  assert await dialog.get_by_role('gridcell',selected=True).count()==2
  await page.keyboard.press('Escape');await expect(dialog).not_to_be_visible();await expect(page.get_by_role('button',name='Pilih rentang tanggal',exact=True)).to_be_focused()
  results['year_boundary_keyboard_arrows_enter_escape_and_cancel']=True
  errors+=page_errors;await context.close()
  for width,height in [(390,844),(320,568),(844,390)]:
   context,page,calls,page_errors,mode=await m.fixture(browser,width,height)
   dialog=await open_calendar(page);await dialog.get_by_label('Tahun',exact=True).select_option('2025');await dialog.get_by_label('Bulan',exact=True).select_option('08')
   await dialog.locator('button[data-date="2025-08-01"]').click();await dialog.locator('button[data-date="2025-08-05"]').click()
   await page.screenshot(path=str(OUT/f'five-days-{width}.png'))
   dimensions=await dialog.evaluate("el=>({overflow:el.scrollWidth>el.clientWidth,pageOverflow:document.documentElement.scrollWidth>innerWidth,cells:[...el.querySelectorAll('button[data-date]')].map(b=>({w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height})),rect:el.getBoundingClientRect().toJSON()})")
   assert not dimensions['overflow'] and not dimensions['pageOverflow'],dimensions
   assert all(c['w']>=43.5 and c['h']>=44 for c in dimensions['cells']),dimensions
   assert dimensions['rect']['x']>=0 and dimensions['rect']['right']<=width+1 and dimensions['rect']['y']>=0 and dimensions['rect']['bottom']<=height+1
   await dialog.get_by_role('button',name='Gunakan tanggal',exact=True).click()
   await page.get_by_role('button',name='Terapkan',exact=True).scroll_into_view_if_needed();await page.screenshot(path=str(OUT/f'form-{width}.png'))
   errors+=page_errors;await context.close()
  results['phone_and_landscape_no_overflow_calendar_targets_44px']=True
  assert not errors,errors;results['page_errors']=errors;await browser.close()
 (OUT/'calendar-browser-results.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
if __name__=='__main__':asyncio.run(main())
