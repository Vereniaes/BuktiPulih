# Browser acceptance checks. All write requests are intercepted in an isolated context.
import asyncio, base64, json, math, os, time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.async_api import async_playwright, expect

BASE = os.environ.get("QA_BASE_URL", "http://localhost:3002")
OUTPUT = Path(__file__).resolve().parents[1] / "knowledge" / "emisi-homepage-qa"
OUTPUT.mkdir(parents=True, exist_ok=True)

async def main():
    results, errors, writes = [], [], []
    state = {"hotspots": "complete", "air_fail": False, "empty": False, "slow": False}
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width":1440,"height":1000}, color_scheme="light")
        async def route(request_route):
            request = request_route.request
            url, method = request.url, request.method
            parsed = urlparse(url)
            headers = {"Access-Control-Allow-Origin": BASE, "Access-Control-Allow-Credentials":"true", "Access-Control-Allow-Headers":"content-type", "Access-Control-Allow-Methods":"GET,POST,OPTIONS"}
            async def send(data, status=200):
                await request_route.fulfill(status=status, content_type="application/json", body=json.dumps(data), headers=headers)
            if method == "OPTIONS":
                return await request_route.fulfill(status=204, headers=headers)
            if method not in ["GET", "HEAD"]:
                writes.append(parsed.path)
                if parsed.path == "/api/upload":
                    return await send({"url": BASE + "/journal/pl-kalbar-001/m1.jpg"})
                if parsed.path.endswith("/auth/login"):
                    return await send({"data":{"user":{"full_name":"QA Kader"},"message":"Masuk"}})
                if parsed.path.endswith("/auth/logout"):
                    return await send({"data":{}})
                raise AssertionError("Unexpected write: " + parsed.path)
            if "/api/v1/" in url:
                if parsed.path.endswith("/hotspots"):
                    if state["hotspots"] == "failed": return await send({"error":{"code":"FIRMS_NOT_CONFIGURED"}},503)
                    bounds=[float(n) for n in parse_qs(parsed.query)["bbox"][0].split(",")]
                    state['bbox']=bounds
                    lat,lon=(bounds[1]+bounds[3])/2,(bounds[0]+bounds[2])/2
                    now=time.time()
                    points=[{"id":"qa-"+str(i),"coordinates":[lat+i*.02,lon],"observed_at":datetime.fromtimestamp(now-hours*3600,timezone.utc).isoformat(),"satellite":"VIIRS_NOAA20_NRT","confidence":"nominal","frp_mw":12.5} for i,hours in enumerate([1,10,20])]
                    return await send({"data":{"observations":points,"bounds":bounds,"fetched_at":datetime.now(timezone.utc).isoformat(),"observed_at":points[0]["observed_at"],"status":state["hotspots"],"sources":[{"name":"VIIRS_NOAA20_NRT","available":True},{"name":"VIIRS_NOAA21_NRT","available":state["hotspots"]!="partial"}]}})
                if state["empty"] and parsed.path.endswith("/plots"):
                    return await send({"data":{"type":"FeatureCollection","features":[]}})
                if state["empty"] and parsed.path.endswith("/bnpb-karhutla"):
                    return await send({"data":{"provinces":[],"source":"BNPB","sync_timestamp":"2026-10-18T00:00:00Z","layer":"test"}})
                return await send({"error":{"message":"Fixture: source unavailable"}},503)
            if "open-meteo.com" in parsed.netloc:
                query=parse_qs(parsed.query)
                if state["air_fail"] and "air-quality" in parsed.netloc: return await send({},503)
                lat=float(query["latitude"][0])
                if state["slow"] and lat < 0: await asyncio.sleep(.8)
                fields=query.get("hourly",[""])[0].split(",")
                start=int(time.time()//86400*86400)
                hourly={"time":[start+i*3600 for i in range(120)]}
                for field in fields: hourly[field]=[None if i==2 else (70 if lat>0 else 9)+(i%8) for i in range(120)]
                return await send({"hourly":hourly,"current":{"pm2_5":20,"wind_speed_10m":10,"wind_direction_10m":90,"relative_humidity_2m":80}})
            await request_route.continue_()
        await context.route("**/*", route)
        page = await context.new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto(BASE,wait_until="domcontentloaded")
        await expect(page.get_by_role("heading",name="Ringkasan wilayah")).to_be_visible()
        await expect(page.get_by_text("3 titik panas di area peta", exact=False)).to_be_visible()
        results.append("home and source fallback")
        await page.locator('.overview-plot-pin').first.click()
        await expect(page.locator('#plot-detail-bottom-sheet')).to_be_visible()
        await page.get_by_role('button',name='Perbesar peta',exact=True).click()
        await expect(page.get_by_role('dialog').locator('#plot-detail-bottom-sheet')).to_be_visible()
        await page.keyboard.press('Escape')
        await expect(page.locator('#plot-detail-bottom-sheet')).to_be_visible()
        await page.get_by_role('button',name='tutup rincian petak',exact=True).click()
        results.append('plot detail and selection survive expansion')
        await page.get_by_label("Wilayah", exact=True).select_option("kalbar")
        await expect(page.locator('[aria-labelledby="forecast-title"] svg')).to_be_visible()
        await page.get_by_text("Lihat angka per jam",exact=True).click()
        await expect(page.locator('tbody tr').nth(2)).to_contain_text("Belum tersedia")
        await page.get_by_text("Lihat angka per jam",exact=True).click()
        for width in [320,360,390,768,1440]:
            await page.set_viewport_size({"width":width,"height":844 if width<1000 else 1000})
            theme = "light"
            await page.wait_for_timeout(100)
            actual=await page.evaluate("document.documentElement.scrollWidth")
            assert actual==width,(width,theme,actual)
            controls=await page.locator('.portal-tabs button').evaluate_all("els=>els.map(e=>e.getBoundingClientRect().height)")
            assert min(controls)>=44,controls
            zoom=await page.locator('.leaflet-control-zoom a').first.bounding_box()
            assert zoom['width']>=44 and zoom['height']>=44,zoom
            await page.evaluate('window.scrollTo(0,0)')
            await page.screenshot(path=str(OUTPUT/f"home-{width}-{theme}.png"),full_page=width in [390,1440])
            results.append(f"layout {width} {theme}")
        await page.set_viewport_size({"width":390,"height":844})
        await page.wait_for_timeout(500)
        def center():
            west,south,east,north=state['bbox']
            mercator=lambda lat: math.asinh(math.tan(math.radians(lat)))
            return [(west+east)/2,math.degrees(math.atan(math.sinh((mercator(south)+mercator(north))/2)))]
        original_center=center()
        await page.evaluate("document.querySelector('.overview-leaflet').dataset.qa='same-instance'")
        await page.get_by_role('button',name='Perbesar peta',exact=True).scroll_into_view_if_needed()
        original_scroll=await page.evaluate('window.scrollY')
        await page.get_by_role("button",name="Perbesar peta",exact=True).click()
        await expect(page.get_by_role("dialog")).to_be_visible()
        await page.wait_for_timeout(500)
        assert all(abs(a-b)<.002 for a,b in zip(original_center,center())),(original_center,center())
        assert await page.locator('.overview-leaflet').get_attribute('data-qa')=='same-instance'
        await page.keyboard.press("Shift+Tab")
        assert await page.evaluate("document.querySelector('[role=dialog]').contains(document.activeElement)")
        await page.screenshot(path=str(OUTPUT/'map-expanded-mobile.png'))
        await page.keyboard.press("Escape")
        await expect(page.get_by_role("dialog")).to_have_count(0)
        await page.wait_for_timeout(500)
        assert all(abs(a-b)<.002 for a,b in zip(original_center,center())),(original_center,center())
        await expect(page.get_by_role("button",name="Perbesar peta",exact=True)).to_be_focused()
        assert await page.locator('.overview-leaflet').get_attribute('data-qa')=='same-instance'
        assert abs(await page.evaluate('window.scrollY')-original_scroll)<2
        results.append("expansion, Escape, focus, scroll, center and instance preservation")
        await page.get_by_label("Jendela observasi").select_option("6")
        await expect(page.get_by_text("1 titik panas di area peta",exact=False)).to_be_visible()
        await page.get_by_label("Jendela observasi").select_option("24")
        await page.get_by_text("Pilih titik panas dari daftar",exact=True).click()
        await page.locator('details').filter(has=page.get_by_text('Pilih titik panas dari daftar',exact=True)).get_by_role('button').first.click()
        await expect(page.get_by_role('region',name='Rincian titik panas')).to_contain_text('Confidence Nominal')
        await page.get_by_role('button',name='Perbesar peta',exact=True).click()
        await expect(page.get_by_role('region',name='Rincian titik panas')).to_be_visible()
        await page.get_by_role('button',name='Tutup peta besar',exact=True).click()
        await expect(page.get_by_role('region',name='Rincian titik panas')).to_be_visible()
        await page.get_by_role('button',name='Tutup rincian titik panas').click()
        results.append("observation window and accessible hotspot selection")
        state['slow']=True
        await page.get_by_label('Wilayah',exact=True).select_option('kalteng')
        await page.get_by_label('Wilayah',exact=True).select_option('riau')
        await page.wait_for_timeout(1000)
        await expect(page.locator('[aria-labelledby="forecast-title"]')).to_contain_text('Pusat wilayah Riau')
        await page.get_by_text('Lihat angka per jam',exact=True).click()
        await expect(page.locator('tbody tr').first.locator('td')).to_have_text('70')
        state['slow']=False
        await page.get_by_role('button',name='Forum',exact=True).click()
        await expect(page).to_have_url(BASE+'/?region=riau&tab=forum')
        await page.reload()
        await expect(page.locator('.portal-tabs [aria-current=page]')).to_have_text('Forum')
        await page.go_back()
        await expect(page.get_by_role('heading',name='Ringkasan wilayah')).to_be_visible()
        await expect(page.get_by_label('Wilayah',exact=True)).to_have_value('riau')
        await page.go_forward()
        await expect(page.locator('.portal-tabs [aria-current=page]')).to_have_text('Forum')
        results.append('rapid region changes and URL Back/Forward/refresh')
        for tab in ['fire','recovery','forum']:
            await page.goto(BASE+f'/?tab={tab}&region=kalbar',wait_until='domcontentloaded')
            await page.wait_for_timeout(600)
            await expect(page.locator('.portal-tabs [aria-current=page]')).to_have_text({'fire':'Karhutla','recovery':'Pemulihan','forum':'Forum'}[tab])
            results.append({'legacy':tab,'width':await page.evaluate('document.documentElement.scrollWidth')})
        await page.goto(BASE+'/?tab=fire',wait_until='domcontentloaded')
        await page.get_by_role('button',name='Ekspor Disposisi',exact=False).click()
        await expect(page.get_by_role('dialog',name='Lembar Disposisi Siaga Karhutla')).to_be_visible()
        await page.get_by_role('button',name='Tutup modal',exact=True).click()
        results.append('export dialog remains reachable')
        await page.goto(BASE+'/?region=kalbar',wait_until='domcontentloaded')
        await page.get_by_role('link',name='Lihat bukti →').first.click()
        await page.wait_for_url('**/forum/**')
        await expect(page.get_by_role('link', name='Kembali ke Forum', exact=False)).to_be_visible()
        await page.goto(BASE,wait_until='domcontentloaded')
        state['hotspots']='failed'
        await page.reload()
        await expect(page.get_by_text('Data titik panas belum tersedia.',exact=False)).to_be_visible()
        assert await page.get_by_text('0 titik panas di area peta',exact=False).count()==0
        state['hotspots']='partial'
        await page.get_by_text('Data titik panas belum tersedia.',exact=False).get_by_role('button',name='Coba lagi').click()
        await expect(page.get_by_text('Data sebagian',exact=False)).to_be_visible()
        state['hotspots']='cached'
        await page.get_by_label('Wilayah',exact=True).select_option('jambi')
        await expect(page.get_by_text('Data tersimpan, pembaruan gagal',exact=False)).to_be_visible()
        results.append('unavailable, partial, and cached hotspots')
        state['air_fail']=True
        await page.get_by_label('Wilayah',exact=True).select_option('bekasi')
        await expect(page.get_by_text('Cakupan provinsi Jawa Barat',exact=True)).to_be_visible()
        await expect(page.get_by_text('Prakiraan PM2.5 belum tersedia.',exact=False)).to_be_visible()
        await page.get_by_role('button',name='Angin',exact=True).click()
        await expect(page.locator('[aria-labelledby="forecast-title"] svg')).to_be_visible()
        results.append('independent forecast failure')
        state['empty']=True
        await page.reload()
        await expect(page.get_by_text('0 petak dipantau',exact=False)).to_be_visible()
        await expect(page.locator('main').get_by_text('Belum tersedia',exact=True)).to_be_visible()
        results.append('empty service results remain empty')
        state['empty']=False
        await page.goto(BASE,wait_until='domcontentloaded')
        await page.get_by_role('button',name='Masuk',exact=True).click()
        for digit in '123456': await page.get_by_role('button',name=digit,exact=True).click()
        await page.get_by_role('dialog').locator('button[type=submit]').click()
        await expect(page.get_by_role('button',name='Keluar',exact=True)).to_be_visible()
        await page.get_by_role('button',name='Keluar',exact=True).click()
        await expect(page.get_by_role('button',name='Masuk',exact=True)).to_be_visible()
        results.append('isolated login/logout')
        await page.get_by_role('button',name='Kirim bukti',exact=True).click()
        await page.get_by_placeholder('Contoh: Pak Suwardi').fill('QA Test')
        await page.get_by_placeholder('Contoh: 35',exact=True).fill('35')
        await page.get_by_placeholder('Contoh: Kubu Raya',exact=True).fill('QA Kota')
        await page.get_by_placeholder('Contoh: Rumah Warga RT 03, Jembatan Desa, Jalur 4 Parit Tokaya').fill('Lokasi QA terisolasi')
        await page.locator('textarea').fill('Catatan pengujian lokal, tidak dikirim ke produksi.')
        await page.locator('input[type=file]').set_input_files({'name':'qa.png','mimeType':'image/png','buffer':base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=')})
        await page.get_by_role('dialog').locator('button[type=submit]').click()
        await expect(page.locator('.portal-tabs [aria-current=page]')).to_have_text('Forum')
        await page.get_by_role('button',name='Beranda',exact=True).click()
        await expect(page.get_by_text('Lokasi QA terisolasi',exact=True)).to_be_visible()
        await page.locator('article').filter(has=page.get_by_text('Lokasi QA terisolasi',exact=True)).get_by_role('button',name='Lihat bukti →').click()
        await page.get_by_placeholder('Tulis tanggapan atau konfirmasi kondisi lapangan...').fill('Komentar QA lokal')
        await page.get_by_role('dialog').locator('button[type=submit]').click()
        await expect(page.get_by_text('Komentar QA lokal',exact=True)).to_be_visible()
        await page.get_by_role('button',name='Tutup dialog',exact=True).click()
        stored=await page.evaluate("JSON.parse(localStorage.getItem('buktipulih_forum_posts_v1'))")
        assert stored[0]['comments'][0]['content']=='Komentar QA lokal',stored[0]['comments']
        results.append('isolated upload, local evidence, comments')
        assert not errors,errors
        await context.close()
        await browser.close()
    report={'results':results,'javascript_errors':errors,'intercepted_writes':writes,'live_nasa':'Not tested - FIRMS_MAP_KEY unavailable'}
    (OUTPUT/'checks.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report,indent=2))

asyncio.run(main())
