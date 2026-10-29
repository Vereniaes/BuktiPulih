# Check real navigation, panel resizing and accessible dialog exits without account writes.
import asyncio, json, os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "knowledge/calendar-motion-2026-10-29"
BASE = os.environ.get("QA_BASE_URL", "http://localhost:3001").rstrip("/")

LAYOUT_PROBE = """async () => {
  const frames=[], start=performance.now();
  document.querySelector('[aria-label="Pilihan akun"] button:last-child').click();
  while(performance.now()-start<420){
    await new Promise(requestAnimationFrame);
    const dialog=document.querySelector('[role="dialog"]');
    frames.push({t:performance.now()-start,height:dialog.getBoundingClientRect().height,input:dialog.querySelector('input').getBoundingClientRect().height});
  }
  return frames;
}"""
PAGE_PROBE = """() => {
  window.pageFrames=[];
  const start=performance.now();
  function sample(){
    const main=[...document.querySelectorAll('main')].find(e=>e.getClientRects().length);
    if(main)window.pageFrames.push({url:location.pathname+location.search,opacity:+getComputedStyle(main).opacity,transform:getComputedStyle(main).transform});
    if(performance.now()-start<1600)requestAnimationFrame(sample);
  }
  requestAnimationFrame(sample);
}"""

async def main():
    OUT.mkdir(exist_ok=True)
    reports, errors, unexpected_writes = [], [], []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for width,height,mode in [(1440,1000,"no-preference"),(390,844,"no-preference"),(320,740,"no-preference"),(844,390,"no-preference"),(390,844,"reduce"),(1440,1000,"reduce")]:
            options = {"viewport":{"width":width,"height":height},"reduced_motion":mode,"color_scheme":"light"}
            if width == 1440 and mode == "no-preference":
                options.update(record_video_dir=str(OUT),record_video_size={"width":1280,"height":900})
            context = await browser.new_context(**options)
            page = await context.new_page()
            page.set_default_timeout(15000)
            page.on("pageerror",lambda e:errors.append(str(e)))
            page.on("console",lambda m:errors.append(m.text) if m.type=="error" and any(s in m.text.lower() for s in ["hydration","lazymotion","react does not recognize"]) else None)
            pending, started = asyncio.Event(), asyncio.Event()
            state = {"hold":False,"flow":None,"starts":0}
            async def protect(route):
                if route.request.method not in {"GET","HEAD","OPTIONS"} and "/__nextjs_" not in route.request.url:
                    unexpected_writes.append(route.request.url)
                    return await route.fulfill(status=400,json={"success":False,"error":{"message":"Blocked test write"}})
                await route.continue_()
            async def auth(route):
                endpoint = route.request.url.split("/auth/")[-1].split("?")[0]
                now = datetime.now(timezone.utc)
                data = {}
                if endpoint == "me":
                    return await route.fulfill(status=401,json={"success":False,"error":{"code":"UNAUTHORIZED","message":"Login diperlukan."}})
                if endpoint == "email/prepare": data = {"ready":True}
                elif endpoint == "email/start":
                    state["starts"] += 1
                    purpose = route.request.post_data_json["purpose"]
                    state["flow"] = {"purpose":purpose,"status":"pending","flow_id":"motion-test-flow","masked_email":"m***@example.test","server_time":now.isoformat(),"expires_at":(now+timedelta(minutes=10)).isoformat(),"resend_at":(now+timedelta(minutes=1)).isoformat()}
                    if state["hold"]:
                        started.set()
                        await pending.wait()
                    data = state["flow"]
                elif endpoint == "email/flow": data = state["flow"]
                elif endpoint == "email/cancel": data = {"cancelled":True}
                elif endpoint == "email/verify":
                    assert state["flow"]["purpose"] == "reset"
                    state["flow"] = {**state["flow"],"status":"reset_verified"}
                    data = {"reset_required":True,"flow":state["flow"]}
                elif endpoint == "email/reset-password": data = {"password_reset":True}
                else: raise AssertionError(endpoint)
                await route.fulfill(json={"success":True,"data":data})
            await context.route("**/*",protect)
            await context.route("**/api/v1/auth/**",auth)
            await page.goto(BASE+"/?tab=forum",wait_until="domcontentloaded")
            await page.locator('a[href^="/forum/"]:visible').first.wait_for()
            await page.wait_for_timeout(1000)
            await page.add_style_tag(content="nextjs-portal{display:none!important}")
            async def open_account():
                if not await page.get_by_role("button",name="Masuk",exact=True).is_visible():
                    await page.get_by_role("button",name="Buka navigasi",exact=True).click()
                await page.get_by_role("button",name="Masuk",exact=True).click()
                await expect(page.get_by_role("dialog")).to_be_visible()
                await page.wait_for_timeout(300)
            await open_account()
            assert await page.locator("#auth-email").evaluate("e=>e===document.activeElement")
            await page.get_by_label("Email",exact=True).fill("motion@example.test")
            before = (await page.get_by_role("dialog").bounding_box())["height"]
            frames = await page.evaluate(LAYOUT_PROBE)
            await expect(page.get_by_role("heading",name="Buat akun",exact=True)).to_be_visible()
            assert await page.get_by_label("Email",exact=True).input_value() == "motion@example.test"
            assert all(abs(f["input"]-48)<1 for f in frames), frames
            after = frames[-1]["height"]
            if mode == "no-preference" and after-before>4:
                assert any(before+1<f["height"]<after-1 for f in frames),frames
            if mode == "reduce":
                assert all(abs(f["height"]-after)<1 for f in frames),frames
                assert await page.get_by_role("dialog").evaluate("e=>getComputedStyle(e).transform") == "none"
            assert not await page.evaluate("document.documentElement.scrollWidth>innerWidth")
            await page.get_by_label("Buat password",exact=True).fill("Rimba#2")
            await page.get_by_label("Konfirmasi password",exact=True).fill("Rimba#2")
            await page.get_by_role("button",name="Daftar dan kirim kode",exact=True).click()
            await expect(page.get_by_role("dialog").get_by_role("alert")).to_have_text("Gunakan password 8-128 karakter tanpa spasi.")
            assert state["starts"] == 0
            await page.wait_for_timeout(300)
            await page.screenshot(path=str(OUT/f"register-{width}-{mode}.png"))
            close = page.get_by_role("button",name="Tutup dialog",exact=True)
            last = page.get_by_role("button",name="Lupa password?",exact=True)
            await last.focus()
            await page.keyboard.press("Tab")
            assert await close.evaluate("e=>e===document.activeElement")
            await page.keyboard.press("Shift+Tab")
            assert await last.evaluate("e=>e===document.activeElement")
            await page.keyboard.press("Escape")
            assert await page.evaluate("document.body.style.overflow") != "hidden"
            assert await page.evaluate("document.activeElement.matches('.portal-account, button[aria-label=\"Buka navigasi\"]')")
            await page.wait_for_function("!document.querySelector('[role=dialog]')")
            await open_account()
            await page.get_by_label("Buat password",exact=True).fill("Rimba#24")
            await page.get_by_label("Konfirmasi password",exact=True).fill("Rimba#24")
            await page.get_by_role("button",name="Daftar dan kirim kode",exact=True).click()
            await page.get_by_label("Kode email").wait_for()
            await expect(page.get_by_label("Kode email")).to_be_focused()
            await page.keyboard.press("Escape")
            await page.wait_for_function("!document.querySelector('[role=dialog]')")
            await open_account()
            await expect(page.get_by_label("Kode email")).to_be_visible()
            await page.get_by_role("button",name="Ubah data",exact=True).click()
            await page.get_by_label("Buat password",exact=True).wait_for()
            if width == 1440 and mode == "no-preference":
                await page.get_by_role("button",name="Lupa password?",exact=True).click()
                await page.get_by_role("button",name="Kirim kode pemulihan",exact=True).click()
                await page.get_by_label("Kode email").fill("12345678")
                await page.get_by_role("button",name="Verifikasi",exact=True).click()
                await page.get_by_role("heading",name="Password baru",exact=True).wait_for()
                await page.get_by_label("Buat password",exact=True).fill("Rimba#24")
                await page.get_by_label("Konfirmasi password",exact=True).fill("Rimba#24")
                await page.get_by_role("button",name="Simpan password",exact=True).click()
                await page.get_by_text("Password berhasil diubah. Masuk dengan password baru.",exact=True).wait_for()
                state["hold"] = True
                await page.get_by_label("Password",exact=True).fill("Rimba#24")
                await page.get_by_role("button",name="Masuk dan kirim kode",exact=True).click()
                await asyncio.wait_for(started.wait(),5)
                await page.keyboard.press("Escape")
                pending.set()
                await page.wait_for_timeout(450)
                assert not await page.get_by_role("dialog").count()
                assert await page.evaluate("sessionStorage.getItem('buktipulih_email_auth_flow_v1')") is None
                await open_account()
                await expect(page.get_by_label("Password",exact=True)).to_be_visible()
                await page.get_by_role("button",name="Tutup dialog",exact=True).click()
            else:
                await page.get_by_role("button",name="Tutup dialog",exact=True).click()
            await page.wait_for_function("!document.querySelector('[role=dialog]')")
            await page.evaluate(PAGE_PROBE)
            await page.locator('a[href^="/forum/"]:visible').first.click()
            await page.wait_for_url("**/forum/*")
            await expect(page.locator("main.portal-page-motion:visible")).to_have_css("opacity","1")
            await page.wait_for_timeout(150)
            page_frames = await page.evaluate("window.pageFrames || []")
            await page.evaluate(PAGE_PROBE)
            await page.get_by_role("link",name="Kembali ke Ruang Suara Hijau",exact=True).click()
            await page.wait_for_url("**/?tab=forum")
            await page.locator('a[href^="/forum/"]:visible').first.wait_for()
            await expect(page.locator("main:visible")).to_have_css("opacity","1")
            await page.wait_for_timeout(300)
            back_frames = await page.evaluate("window.pageFrames || []")
            if mode == "reduce": assert all(f["opacity"]==1 for f in back_frames)
            else: assert any(.6<=f["opacity"]<1 and f["url"]=="/?tab=forum" for f in back_frames), back_frames
            if mode == "reduce": assert all(f["opacity"]==1 for f in page_frames)
            else: assert any(.6<=f["opacity"]<1 and f["url"].startswith("/forum/") for f in page_frames),page_frames
            assert all(f["transform"]=="none" for f in page_frames)
            reports.append({"width":width,"height":height,"mode":mode,"layout_frames":frames,"post_frames":page_frames,"back_frames":back_frames,"starts":state["starts"],"focus_trap":True,"restored_flow":True})
            print(f"PASS {width}x{height} {mode}: resize, focus, code restore, post navigation",flush=True)
            video = page.video
            await context.close()
            if video: await video.save_as(str(OUT/"portal-motion-preview.webm"))
        await browser.close()
    assert not errors,errors
    assert not unexpected_writes,unexpected_writes
    (OUT/"browser-report.json").write_text(json.dumps({"checks":reports,"javascript_errors":errors,"unexpected_writes":unexpected_writes},indent=2)+"\n")

asyncio.run(main())
