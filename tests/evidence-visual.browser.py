# Check evidence UI, existing plot history and navigation on small and slow screens.
import asyncio,json,sys,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"knowledge/geolocated-evidence-2026-10-28"
BASE="http://localhost:3001"
async def main(folder):
    fixture=Path(folder)
    assert fixture.parent==Path("/tmp") and fixture.name.startswith("buktipulih_auth_browser_test_")
    env=ROOT/".env.local";original=env.read_text();results={};errors=[]
    try:
        env.write_text(original.replace("API_UPSTREAM_URL=http://localhost:5000/api/v1","API_UPSTREAM_URL=http://localhost:5002/api/v1"))
        async with async_playwright() as p:
            browser=await p.chromium.launch()
            ctx=await browser.new_context(viewport={"width":1440,"height":950})
            image=(ROOT/"public/hero-peat-seedling.jpg").read_bytes()
            await ctx.route("https://evidence-fixture.public.blob.vercel-storage.com/**",lambda route:route.fulfill(status=200,body=image,content_type="image/jpeg"))
            page=await ctx.new_page();page.set_default_timeout(15000);page.on("pageerror",lambda error:errors.append(str(error)))
            await page.goto(BASE+"/?tab=forum&compose=1",wait_until="domcontentloaded")
            email=json.loads((fixture/"deliveries.json").read_text())[0]["email"]
            await page.get_by_label("Email",exact=True).fill(email)
            await page.get_by_label("Password",exact=True).fill("EvidenceBrowserPassword2026!")
            await page.get_by_role("button",name="Masuk dan kirim kode",exact=True).click()
            await page.get_by_label("Kode email").wait_for()
            code=next(item["code"] for item in reversed(json.loads((fixture/"deliveries.json").read_text())) if item["email"]==email)
            await page.get_by_label("Kode email").fill(code);await page.get_by_role("button",name="Verifikasi",exact=True).click()
            await page.get_by_role("dialog",name="Kirim bukti",exact=True).wait_for()
            results["existing_password_otp_login_resumes_compose"]=True
            await page.get_by_role("button",name="Tutup formulir",exact=True).click()
            await page.wait_for_function("!new URL(location.href).searchParams.has('compose')")
            posts=(await(await page.request.get(BASE+"/api/v1/forum/posts")).json())["data"]["items"]
            report_id=next(item["id"] for item in posts if item["is_anonymous"])
            plots=(await(await page.request.get(BASE+"/api/v1/plots")).json())["data"]["features"]
            plot_id=plots[0]["id"]
            await page.goto(BASE+"/?tab=recovery&plot="+plot_id,wait_until="domcontentloaded")
            detail=page.get_by_role("complementary",name="Rincian petak",exact=True)
            await detail.get_by_role("heading",name="Petak uji terverifikasi",exact=True).wait_for()
            await detail.get_by_role("tab",name="Riwayat",exact=True).click()
            await detail.get_by_text("Belum ada riwayat.",exact=True).wait_for()
            await page.screenshot(path=str(OUT/"verified-plot-history-1440.png"))
            results["existing_verified_plot_detail_and_history"]=True
            await page.goto(BASE+"/profile",wait_until="domcontentloaded")
            await page.get_by_text("Anonim · Belum diverifikasi",exact=True).wait_for()
            assert await page.locator("tbody tr").count()==2
            await page.screenshot(path=str(OUT/"owner-history-1440.png"))
            results["private_history_shows_anonymous_post"]=True
            await page.goto(BASE+"/?tab=forum",wait_until="domcontentloaded");await page.wait_for_timeout(700)
            nav_before=await page.get_by_role("navigation",name="Navigasi utama").bounding_box()
            await page.get_by_role("button",name="Pemulihan",exact=True).click()
            await page.wait_for_timeout(700)
            nav_after=await page.get_by_role("navigation",name="Navigasi utama").bounding_box()
            assert abs(nav_before["x"]-nav_after["x"])<.5,(nav_before,nav_after)
            results["desktop_navigation_shift_px"]=abs(nav_before["x"]-nav_after["x"])
            await page.get_by_role("button",name="Pilih bahasa",exact=True).click()
            await page.get_by_role("button",name="Submit evidence",exact=True).click()
            english=page.get_by_role("dialog",name="Submit evidence",exact=True);await english.wait_for()
            await english.get_by_label("Location name",exact=True).fill("English evidence")
            await english.get_by_label("Region",exact=True).select_option("lainnya")
            await page.wait_for_timeout(350);await page.screenshot(path=str(OUT/"form-english-1440.png"))
            assert "Other region" in await english.inner_text()
            await english.get_by_role("button",name="Close form",exact=True).click()
            await page.get_by_role("button",name="Pilih bahasa",exact=True).click()
            results["english_form_labels"]=True
            state=await ctx.storage_state()
            results["viewports"]={}
            for width,height in [(320,740),(390,844),(640,360),(768,1024),(1440,900)]:
                device=await browser.new_context(viewport={"width":width,"height":height},storage_state=state,is_mobile=width<1101,has_touch=width<1101)
                await device.route("https://evidence-fixture.public.blob.vercel-storage.com/**",lambda route:route.fulfill(status=200,body=image,content_type="image/jpeg"))
                target=await device.new_page();target.set_default_timeout(25000);target.on("pageerror",lambda error:errors.append(str(error)))
                cdp=await device.new_cdp_session(target);await cdp.send("Emulation.setCPUThrottlingRate",{"rate":6})
                start=time.perf_counter()
                await target.goto(BASE+"/?tab=recovery&report="+report_id,wait_until="domcontentloaded")
                panel=target.get_by_role("complementary",name="Rincian laporan warga",exact=True)
                await panel.get_by_text("Belum diverifikasi",exact=True).wait_for();await target.wait_for_timeout(500)
                assert await target.evaluate("document.documentElement.scrollWidth <= innerWidth")
                map_ready_ms=round((time.perf_counter()-start)*1000)
                await panel.get_by_role("button",name="Tutup rincian",exact=True).click()
                await target.get_by_role("button",name="Filter",exact=False).first.click()
                await target.get_by_label("Wilayah",exact=True).select_option("lainnya")
                await target.get_by_label("Tampilkan",exact=True).select_option("reports")
                if width<1101:assert not await target.get_by_role("button",name="Kirim bukti",exact=True).is_visible()
                await target.get_by_role("button",name="Lihat hasil",exact=True).click()
                await target.get_by_text("Tidak ada lokasi",exact=True).wait_for()
                await target.get_by_role("button",name="Filter",exact=False).first.click()
                await target.get_by_role("button",name="Reset filter",exact=True).click()
                await target.get_by_role("button",name="Lihat hasil",exact=True).click()
                await target.get_by_role("button",name="Kirim bukti",exact=True).click()
                form=target.get_by_role("dialog",name="Kirim bukti",exact=True);await form.wait_for();await target.wait_for_timeout(400)
                assert await target.evaluate("document.documentElement.scrollWidth<=innerWidth")
                assert await form.evaluate("node=>node.scrollWidth<=node.clientWidth")
                footer=await form.get_by_role("button",name="Lanjutkan",exact=True).bounding_box()
                assert footer and footer["y"]+footer["height"]<=height+1,footer
                await target.screenshot(path=str(OUT/f"form-location-{width}-stable.png"))
                await form.get_by_label("Nama lokasi",exact=True).fill("Lokasi uji layar")
                await form.get_by_label("Wilayah",exact=True).select_option("kalbar")
                # A real tap on the Leaflet map selects a point; no synthetic marker data is injected.
                if width<1101:await form.get_by_label("Pilih titik laporan",exact=True).tap(position={"x":100,"y":100})
                else:await form.get_by_label("Pilih titik laporan",exact=True).click(position={"x":100,"y":100})
                await form.get_by_role("checkbox",name="Titik peta dan wilayah sudah sesuai.",exact=False).check()
                await form.get_by_role("button",name="Lanjutkan",exact=True).click()
                await form.get_by_role("checkbox",name="Tampilkan sebagai anonim",exact=False).check()
                await form.get_by_text("Nama dan foto profil disembunyikan.",exact=False).wait_for()
                await target.screenshot(path=str(OUT/f"form-evidence-{width}-stable.png"))
                await target.keyboard.press("Escape");await form.wait_for(state="hidden")
                assert await target.evaluate("document.body.style.overflow!== 'hidden'")
                results["viewports"][str(width)]={"height":height,"cpu":6,"map_detail_ready_dev_ms":map_ready_ms,"footer_in_view":True,"no_horizontal_overflow":True,"touch_pick_and_anonymous_option":True}
                await device.close()
            results["browser_errors"]=errors;assert not errors,errors
            await browser.close()
    finally:
        env.write_text(env.read_text().replace("API_UPSTREAM_URL=http://localhost:5002/api/v1","API_UPSTREAM_URL=http://localhost:5000/api/v1"))
        (OUT/"visual-results.json").write_text(json.dumps(results,indent=2)+"\n")
    print(json.dumps(results))
if __name__=="__main__":asyncio.run(main(sys.argv[1]))
