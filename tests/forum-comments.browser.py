# Check real discussion APIs and responsive UI using the isolated captured-mail backend.
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "knowledge/forum-comments-2026-10-28"
BASE = "http://localhost:3001"

async def main(folder):
    fixture = Path(folder)
    assert fixture.parent == Path("/tmp") and fixture.name.startswith("buktipulih_auth_browser_test_")
    actors = json.loads((fixture / "discussion-actors.json").read_text())
    env = ROOT / ".env.local"
    before = env.read_text()
    assert "API_UPSTREAM_URL=http://localhost:5000/api/v1" in before
    results, errors = {}, []
    try:
        env.write_text(before.replace("API_UPSTREAM_URL=http://localhost:5000/api/v1", "API_UPSTREAM_URL=http://localhost:5002/api/v1"))
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            context = await browser.new_context(viewport={"width":1440,"height":1000})
            image = (ROOT / "public/hero-peat-seedling.jpg").read_bytes()
            await context.route("https://evidence-fixture.public.blob.vercel-storage.com/bukti-lapangan/**",lambda route:route.fulfill(status=200,body=image,content_type="image/jpeg"))
            page = await context.new_page(); page.set_default_timeout(20000)
            page.on("pageerror",lambda error:errors.append(str(error)))
            await page.goto(BASE+"/forum/post-kb-011#comments-section",wait_until="domcontentloaded")
            root = page.locator("#comment-"+actors["root"])
            await root.wait_for(); await page.wait_for_timeout(400)
            assert await page.get_by_placeholder("Nama Anda (opsional)").count()==0
            assert await page.get_by_text("Kader Terverifikasi",exact=True).count()==0
            await page.get_by_role("button",name="Masuk untuk berkomentar",exact=True).wait_for()
            await page.get_by_role("button",name="Upvote komentar @rimba_rani",exact=True).first.click()
            await page.get_by_role("heading",name="Masuk",exact=True).wait_for()
            await page.get_by_role("button",name="Tutup dialog",exact=True).click()
            results["guest_vote_and_comment_require_account"]=True
            await page.get_by_label("Tambahkan tanggapan...",exact=True).fill("Tanggapan setelah login: hasil pengukuran akan diperiksa kembali bersama warga.")
            await page.get_by_role("button",name="Masuk untuk berkomentar",exact=True).click()
            await page.get_by_role("button",name="Daftar",exact=True).click()
            run=len(json.loads((fixture/"deliveries.json").read_text()))
            email=f"discussion-browser-{run}@example.test"
            await page.get_by_label("Email",exact=True).fill(email)
            await page.get_by_label("Buat password",exact=True).fill("DiscussionBrowserPassword2026!")
            await page.get_by_label("Konfirmasi password",exact=True).fill("DiscussionBrowserPassword2026!")
            await page.get_by_role("button",name="Daftar dan kirim kode",exact=True).click()
            await page.get_by_label("Kode email").wait_for()
            deliveries=json.loads((fixture/"deliveries.json").read_text())
            code=next(item["code"] for item in reversed(deliveries) if item["email"]==email)
            await page.get_by_label("Kode email").fill(code)
            await page.get_by_role("button",name="Verifikasi",exact=True).click()
            await page.get_by_label("Username",exact=True).fill(f"hijau_sari_{run}")
            await page.get_by_role("combobox",name="Sebagai siapa?").select_option("volunteer")
            await page.get_by_role("button",name="Simpan dan lanjutkan").click()
            await page.get_by_role("button",name="Kirim komentar",exact=True).wait_for()
            assert "/forum/post-kb-011" in page.url
            assert "Tanggapan setelah login" in await page.get_by_label("Tambahkan tanggapan...",exact=True).input_value()
            await page.get_by_role("button",name="Kirim komentar",exact=True).click()
            await page.get_by_text("Komentar terkirim.",exact=True).wait_for()
            await page.get_by_role("article",name=f"@hijau_sari_{run}",exact=True).wait_for()
            results["password_otp_onboarding_returns_to_draft"]=True
            up=root.get_by_role("button",name="Upvote komentar @rimba_rani",exact=True)
            down=root.get_by_role("button",name="Downvote komentar @rimba_rani",exact=True)
            baseline_score=int(await root.get_by_label("Skor komentar",exact=True).first.inner_text())
            await up.click();await page.wait_for_function("id=>document.querySelector('#comment-'+id+' button[aria-label=\"Upvote komentar @rimba_rani\"]').getAttribute('aria-pressed')==='true'",arg=actors["root"])
            assert await root.get_by_label("Skor komentar",exact=True).first.inner_text()==str(baseline_score+1)
            await down.click(); await page.wait_for_timeout(200)
            assert await down.get_attribute("aria-pressed")=="true"
            assert await root.get_by_label("Skor komentar",exact=True).first.inner_text()==str(baseline_score-1)
            await down.click();await page.wait_for_timeout(200)
            assert await down.get_attribute("aria-pressed")=="false"
            await up.click();await page.wait_for_timeout(200)
            await page.reload(wait_until="domcontentloaded");await root.wait_for()
            await page.wait_for_function("id=>document.querySelector('#comment-'+id+' button[aria-label=\"Upvote komentar @rimba_rani\"]').getAttribute('aria-pressed')==='true'",arg=actors["root"])
            results["vote_switch_clear_and_refresh"]=True
            await root.get_by_role("button",name="Lihat balasan (12)",exact=True).click()
            await root.get_by_text("Terima kasih. Apakah pengukuran juga dilakukan di sisi hulu kanal?",exact=True).wait_for()
            await root.get_by_role("button",name="Muat balasan lainnya",exact=True).click()
            await root.get_by_text("Balasan lapangan 11: hasil pengukuran tambahan dicatat di pos pantau.",exact=True).wait_for()
            await root.get_by_role("button",name="Sembunyikan balasan",exact=True).first.click()
            assert not await root.get_by_text("Terima kasih. Apakah pengukuran juga dilakukan di sisi hulu kanal?",exact=True).is_visible()
            assert await root.get_by_text("Pintu air di kanal utama",exact=False).is_visible()
            await root.get_by_role("button",name="Lihat balasan (12)",exact=True).click()
            results["reply_pages_and_collapse_preserve_parent"]=True
            await root.get_by_role("button",name="Balas",exact=True).first.click()
            await page.get_by_label("Tulis balasan...",exact=True).fill("Balasan dari akun: sisi hulu juga diperiksa pada jadwal yang sama.")
            fail=True
            async def create(route):
                nonlocal fail
                if route.request.method=="POST" and fail:
                    fail=False; await route.fulfill(status=503,json={"error":{"code":"SERVICE_UNAVAILABLE","message":"Uji koneksi terputus."}})
                else: await route.continue_()
            await page.route("**/api/v1/forum/posts/post-kb-011/comments",create)
            await page.get_by_role("button",name="Kirim balasan",exact=True).click()
            await page.get_by_text("Uji koneksi terputus.",exact=True).wait_for()
            assert "Balasan dari akun" in await page.get_by_label("Tulis balasan...",exact=True).input_value()
            await page.get_by_role("button",name="Kirim balasan",exact=True).click()
            await page.get_by_text("Balasan terkirim.",exact=True).wait_for()
            await page.unroute("**/api/v1/forum/posts/post-kb-011/comments",create)
            await root.get_by_text("Balasan dari akun: sisi hulu juga diperiksa pada jadwal yang sama.",exact=True).wait_for()
            history=(await(await page.request.get(BASE+"/api/v1/auth/me/activity?type=comments")).json())["data"]["items"]
            assert any(item.get("parent_id")==actors["root"] for item in history)
            results["reply_retry_preserves_draft_and_account_history"]=True
            await page.get_by_role("combobox",name="Urutan komentar").select_option("new")
            await page.get_by_role("article",name=f"@hijau_sari_{run}",exact=True).first.wait_for()
            await page.get_by_role("combobox",name="Urutan komentar").select_option("top")
            await root.wait_for();await page.wait_for_timeout(300)
            await page.get_by_role("button",name="Muat komentar lainnya",exact=True).click()
            await page.get_by_text("Catatan pemantauan 11:",exact=False).wait_for()
            results["root_pagination_and_order"]=True
            await page.get_by_role("combobox",name="Urutan komentar").select_option("new")
            await page.wait_for_timeout(350)
            await page.get_by_role("combobox",name="Urutan komentar").select_option("top")
            await root.wait_for();await root.get_by_role("button",name="Lihat balasan (13)",exact=True).click()
            await root.get_by_text("Terima kasih. Apakah pengukuran juga dilakukan di sisi hulu kanal?",exact=True).wait_for()
            for depth in range(5):
                nested=root.get_by_role("button",name="Lihat balasan (1)",exact=True)
                await nested.first.wait_for(); await nested.first.click()
                await root.get_by_text(f"Pemantauan lanjutan {depth+1}:",exact=False).wait_for()
            await page.get_by_role("heading",name="Diskusi",exact=True).scroll_into_view_if_needed()
            await page.screenshot(path=str(OUT/"discussion-1440.png"))
            for width,height in [(390,844),(320,740),(768,1024),(640,390)]:
                await page.set_viewport_size({"width":width,"height":height})
                await root.scroll_into_view_if_needed();await page.wait_for_timeout(200)
                assert await page.evaluate("document.documentElement.scrollWidth <= innerWidth"),width
                targets=await root.locator('button').evaluate_all("nodes=>nodes.filter(n=>n.getBoundingClientRect().width>0).map(n=>({w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height}))")
                assert all(item["w"]>=43 and item["h"]>=43 for item in targets),(width,targets)
                if width in [390,320]: await page.screenshot(path=str(OUT/f"discussion-{width}.png"))
            results["nested_mobile_and_desktop_no_overflow_targets_44px"]=True
            await page.set_viewport_size({"width":1440,"height":1000})
            await page.goto(BASE+"/forum/"+actors["post"],wait_until="domcontentloaded")
            await page.get_by_role("heading",name="Kanal pemulihan Ketapang",exact=True).wait_for()
            await page.get_by_text("Warga anonim",exact=True).wait_for()
            await page.get_by_role("article",name="@alam_bayu",exact=True).wait_for()
            assert await page.get_by_text("Penulis posting",exact=True).count()==0
            await page.screenshot(path=str(OUT/"post-1440.png"))
            await page.get_by_role("link",name="Lihat di Peta Pemulihan",exact=True).click()
            await page.wait_for_url("**report="+actors["post"])
            await page.get_by_role("complementary",name="Rincian laporan warga",exact=True).get_by_text("Belum diverifikasi",exact=True).wait_for()
            results["anonymous_post_named_comments_and_map_link"]=True
            second=await browser.new_context(viewport={"width":390,"height":844})
            await second.add_cookies([{"name":"bp_session","value":actors["cookie"],"url":BASE}])
            phone=await second.new_page();phone.on("pageerror",lambda error:errors.append(str(error)))
            await phone.goto(BASE+"/forum/post-kb-011#comments-section",wait_until="domcontentloaded")
            await phone.get_by_role("button",name="Kirim komentar",exact=True).wait_for()
            root2=phone.locator("#comment-"+actors["root"]);await root2.wait_for()
            assert await root2.get_by_role("button",name="Upvote komentar @rimba_rani",exact=True).get_attribute("aria-pressed")=="false"
            results["viewer_vote_is_account_specific"]=True
            client=await second.new_cdp_session(phone);await client.send("Emulation.setCPUThrottlingRate",{"rate":6})
            await phone.get_by_label("Tambahkan tanggapan...",exact=True).fill("Komentar dari ponsel tetap terhubung dengan username akun.")
            await phone.get_by_role("button",name="Kirim komentar",exact=True).click()
            await phone.get_by_text("Komentar terkirim.",exact=True).wait_for()
            assert await phone.evaluate("document.documentElement.scrollWidth<=innerWidth")
            results["mobile_comment_cpu_6x"]=True
            await browser.close()
        assert not errors,errors
        results["page_errors"]=errors
        (OUT/"browser-results.json").write_text(json.dumps(results,indent=2))
        print(json.dumps(results,indent=2))
    finally:
        current=env.read_text()
        env.write_text(current.replace("API_UPSTREAM_URL=http://localhost:5002/api/v1","API_UPSTREAM_URL=http://localhost:5000/api/v1"))
if __name__=="__main__": asyncio.run(main(sys.argv[1]))
