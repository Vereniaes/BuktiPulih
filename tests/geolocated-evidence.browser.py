# Exercise authenticated geolocated evidence against the isolated captured-mail backend.
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "knowledge/geolocated-evidence-2026-10-28"
BASE = "http://localhost:3001"
PASSWORD = "EvidenceBrowserPassword2026!"
async def main(folder):
    fixture = Path(folder)
    assert fixture.parent == Path("/tmp") and fixture.name.startswith("buktipulih_auth_browser_test_")
    env_file = ROOT / ".env.local"
    original = env_file.read_text()
    results, errors = {}, []
    try:
        env_file.write_text(original.replace("API_UPSTREAM_URL=http://localhost:5000/api/v1", "API_UPSTREAM_URL=http://localhost:5002/api/v1"))
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            context = await browser.new_context(viewport={"width":1440,"height":950})
            page = await context.new_page();page.set_default_timeout(15000)
            page.on("pageerror",lambda error:errors.append(str(error)))
            image = (ROOT / "public/hero-peat-seedling.jpg").read_bytes()
            await context.route("https://evidence-fixture.public.blob.vercel-storage.com/bukti-lapangan/**", lambda route: route.fulfill(status=200,body=image,content_type="image/jpeg"))
            await page.goto(BASE+"/?tab=forum",wait_until="domcontentloaded");await page.wait_for_timeout(1000)
            guest_upload = await page.request.post(BASE+"/api/upload",headers={"Origin":BASE},multipart={"purpose":"evidence"})
            assert guest_upload.status==401,guest_upload.status
            await page.get_by_role("button",name="Kirim bukti",exact=True).click()
            await page.get_by_role("heading",name="Masuk",exact=True).wait_for()
            assert await page.get_by_role("dialog").get_by_text("Warga / Lembaga",exact=True).count()==0
            await page.get_by_role("button",name="Tutup dialog",exact=True).click()
            await page.goto(BASE+"/?tab=forum&compose=1",wait_until="domcontentloaded")
            await page.get_by_role("button",name="Daftar",exact=True).click()
            run=len(json.loads((fixture/"deliveries.json").read_text()))
            email=f"evidence-ui-{run}@example.test"
            username=f"evidence_ui_{run}"
            await page.get_by_label("Email",exact=True).fill(email)
            await page.get_by_label("Buat password",exact=True).fill(PASSWORD)
            await page.get_by_label("Konfirmasi password",exact=True).fill(PASSWORD)
            await page.get_by_role("button",name="Daftar dan kirim kode",exact=True).click()
            await page.get_by_label("Kode email").wait_for()
            deliveries=json.loads((fixture/"deliveries.json").read_text())
            code=next(item["code"] for item in reversed(deliveries) if item["email"]==email)
            await page.get_by_label("Kode email").fill(code)
            await page.get_by_role("button",name="Verifikasi",exact=True).click()
            await page.get_by_label("Username",exact=True).fill(username)
            await page.get_by_role("combobox",name="Sebagai siapa?").select_option("volunteer")
            await page.get_by_role("button",name="Simpan dan lanjutkan").click()
            dialog=page.get_by_role("dialog",name="Kirim bukti",exact=True)
            await dialog.wait_for(); assert "/profile" not in page.url
            results["login_otp_profile_resumes_submission"]=True
            account=(await(await page.request.get(BASE+"/api/v1/auth/me")).json())["data"]["user"]
            invalid_upload=await page.request.post(BASE+"/api/upload",headers={"Origin":BASE,"x-session-context":account["session_context"]},multipart={"file":{"name":"bad.png","mimeType":"image/png","buffer":b"not-an-image"},"purpose":"evidence"})
            assert invalid_upload.status==400,invalid_upload.status
            stale_upload=await page.request.post(BASE+"/api/upload",headers={"Origin":BASE,"x-session-context":"00000000-0000-4000-8000-000000000000"},multipart={"purpose":"evidence"})
            assert stale_upload.status==409,stale_upload.status
            foreign_upload=await page.request.post(BASE+"/api/upload",headers={"Origin":"https://foreign.example"},multipart={"purpose":"evidence"})
            assert foreign_upload.status==403
            results["real_upload_auth_context_origin_and_file_validation"]=True
            await dialog.get_by_label("Nama lokasi",exact=True).fill("Parit Tokaya - bukti berkoordinat")
            await dialog.get_by_label("Wilayah",exact=True).select_option("kalbar")
            assert not await dialog.get_by_role("button",name="Lanjutkan",exact=True).is_enabled()
            picker=dialog.get_by_label("Pilih titik laporan",exact=True)
            await picker.wait_for();await picker.click(position={"x":420,"y":130})
            await dialog.get_by_text("Titik dipilih:",exact=False).wait_for()
            marker=picker.locator('[title="Titik laporan - geser untuk menyesuaikan"]')
            box=await marker.bounding_box()
            assert box
            before=await dialog.locator('[role="status"]').first.inner_text()
            await page.mouse.move(box['x']+18,box['y']+18);await page.mouse.down();await page.mouse.move(box['x']+65,box['y']+40,steps=6);await page.mouse.up()
            after=await dialog.locator('[role="status"]').first.inner_text()
            assert before!=after,(before,after)
            results["map_click_and_drag_select_coordinates"]=True
            await context.grant_permissions(["geolocation"])
            await context.set_geolocation({"longitude":109.21,"latitude":-.81,"accuracy":10})
            await dialog.get_by_role("button",name="Gunakan lokasi saya").click()
            await dialog.get_by_text("Titik dipilih: -0.810000, 109.210000",exact=True).wait_for()
            results["device_location_is_explicit"]=True
            await dialog.get_by_text("Masukkan koordinat",exact=True).click()
            await dialog.get_by_label("Lintang",exact=True).fill("-0.25")
            await dialog.get_by_label("Bujur",exact=True).fill("109.462")
            assert not await dialog.get_by_role("button",name="Lanjutkan",exact=True).is_enabled()
            await dialog.get_by_role("button",name="Terapkan",exact=True).click()
            await dialog.get_by_text("Titik dipilih: -0.250000, 109.462000",exact=True).wait_for()
            await dialog.get_by_role("checkbox",name="Titik peta dan wilayah sudah sesuai.",exact=False).check()
            await picker.locator(".leaflet-tile-loaded").first.wait_for()
            await page.wait_for_timeout(800)
            await page.screenshot(path=str(OUT/"form-location-1440.png"))
            await dialog.get_by_role("button",name="Lanjutkan",exact=True).click()
            await dialog.get_by_label("Ekosistem",exact=True).select_option("gambut")
            await dialog.get_by_label("Kondisi yang diamati",exact=True).select_option("perlu_rawat")
            await dialog.locator('input[type="file"]').set_input_files(str(ROOT/"public/hero-peat-seedling.jpg"))
            await dialog.get_by_label("Catatan lapangan",exact=True).fill("Saluran mulai mengering. Dokumentasi dikirim untuk pemantauan pemulihan.")
            await dialog.get_by_role("checkbox",name="Tampilkan sebagai anonim",exact=False).check()
            await dialog.get_by_text("Nama dan foto profil disembunyikan.",exact=False).wait_for()
            await page.screenshot(path=str(OUT/"form-evidence-1440.png"))
            uploads=[]
            async def upload(route):
                uploads.append({"context_present":bool(route.request.headers.get("x-session-context")),"multipart":route.request.headers.get("content-type","").startswith("multipart/form-data")})
                if len(uploads)==1: await route.fulfill(status=500,json={"error":"Unggahan uji gagal."})
                else: await route.fulfill(status=200,json={"url":"https://evidence-fixture.public.blob.vercel-storage.com/bukti-lapangan/report.webp"})
            await page.route("**/api/upload",upload)
            creates=[]
            async def create_report(route):
                creates.append(route.request.post_data_json)
                if len(creates)==1: await route.fulfill(status=503,json={"error":{"code":"SERVICE_UNAVAILABLE","message":"Uji simpan gagal."}})
                else: await route.continue_()
            await page.route("**/api/v1/forum/posts",create_report)
            await dialog.get_by_role("button",name="Kirim bukti",exact=True).click()
            await dialog.get_by_text("Unggahan uji gagal.",exact=True).wait_for()
            assert "2 dari 2" in await dialog.inner_text()
            await dialog.get_by_role("button",name="Kirim bukti",exact=True).click()
            await dialog.get_by_text("Uji simpan gagal.",exact=True).wait_for()
            assert "tab=forum" in page.url
            await dialog.get_by_role("button",name="Kirim bukti",exact=True).click()
            await page.wait_for_url("**/?tab=recovery&report=*")
            report_id=page.url.split("report=")[1].split("&")[0]
            detail=page.get_by_role("complementary",name="Rincian laporan warga",exact=True)
            await detail.get_by_text("Belum diverifikasi",exact=True).wait_for()
            await detail.get_by_text("Anonim",exact=True).wait_for()
            await page.wait_for_timeout(900)
            await page.screenshot(path=str(OUT/"recovery-report-1440.png"))
            public=(await(await page.request.get(BASE+"/api/v1/forum/posts/"+report_id)).json())["data"]
            assert public["location"]["coordinates"]==[109.462,-.25]
            assert public["verification_status"]=="unverified"
            assert "user_id" not in public["author"] and public["author"]["avatar_url"] is None
            history=(await(await page.request.get(BASE+"/api/v1/auth/me/activity?type=posts")).json())["data"]
            assert any(item["post_id"]==report_id and item["is_anonymous"] for item in history["items"])
            results["saved_coordinates_anonymous_public_and_private_history"]=True
            assert all(item["context_present"] and item["multipart"] for item in uploads)
            assert len(uploads)==2 and len(creates)==2
            assert creates[0]["submission_id"]==creates[1]["submission_id"]
            results["failed_upload_and_save_retry_preserve_form_and_submission_id"]=True
            await detail.get_by_role("link",name="Buka catatan lengkap",exact=True).click()
            await page.wait_for_url("**/forum/"+report_id)
            await page.get_by_role("link",name="Lihat di Pemulihan",exact=True).click()
            await page.wait_for_url("**report="+report_id)
            await detail.get_by_text("Belum diverifikasi",exact=True).wait_for()
            results["forum_and_recovery_links"]=True
            state=await context.storage_state()
            mobile=await browser.new_context(viewport={"width":390,"height":844},storage_state=state)
            await mobile.route("https://evidence-fixture.public.blob.vercel-storage.com/bukti-lapangan/**",lambda route:route.fulfill(status=200,body=image,content_type="image/jpeg"))
            phone=await mobile.new_page();phone.set_default_timeout(15000)
            phone.on("pageerror",lambda error:errors.append(str(error)))
            await phone.route("**/api/upload",lambda route:route.fulfill(status=200,json={"url":"https://evidence-fixture.public.blob.vercel-storage.com/bukti-lapangan/mobile.webp"}))
            await phone.goto(BASE+"/?tab=recovery",wait_until="domcontentloaded");await phone.wait_for_timeout(900)
            await phone.get_by_role("button",name="Kirim bukti",exact=True).click()
            form=phone.get_by_role("dialog",name="Kirim bukti",exact=True);await form.wait_for()
            await form.get_by_label("Nama lokasi",exact=True).fill("Pemulihan ponsel")
            await form.get_by_label("Wilayah",exact=True).select_option("kalbar")
            await form.get_by_role("button",name="Gunakan lokasi saya").click()
            await form.get_by_text("Lokasi belum dapat diakses.",exact=False).wait_for()
            results["denied_geolocation_has_manual_fallback"]=True
            await form.get_by_text("Masukkan koordinat",exact=True).click()
            await form.get_by_label("Lintang",exact=True).fill("-0.3")
            await form.get_by_label("Bujur",exact=True).fill("109.46")
            await form.get_by_role("button",name="Terapkan",exact=True).click()
            await form.get_by_role("checkbox",name="Titik peta dan wilayah sudah sesuai.",exact=False).check()
            await phone.wait_for_timeout(600)
            await phone.screenshot(path=str(OUT/"form-location-390.png"))
            await form.get_by_role("button",name="Lanjutkan",exact=True).click()
            await form.get_by_label("Ekosistem",exact=True).select_option("gambut")
            await form.get_by_label("Kondisi yang diamati",exact=True).select_option("subur")
            await form.locator('input[type="file"]').set_input_files(str(ROOT/"public/hero-peat-seedling.jpg"))
            await form.get_by_label("Catatan lapangan",exact=True).fill("Laporan kondisi dari ponsel untuk kawasan pemulihan.")
            await phone.screenshot(path=str(OUT/"form-evidence-390.png"))
            await form.get_by_role("button",name="Kirim bukti",exact=True).click()
            await phone.wait_for_url("**/?tab=recovery&report=*")
            panel=phone.get_by_role("complementary",name="Rincian laporan warga",exact=True)
            await panel.get_by_text("Belum diverifikasi",exact=True).wait_for()
            await panel.get_by_text(username,exact=True).wait_for()
            box=await panel.bounding_box();assert box and 200<box["y"]<500,box
            await phone.wait_for_timeout(800);await phone.screenshot(path=str(OUT/"recovery-report-390.png"))
            marker_boxes=await phone.locator('.leaflet-marker-icon[title^="Laporan warga"]').evaluate_all("nodes=>nodes.map(node=>({title:node.title,x:node.getBoundingClientRect().x,y:node.getBoundingClientRect().y,w:node.getBoundingClientRect().width,h:node.getBoundingClientRect().height}))")
            results["mobile_marker_positions"]=marker_boxes
            assert any(item["x"]>=0 and item["x"]<390 and 65<=item["y"]<box["y"] for item in marker_boxes),marker_boxes
            results["mobile_submit_and_bottom_detail"]=True
            await phone.set_viewport_size({"width":320,"height":740})
            await phone.get_by_role("button",name="Kirim bukti",exact=True).click();await form.wait_for()
            assert await phone.evaluate("document.documentElement.scrollWidth <= innerWidth")
            assert await form.evaluate("node=>node.scrollWidth<=node.clientWidth")
            await phone.keyboard.press("Shift+Tab")
            assert await form.evaluate("node=>node.contains(document.activeElement)")
            await phone.wait_for_timeout(350)
            await phone.screenshot(path=str(OUT/"form-location-320.png"))
            await phone.keyboard.press("Escape");await form.wait_for(state="hidden")
            await panel.get_by_role("button",name="Tutup rincian",exact=True).click()
            await phone.get_by_role("button",name="Filter",exact=False).first.click()
            await phone.get_by_label("Tampilkan",exact=True).select_option("reports")
            await phone.get_by_role("button",name="Lihat hasil",exact=True).click()
            assert await phone.evaluate("document.documentElement.scrollWidth <= innerWidth")
            await phone.screenshot(path=str(OUT/"recovery-filtered-320.png"))
            results["small_phone_keyboard_escape_filter_and_no_overflow"]=True
            guest=await browser.new_context(viewport={"width":390,"height":844})
            await guest.route("https://evidence-fixture.public.blob.vercel-storage.com/bukti-lapangan/**",lambda route:route.fulfill(status=200,body=image,content_type="image/jpeg"))
            public_page=await guest.new_page()
            await public_page.goto(BASE+"/?tab=recovery&report="+report_id,wait_until="domcontentloaded")
            await public_page.get_by_role("complementary",name="Rincian laporan warga",exact=True).get_by_text("Anonim",exact=True).wait_for()
            assert not (await public_page.request.get(BASE+"/api/v1/auth/me/activity?type=posts")).ok
            results["guest_can_view_reports_but_not_owner_history"]=True
            results["browser_errors"]=errors
            assert not errors,errors
            await browser.close()
    finally:
        env_file.write_text(env_file.read_text().replace("API_UPSTREAM_URL=http://localhost:5002/api/v1", "API_UPSTREAM_URL=http://localhost:5000/api/v1"))
        (OUT/"browser-results.json").write_text(json.dumps(results,indent=2)+"\n")
    print(json.dumps(results))
if __name__=="__main__":asyncio.run(main(sys.argv[1]))
