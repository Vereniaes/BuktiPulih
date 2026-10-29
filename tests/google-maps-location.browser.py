# Inspect real Google rendering and save Street View coordinates only in a temporary backend.
import asyncio,json,os,re,shutil,socket,sys
from pathlib import Path
from urllib.parse import urlsplit
from playwright.async_api import async_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'knowledge/google-maps-location-2026-10-29'
NODE='/home/vereniaes/.nvm/versions/node/v24.22.0/bin/node'
BASE='http://localhost:3001'
def safe(value): return re.sub(r'AIza[0-9A-Za-z_-]{20,}','[redacted]',str(value))
async def main():
    with socket.socket() as probe: assert probe.connect_ex(('127.0.0.1',5002))!=0
    env=os.environ.copy();env['PATH']=str(Path(NODE).parent)+':'+env['PATH']
    fixture=await asyncio.create_subprocess_exec(NODE,'--import','tsx','tests/email-auth.browser-server.ts','--account-deletion','--recovery',cwd=ROOT.parent/'bukti-pulih-be',env=env,stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.PIPE)
    folder=None;errors=[];google_errors=[];checks=[];creates=[]
    try:
        data=json.loads((await asyncio.wait_for(fixture.stdout.readline(),25)).decode());folder=Path(data['folder'])
        assert folder.parent==Path('/tmp') and folder.name.startswith('buktipulih_auth_browser_test_')
        accounts=json.loads((folder/'account-fixtures.json').read_text())
        async with async_playwright() as p:
            browser=await p.chromium.launch()
            cases=[(1440,1000),(390,844),(320,740),(800,450)]
            if len(sys.argv)>1: cases=[case for case in cases if str(case[0]) in sys.argv[1:]]
            for width,height in cases:
                account=next(a for a in accounts if a['width']==width)
                context=await browser.new_context(viewport={'width':width,'height':height},is_mobile=width<600,has_touch=width<600)
                await context.add_cookies([{'name':'bp_session','value':account['token'],'domain':'localhost','path':'/','httpOnly':True,'sameSite':'Lax'}])
                async def api(route):
                    req=route.request;u=urlsplit(req.url)
                    assert '/locations/' not in u.path, 'Old provider route must not be used'
                    if req.method=='POST' and u.path.endswith('/forum/posts'): creates.append(req.post_data_json)
                    response=await route.fetch(url='http://127.0.0.1:5002'+u.path+('?' + u.query if u.query else ''))
                    await route.fulfill(response=response)
                await context.route(re.compile(r'/api/v1/(auth|forum|locations)/'),api)
                image=(ROOT/'public/hero-peat-seedling.jpg').read_bytes()
                await context.route('https://evidence-fixture.public.blob.vercel-storage.com/**',lambda route:route.fulfill(body=image,content_type='image/jpeg'))
                await context.route('**/api/upload',lambda route:route.fulfill(json={'url':'https://evidence-fixture.public.blob.vercel-storage.com/bukti-lapangan/google-location.webp'}))
                page=await context.new_page();page.set_default_timeout(25000)
                page.on('pageerror',lambda e:errors.append(safe(e)))
                page.on('console',lambda m:google_errors.append(safe(m.text)) if m.type=='error' and ('Google Maps' in m.text or 'GoogleMaps' in m.text) else None)
                await page.goto(BASE+'/?tab=forum&compose=1',wait_until='domcontentloaded')
                dialog=page.get_by_role('dialog',name='Kirim bukti',exact=True)
                await expect(dialog).to_be_visible()
                await dialog.get_by_label('Pilih titik laporan',exact=True).scroll_into_view_if_needed()
                try: await expect(dialog.get_by_role('button',name='Satelit',exact=True)).to_be_enabled(timeout=35000)
                except Exception:
                    await page.screenshot(path=str(OUT/f'google-load-failure-{width}.png'))
                    print(json.dumps({'map_load_failed':True,'google_errors':google_errors,'javascript_errors':errors}),flush=True);raise
                await page.add_style_tag(content='nextjs-portal{display:none!important}')
                search=dialog.get_by_role('combobox',name='Cari lokasi',exact=True)
                await search.fill('Jalan Tunjungan Surabaya')
                await expect(dialog.get_by_role('option').first).to_be_visible()
                await page.screenshot(path=str(OUT/f'google-search-{width}.png'))
                await search.press('Enter')
                await expect(dialog.get_by_label('Daerah/Kota',exact=True)).to_have_value(re.compile('Surabaya'))
                await expect(dialog.get_by_label('Wilayah',exact=True)).to_have_value(re.compile('Jawa Timur'))
                await dialog.get_by_label('Detail tempat',exact=True).fill('Samping tambal ban')
                camera=await page.evaluate('()=>{const m=document.querySelector("gmp-advanced-marker");return m?{point:m.position.toJSON?m.position.toJSON():m.position,center:m.map.getCenter().toJSON(),zoom:m.map.getZoom()}:null}')
                assert camera, 'Selected Google marker is missing'
                assert abs(camera['point']['lat']-camera['center']['lat'])<.001 and abs(camera['point']['lng']-camera['center']['lng'])<.001, 'Map camera must center on the selected report pin'
                await page.wait_for_timeout(1300)
                await page.screenshot(path=str(OUT/f'google-fields-{width}.png'))
                if width==390:
                    marker=page.locator('gmp-advanced-marker');await marker.scroll_into_view_if_needed();box=await marker.bounding_box()
                    old_point=await marker.evaluate('(m)=>m.position.toJSON()')
                    await page.mouse.move(box['x']+box['width']/2,box['y']+12);await page.mouse.down();await page.mouse.move(box['x']+box['width']/2+30,box['y']+32,steps=10);await page.mouse.up()
                    await page.wait_for_function('(old)=>{const p=document.querySelector("gmp-advanced-marker")?.position;return p&&(Math.abs(p.lat-old.lat)>.000001||Math.abs(p.lng-old.lng)>.000001||typeof p.lat==="function"&&Math.abs(p.lat()-old.lat)>.000001)}',arg=old_point)
                    await context.grant_permissions(['geolocation']);await context.set_geolocation({'longitude':112.7401,'latitude':-7.2614,'accuracy':10})
                    await dialog.get_by_role('button',name='Gunakan lokasi saya',exact=True).click()
                    await page.wait_for_function('()=>{const p=document.querySelector("gmp-advanced-marker")?.position;return p&&Math.abs((typeof p.lat==="function"?p.lat():p.lat)+7.2614)<.000001}')
                    await expect(dialog.get_by_label('Daerah/Kota',exact=True)).to_have_value(re.compile('Surabaya'))
                    camera=await page.evaluate('()=>{const m=document.querySelector("gmp-advanced-marker");return {point:m.position.toJSON(),center:m.map.getCenter().toJSON(),zoom:m.map.getZoom()}}')
                await dialog.get_by_role('button',name='Perbesar peta',exact=True).click()
                await expect(dialog.get_by_role('button',name='Perkecil peta',exact=True)).to_have_attribute('aria-expanded','true')
                await dialog.get_by_role('button',name='Perkecil peta',exact=True).click()
                await dialog.get_by_role('checkbox',name='Titik peta dan wilayah sudah sesuai.',exact=False).check()
                await dialog.get_by_role('button',name='Satelit',exact=True).click()
                await expect(dialog.get_by_role('button',name='Satelit',exact=True)).to_have_attribute('aria-pressed','true')
                await page.wait_for_timeout(1200)
                camera_after=await page.evaluate('()=>{const m=document.querySelector("gmp-advanced-marker");return m.map.getCenter().toJSON()}')
                assert abs(camera_after['lat']-camera['center']['lat'])<.001 and abs(camera_after['lng']-camera['center']['lng'])<.001
                assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
                await page.screenshot(path=str(OUT/f'google-satellite-{width}.png'))
                await page.evaluate('''() => {
                  const original=google.maps.importLibrary;window.testStreetState='real';
                  google.maps.importLibrary=async name=>{
                    const library=await original(name);
                    if(name!=='streetView')return library;
                    return {...library,StreetViewService:class extends library.StreetViewService{
                      getPanorama(...args){
                        if(window.testStreetState==='empty')return Promise.reject({code:'ZERO_RESULTS'});
                        if(window.testStreetState==='error')return Promise.reject({code:'UNKNOWN_ERROR'});
                        if(window.testStreetState==='pending')return new Promise(resolve=>window.testStreetRelease=resolve);
                        return super.getPanorama(...args);
                      }
                    },StreetViewPanorama:class extends library.StreetViewPanorama{
                      constructor(...args){super(...args);window.testPanorama=this;}
                    }};
                  };
                }''')
                await dialog.get_by_role('button',name='Street View',exact=True).click()
                street=page.get_by_role('dialog',name='Street View',exact=True)
                await expect(street).to_be_visible()
                try: await expect(street.get_by_role('button',name='Pilih lokasi ini',exact=True)).to_be_enabled(timeout=35000)
                except Exception:
                    await page.screenshot(path=str(OUT/f'google-street-failure-{width}.png'))
                    print(json.dumps({'street_failed':True,'status':await street.inner_text(),'google_errors':google_errors,'javascript_errors':errors}),flush=True);raise
                assert await street.evaluate('(d)=>Math.abs(d.getBoundingClientRect().width-innerWidth)<2&&Math.abs(d.getBoundingClientRect().height-innerHeight)<2')
                await page.wait_for_timeout(1500)
                if width==1440:
                    old_position=await page.evaluate('()=>window.testPanorama.getPosition().toJSON()')
                    await page.evaluate('()=>{const links=window.testPanorama.getLinks();if(!links[0]?.pano)throw new Error("No navigation link");window.testPanorama.setPano(links[0].pano)}')
                    await page.wait_for_function('(old)=>{const p=window.testPanorama.getPosition();return p&&window.testPanorama.getStatus()==="OK"&&(Math.abs(p.lat()-old.lat)>.000001||Math.abs(p.lng()-old.lng)>.000001)}',arg=old_position)
                    await expect(street.get_by_role('button',name='Pilih lokasi ini',exact=True)).to_be_enabled()
                    await page.wait_for_timeout(700)
                assert not await street.evaluate('(d)=>d.scrollWidth>d.clientWidth+1')
                await street.get_by_role('button',name='Pilih lokasi ini',exact=True).focus();await page.keyboard.press('Tab')
                assert await street.evaluate('(d)=>d.contains(document.activeElement)')
                await page.screenshot(path=str(OUT/f'google-street-view-{width}.png'))
                selected=await page.evaluate('()=>{const p=window.testPanorama.getPosition();return [p.lng(),p.lat()]}')
                await street.get_by_role('button',name='Pilih lokasi ini',exact=True).click()
                await expect(street).to_have_count(0)
                await expect(dialog.get_by_role('button',name='Street View',exact=True)).to_be_focused()
                await expect(dialog.get_by_role('checkbox',name='Titik peta dan wilayah sudah sesuai.',exact=False)).not_to_be_checked()
                await expect(dialog.get_by_label('Daerah/Kota',exact=True)).to_have_value(re.compile('Surabaya'))
                await expect(dialog.get_by_label('Detail tempat',exact=True)).to_have_value('Samping tambal ban')
                if width==1440:
                    pin=await page.evaluate('()=>document.querySelector("gmp-advanced-marker").position.toJSON()')
                    for mode,message in [('empty','Street View belum tersedia di titik ini.'),('error','Street View belum dapat dimuat.')]:
                        await page.evaluate('(mode)=>window.testStreetState=mode',mode)
                        await dialog.get_by_role('button',name='Street View',exact=True).click()
                        await expect(street.get_by_text(message,exact=True)).to_be_visible()
                        await expect(street.get_by_role('button',name='Pilih lokasi ini',exact=True)).to_be_disabled()
                        if mode=='empty': await page.keyboard.press('Escape')
                        else:
                            await page.evaluate("window.testStreetState='empty'")
                            await street.get_by_role('button',name='Coba lagi',exact=True).click()
                            await expect(street.get_by_text('Street View belum tersedia di titik ini.',exact=True)).to_be_visible()
                            await street.get_by_role('button',name='Kembali ke peta',exact=True).click()
                        await expect(street).to_have_count(0);await expect(dialog).to_be_visible()
                        assert await page.evaluate('()=>document.querySelector("gmp-advanced-marker").position.toJSON()')==pin
                    await page.evaluate("window.testStreetState='pending'")
                    await dialog.get_by_role('button',name='Street View',exact=True).click()
                    await page.wait_for_function('()=>typeof window.testStreetRelease==="function"')
                    await street.get_by_role('button',name='Kembali ke peta',exact=True).click()
                    await page.evaluate('window.testStreetRelease({data:{location:{pano:"cancelled-test"}}})')
                    await page.wait_for_timeout(100)
                    await expect(street).to_have_count(0)
                    assert await page.evaluate('()=>document.querySelector("gmp-advanced-marker").position.toJSON()')==pin
                await dialog.get_by_role('checkbox',name='Titik peta dan wilayah sudah sesuai.',exact=False).check()
                await dialog.get_by_role('button',name='Lanjutkan',exact=True).click()
                await expect(dialog.get_by_role('button',name='Kirim bukti',exact=True)).to_be_enabled()
                await dialog.get_by_label('Ekosistem',exact=True).select_option('gambut')
                await dialog.get_by_label('Kondisi yang diamati',exact=True).select_option('perlu_rawat')
                await dialog.locator('input[type=file]').set_input_files(str(ROOT/'public/hero-peat-seedling.jpg'))
                await dialog.get_by_label('Catatan lapangan',exact=True).fill('Uji Google Maps - laporan hanya dalam database sementara.')
                await dialog.get_by_role('button',name='Kirim bukti',exact=True).click()
                try: await page.wait_for_url('**/?tab=recovery&report=*')
                except Exception:
                    print('REPORT_DIAGNOSTIC',len(creates),'file_preview',await dialog.get_by_alt_text('Pratinjau bukti',exact=True).count(),'form',safe(await dialog.inner_text()),flush=True)
                    await page.screenshot(path=str(OUT/f'google-submit-failure-{width}.png'));raise
                assert len(creates)==len(checks)+1
                assert all(abs(creates[-1]['location']['coordinates'][i]-selected[i])<.000001 for i in [0,1])
                assert creates[-1]['place_detail']=='Samping tambal ban'
                await expect(page.get_by_role('complementary',name='Rincian laporan warga',exact=True).get_by_text('Samping tambal ban',exact=True)).to_be_visible()
                checks.append({'width':width,'google_map_rendered':True,'real_google_search_autofill':True,'street_view_fullscreen':True,'selected_panorama_coordinates_saved':True,'map_mode_keeps_center':True,'focus_returned':True,'no_horizontal_overflow':True})
                print('PASS',width,flush=True)
                await context.close()
            await browser.close()
        assert not errors,errors
        assert not google_errors,google_errors
        report_name='browser-report-'+ '-'.join(str(c['width']) for c in checks)+'.json' if len(sys.argv)>1 else 'browser-report.json'
        (OUT/report_name).write_text(json.dumps({'checks':checks,'javascript_errors':errors,'google_errors':google_errors,'uploads_mocked':True,'disposable_database':True,'real_account_writes':False},indent=2)+'\n')
    finally:
        if fixture.returncode is None:
            fixture.terminate();await asyncio.wait_for(fixture.wait(),15)
        if folder:assert not folder.exists()
asyncio.run(main())
