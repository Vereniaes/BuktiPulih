# Check the location form with temporary accounts; uploads stay inside browser fixtures.
import asyncio, json, os, re, shutil, socket
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
from playwright.async_api import async_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
BACKEND=ROOT.parent/'bukti-pulih-be'
OUT=ROOT/'knowledge/evidence-location-explorer-2026-10-29'
BASE='http://localhost:3001'
NODE='/home/vereniaes/.nvm/versions/node/v24.22.0/bin'
PREVIEW=Path('/mnt/c/Users/ITA/.codex/visualizations/2026/10/28/01a18173-f235-7e91-a822-95a6929cbe60')
MATCH={'id':'test-surabaya','name':'Jalan Tunjungan','label':'Jalan Tunjungan, Surabaya, Jawa Timur','province':'Jawa Timur','city':'Surabaya','coordinates':[112.7387,-7.2596]}

async def main():
    with socket.socket() as probe:
        assert probe.connect_ex(('127.0.0.1',5002))!=0, 'Fixture port is already in use'
    env=os.environ.copy(); env['PATH']=NODE+':'+env['PATH']
    fixture=await asyncio.create_subprocess_exec(NODE+'/node','--import','tsx','tests/email-auth.browser-server.ts','--account-deletion','--recovery',cwd=BACKEND,env=env,stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.PIPE)
    folder=None; checks=[]; errors=[]; creates=[]; uploads=[]; live_search=[]
    try:
        startup=json.loads((await asyncio.wait_for(fixture.stdout.readline(),25)).decode())
        folder=Path(startup['folder']); assert folder.parent==Path('/tmp') and folder.name.startswith('buktipulih_auth_browser_test_')
        accounts=json.loads((folder/'account-fixtures.json').read_text())
        async with async_playwright() as p:
            browser=await p.chromium.launch()
            for width,height in [(1440,1000),(390,844),(320,740),(800,450)]:
                account=next(a for a in accounts if a['width']==width)
                context=await browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1)
                await context.add_cookies([{'name':'bp_session','value':account['token'],'domain':'localhost','path':'/','httpOnly':True,'sameSite':'Lax'}])
                state={'mode':'live' if width==1440 else 'fixture','delay':False,'failure':False,'empty':False,'slow_query':asyncio.Event(),'points':[],'multi':False}
                async def api(route):
                    req=route.request; url=urlsplit(req.url)
                    if '/locations/' in url.path and state['mode']=='fixture':
                        if '/reverse' in url.path: state['points'].append(parse_qs(url.query))
                        if parse_qs(url.query).get('q')==['Permintaan lama']:
                            state['slow_query'].set(); await asyncio.sleep(1.4)
                            return await route.fulfill(json={'data':{'items':[{**MATCH,'name':'Hasil lama','city':'Kota lama'}]}})
                        if state['delay']: await asyncio.sleep(.7)
                        if state['failure']: return await route.fulfill(status=503,json={'error':{'code':'LOCATION_UNAVAILABLE','message':'Lokasi belum dapat dimuat.'}})
                        items=[{**MATCH,'id':f'test-{i}','name':f'Jalan uji {i}','label':f'Jalan uji {i}, Surabaya, Jawa Timur'} for i in range(6)] if state['multi'] else [MATCH]
                        return await route.fulfill(json={'data':{'items':[] if state['empty'] else items}})
                    if req.method=='POST' and url.path.endswith('/forum/posts'): creates.append(req.post_data_json)
                    response=await route.fetch(url='http://127.0.0.1:5002'+url.path+('?' + url.query if url.query else ''))
                    if url.path.endswith('/auth/me') and req.method=='GET': assert (await response.json())['data']['user']['id']==account['id']
                    if '/locations/search' in url.path: live_search.append({'status':response.status,'items':(await response.json()).get('data',{}).get('items',[])})
                    await route.fulfill(response=response)
                await context.route(re.compile(r'/api/v1/(auth|forum|locations)/'),api)
                image=(ROOT/'public/hero-peat-seedling.jpg').read_bytes()
                await context.route('https://evidence-fixture.public.blob.vercel-storage.com/**',lambda route:route.fulfill(body=image,content_type='image/jpeg'))
                async def upload(route):
                    uploads.append({'session_context':bool(route.request.headers.get('x-session-context'))})
                    await route.fulfill(json={'url':'https://evidence-fixture.public.blob.vercel-storage.com/bukti-lapangan/explorer.webp'})
                await context.route('**/api/upload',upload)
                page=await context.new_page();page.set_default_timeout(20000)
                page.on('pageerror',lambda e:errors.append(str(e)))
                page.on('console',lambda m:errors.append(m.text) if m.type=='error' and 'same key' in m.text else None)
                await page.goto(BASE+'/?tab=forum&compose=1',wait_until='domcontentloaded')
                dialog=page.get_by_role('dialog',name='Kirim bukti',exact=True)
                await expect(dialog).to_be_visible()
                search=dialog.get_by_role('combobox',name='Cari lokasi',exact=True)
                await expect(search).to_be_visible()
                assert await dialog.get_by_text('Masukkan koordinat',exact=True).count()==0
                assert await dialog.get_by_label('Lintang',exact=True).count()==0
                assert not await dialog.get_by_role('button',name='Lanjutkan',exact=True).is_enabled()
                await search.fill('Jalan Gajah Mada Pontianak' if width==1440 else 'Jalan Tunjungan')
                option=dialog.get_by_role('option').first
                await expect(option).to_be_visible(timeout=25000)
                if width in [1440,390]: await page.screenshot(path=str(OUT/f'location-search-{width}.png'))
                await search.press('Enter')
                await expect(dialog.get_by_label('Wilayah',exact=True)).not_to_have_value('')
                await expect(dialog.get_by_label('Daerah/Kota',exact=True)).not_to_have_value('')
                assert await dialog.get_by_label('Nama lokasi',exact=True).input_value()
                if width==1440:
                    assert live_search[-1]['status']==200 and live_search[-1]['items']
                    assert await dialog.get_by_label('Wilayah',exact=True).input_value()=='Kalimantan Barat'
                await dialog.get_by_label('Detail tempat',exact=True).fill('Samping tambal ban')
                await page.add_style_tag(content='nextjs-portal{display:none!important}')
                await search.scroll_into_view_if_needed(); await page.wait_for_timeout(400)
                await page.screenshot(path=str(OUT/f'location-fields-{width}.png'))
                map_canvas=dialog.get_by_label('Pilih titik laporan',exact=True)
                await map_canvas.scroll_into_view_if_needed()
                marker=map_canvas.locator('[title="Titik laporan - geser untuk menyesuaikan"]')
                await expect(marker).to_be_visible()
                pin_before=await marker.get_attribute('style')
                await dialog.get_by_role('button',name='Satelit',exact=True).click()
                await expect(dialog.get_by_role('button',name='Satelit',exact=True)).to_have_attribute('aria-pressed','true')
                assert await marker.get_attribute('style')==pin_before
                await page.wait_for_timeout(1300)
                await page.screenshot(path=str(OUT/f'location-map-{width}.png'))
                await dialog.get_by_role('button',name='Perbesar peta',exact=True).click()
                await expect(dialog.get_by_role('button',name='Perkecil peta',exact=True)).to_have_attribute('aria-expanded','true')
                await dialog.get_by_role('button',name='Perkecil peta',exact=True).click()
                assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
                overflow=await dialog.evaluate('(d)=>d.scrollWidth>d.clientWidth+1')
                assert not overflow
                checks.append({'width':width,'search':state['mode'],'autofill':True,'map_mode_keeps_pin':True,'no_horizontal_overflow':True})
                if width==1440:
                    state['mode']='fixture';state['multi']=True
                    await search.fill('Uji keyboard');await expect(dialog.get_by_role('option')).to_have_count(6)
                    await search.press('ArrowUp')
                    last_option=dialog.get_by_role('option').last
                    await expect(last_option).to_have_attribute('aria-selected','true')
                    assert await last_option.evaluate('(e)=>{const r=e.getBoundingClientRect(),p=e.parentElement.parentElement.getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom+1}')
                    await search.press('Escape');state['multi']=False
                    await search.fill('Permintaan lama');await asyncio.wait_for(state['slow_query'].wait(),5)
                    await search.fill('Jalan Tunjungan');await expect(dialog.get_by_role('option').first).to_be_visible()
                    await page.wait_for_timeout(900)
                    assert not await dialog.get_by_role('option',name='Hasil lama',exact=False).count()
                    await search.press('Escape');await expect(dialog).to_be_visible()
                    state['failure']=True;await search.fill('Pencarian gagal')
                    await expect(dialog.get_by_text('Pencarian belum tersedia. Coba lagi atau pilih pada peta.',exact=True)).to_be_visible()
                    state['failure']=False;state['empty']=True;await search.fill('Pencarian kosong')
                    await expect(dialog.get_by_text('Lokasi tidak ditemukan. Coba nama lain.',exact=True)).to_be_visible()
                    state['empty']=False;await search.fill('Jalan Tunjungan')
                    await expect(dialog.get_by_role('option').first).to_be_visible();await search.press('Enter')
                    await dialog.get_by_role('checkbox',name='Titik peta dan wilayah sudah sesuai.',exact=False).check()
                    await page.evaluate('navigator.geolocation.getCurrentPosition = success => { window.testLocationSuccess = success; }')
                    await dialog.get_by_role('button',name='Gunakan lokasi saya',exact=True).click()
                    await expect(dialog.get_by_role('button',name='Lanjutkan',exact=True)).to_be_disabled()
                    await expect(dialog.get_by_role('checkbox',name='Titik peta dan wilayah sudah sesuai.',exact=False)).not_to_be_checked()
                    await page.evaluate('window.testLocationSuccess({coords:{longitude:112.7387,latitude:-7.2596}})')
                    await expect(dialog.get_by_label('Daerah/Kota',exact=True)).to_have_value('Surabaya')
                    state['delay']=True
                    await map_canvas.scroll_into_view_if_needed();await map_canvas.click(position={'x':220,'y':140})
                    await dialog.get_by_label('Wilayah',exact=True).fill('Sulawesi Selatan')
                    await dialog.get_by_label('Daerah/Kota',exact=True).fill('Makassar')
                    await page.wait_for_timeout(900)
                    await expect(dialog.get_by_label('Wilayah',exact=True)).to_have_value('Sulawesi Selatan')
                    await expect(dialog.get_by_label('Daerah/Kota',exact=True)).to_have_value('Makassar')
                    state['failure']=True;await map_canvas.scroll_into_view_if_needed();await map_canvas.click(position={'x':230,'y':150})
                    await expect(dialog.get_by_text('Wilayah belum dapat dimuat. Isi provinsi dan kota.',exact=True)).to_be_visible()
                    await expect(marker).to_be_visible()
                    state['failure']=False
                    await map_canvas.click(position={'x':220,'y':140})
                    await dialog.get_by_label('Detail tempat',exact=True).fill('Detail ditulis saat pencarian wilayah')
                    await expect(dialog.get_by_label('Daerah/Kota',exact=True)).to_have_value('Surabaya')
                    await expect(dialog.get_by_label('Detail tempat',exact=True)).to_have_value('Detail ditulis saat pencarian wilayah')
                    await dialog.get_by_label('Wilayah',exact=True).fill('Jawa Timur')
                    await dialog.get_by_label('Daerah/Kota',exact=True).fill('Surabaya')
                    await dialog.get_by_label('Detail tempat',exact=True).fill('Samping tambal ban')
                    await dialog.get_by_role('checkbox',name='Titik peta dan wilayah sudah sesuai.',exact=False).check()
                    await dialog.get_by_role('button',name='Lanjutkan',exact=True).click()
                    await dialog.get_by_label('Ekosistem',exact=True).select_option('gambut')
                    await dialog.get_by_label('Kondisi yang diamati',exact=True).select_option('perlu_rawat')
                    await dialog.locator('input[type=file]').set_input_files(str(ROOT/'public/hero-peat-seedling.jpg'))
                    await dialog.get_by_label('Catatan lapangan',exact=True).fill('Dokumentasi uji lokasi - hanya database sementara.')
                    await dialog.get_by_role('button',name='Kembali',exact=True).click()
                    await expect(dialog.get_by_label('Daerah/Kota',exact=True)).to_have_value('Surabaya')
                    await expect(dialog.get_by_label('Detail tempat',exact=True)).to_have_value('Samping tambal ban')
                    await dialog.get_by_role('button',name='Lanjutkan',exact=True).click()
                    await dialog.get_by_role('button',name='Kirim bukti',exact=True).click()
                    await page.wait_for_url('**/?tab=recovery&report=*',timeout=25000)
                    detail=page.get_by_role('complementary',name='Rincian laporan warga',exact=True)
                    await expect(detail.get_by_text('Surabaya',exact=True)).to_be_visible()
                    await expect(detail.get_by_text('Samping tambal ban',exact=True)).to_be_visible()
                    assert len(creates)==1 and creates[0]['region_key']=='lainnya'
                    assert creates[0]['province']=='Jawa Timur' and creates[0]['city']=='Surabaya' and creates[0]['place_detail']=='Samping tambal ban'
                    assert len(uploads)==1 and uploads[0]['session_context']
                    checks[-1].update({'pending_reverse_preserves_detail':True,'stale_search_ignored':True,'keyboard_scrolls_active_result':True,'escape_closes_only_suggestions':True,'search_error_empty_retry':True,'gps_resets_confirmation':True,'reverse_failure_keeps_pin':True,'manual_edits_stop_stale_reverse':True,'back_keeps_draft':True,'real_fixture_backend_saved':True,'saved_detail_visible':True})
                if width==390:
                    await context.grant_permissions(['geolocation']);await context.set_geolocation({'longitude':112.7387,'latitude':-7.2596,'accuracy':10})
                    async with page.expect_response(re.compile(r'/locations/reverse')):
                        await dialog.get_by_role('button',name='Gunakan lokasi saya',exact=True).click()
                    await expect(dialog.get_by_label('Daerah/Kota',exact=True)).to_have_value('Surabaya')
                    assert float(state['points'][-1]['lng'][0])==112.7387 and float(state['points'][-1]['lat'][0])==-7.2596
                    await map_canvas.scroll_into_view_if_needed();box=await marker.bounding_box();before_point=state['points'][-1]
                    async with page.expect_response(re.compile(r'/locations/reverse')):
                        await page.mouse.move(box['x']+18,box['y']+15);await page.mouse.down();await page.mouse.move(box['x']+48,box['y']+36,steps=8);await page.mouse.up()
                    assert state['points'][-1]!=before_point
                    tile_failure={'active':True}
                    async def tiles(route):
                        if tile_failure['active']: await route.abort('failed')
                        else: await route.continue_()
                    await context.route('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/**',tiles)
                    await dialog.get_by_role('button',name='Peta',exact=True).click()
                    await expect(dialog.get_by_text('Peta belum dapat dimuat.',exact=False)).to_be_visible()
                    tile_failure['active']=False;await dialog.get_by_role('button',name='Coba lagi',exact=True).click()
                    await expect(map_canvas.locator('.leaflet-tile-loaded').first).to_be_visible()
                    await expect(dialog.get_by_text('Peta belum dapat dimuat.',exact=False)).to_have_count(0)
                    checks[-1].update({'native_device_location':True,'drag_updates_report_point':True,'tile_error_retry':True})
                await context.close()
            await browser.close()
        assert not errors,errors
        (OUT/'browser-report.json').write_text(json.dumps({'checks':checks,'javascript_errors':errors,'live_provider_smoke':bool(live_search),'disposable_database':True,'uploads_mocked':True,'real_account_writes':False},indent=2)+'\n')
        for width in [1440,390]:
            shutil.copyfile(OUT/f'location-fields-{width}.png',PREVIEW/f'buktipulih-location-fields-{width}.png')
            shutil.copyfile(OUT/f'location-map-{width}.png',PREVIEW/f'buktipulih-location-map-{width}.png')
        print(json.dumps({'passed':checks,'javascript_errors':errors,'provider_searches':len(live_search)},indent=2),flush=True)
    finally:
        if fixture.returncode is None:
            fixture.terminate()
            try: await asyncio.wait_for(fixture.wait(),15)
            except asyncio.TimeoutError:
                fixture.kill(); await fixture.wait(); raise AssertionError('Fixture cleanup timed out')
        if folder: assert not folder.exists(), 'Temporary fixture database/folder cleanup did not complete'

asyncio.run(main())
