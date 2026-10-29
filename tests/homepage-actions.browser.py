"""Exercise homepage actions with slow navigation, failed media, and keyboard input."""
import asyncio, json, os, re
from pathlib import Path
from playwright.async_api import async_playwright, expect

BASE = os.environ.get("QA_BASE_URL", "http://localhost:3001").rstrip("/")
OUTPUT = Path(__file__).resolve().parents[1] / "knowledge/homepage-actions-2026-10-26"
OUTPUT.mkdir(parents=True, exist_ok=True)

async def main():
    errors, writes, checks = [], [], []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={"width":1440,"height":1000})
        gate = asyncio.Event()
        story_gate = asyncio.Event()
        slow_navigation, fail_media = True, True
        navigation_requests = []
        async def route_request(route):
            request = route.request
            if request.method not in {"GET","HEAD","OPTIONS"} and "/__nextjs_" not in request.url:
                writes.append(request.url)
                return await route.fulfill(status=204,body="")
            if fail_media and "/journal/pl-kalbar-001/m1.jpg" in request.url:
                return await route.fulfill(status=503,body="",headers={"Cache-Control":"no-store"})
            if "/forum/" in request.url and request.headers.get("rsc")=="1":
                await story_gate.wait()
            if slow_navigation and "tab=recovery" in request.url and request.headers.get("rsc")=="1":
                navigation_requests.append(request.url)
                await gate.wait()
            await route.continue_()
        await context.route("**/*",route_request)
        page = await context.new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type=="error" and "/journal/pl-kalbar-001/m1.jpg" not in m.location.get("url","") else None)
        await page.goto(BASE,wait_until="domcontentloaded")
        await page.add_style_tag(content="nextjs-portal{display:none!important}")
        await expect(page.locator(".home-hero-title")).to_have_css("opacity","1")
        button=page.locator(".home-hero-btn-primary")
        before=await button.bounding_box()
        await button.click()
        await expect(button).to_have_attribute("aria-busy","true")
        await expect(button.get_by_role("status")).to_contain_text("Membuka")
        await page.wait_for_timeout(180)
        during=await button.bounding_box()
        assert before["width"]==during["width"] and before["height"]==during["height"], (before,during)
        await button.click(force=True)
        await page.screenshot(path=str(OUTPUT/"pending-navigation.png"))
        gate.set()
        await expect(page).to_have_url(re.compile(r"[?&]tab=recovery(?:&|$)"))
        await expect(page.locator("main")).to_be_focused()
        assert await page.evaluate("scrollY")==0
        assert len(navigation_requests)==1,navigation_requests
        checks.append("slow navigation: real pending, stable button size, duplicate click ignored, destination focused")
        slow_navigation=False
        await page.get_by_role("button",name="Beranda",exact=True).click()
        opener=page.get_by_role("button",name="Kirim bukti dari lapangan",exact=True)
        await opener.click()
        dialog=page.get_by_role("dialog",name="Kirim Bukti Lapangan")
        await expect(dialog).to_be_visible()
        close=dialog.get_by_role("button",name="Tutup",exact=True)
        await expect(close).to_be_focused()
        assert await page.locator("main").evaluate("e=>e.inert")
        await page.keyboard.press("Shift+Tab")
        await expect(dialog.get_by_role("button",name="Warga / Lembaga",exact=False)).to_be_focused()
        await page.keyboard.press("Tab")
        await expect(close).to_be_focused()
        await page.screenshot(path=str(OUTPUT/"after-report-dialog.png"))
        await page.keyboard.press("Escape")
        await expect(dialog).to_have_count(0)
        await expect(opener).to_be_focused()
        assert not await page.locator("main").evaluate("e=>e.inert")
        assert await page.evaluate("document.body.style.overflow")==""
        await opener.click()
        await page.get_by_role("button",name="Anonim",exact=False).click()
        await expect(page.locator(".create-post-modal-card input").first).to_be_focused()
        await page.get_by_role("button",name="Tutup dialog",exact=True).click()
        checks.append("report chooser: focus trap, Escape, opener restoration, background inert, next-step focus")
        metric=page.get_by_role("button",name=re.compile("Area pemulihan dipantau"))
        await metric.scroll_into_view_if_needed()
        await metric.focus()
        await page.keyboard.press("Enter")
        await expect(page).to_have_url(re.compile(r"[?&]tab=recovery(?:&|$)"))
        assert await page.evaluate("scrollY")==0
        await page.get_by_role("button",name="Beranda",exact=True).click()
        evidence=page.get_by_role("button",name=re.compile("Bukti warga masuk"))
        await evidence.focus()
        await page.keyboard.press("Space")
        await expect(page).to_have_url(re.compile(r"[?&]tab=forum(?:&|$)"))
        await page.get_by_role("button",name="Beranda",exact=True).click()
        checks.append("metric cards: Enter and Space navigate to the matching feature")
        await page.locator("#latest-evidence-title").scroll_into_view_if_needed()
        retry=page.get_by_role("button",name="Coba lagi",exact=True)
        await expect(retry).to_be_visible()
        await page.screenshot(path=str(OUTPUT/"media-failed.png"))
        fail_media=False
        await retry.click()
        await expect(retry).to_have_count(0)
        await expect(page.locator('img[src="/journal/pl-kalbar-001/m1.jpg"]')).to_be_visible()
        await expect(page.locator('[data-state="failed"]')).to_have_count(0)
        checks.append("media: failed request shows retry and successful retry restores the photo")
        links=page.locator('[aria-labelledby="latest-evidence-title"] a[href^="/forum/"]')
        await expect(links).to_have_count(4)
        destinations=await links.evaluate_all("xs=>xs.map(e=>e.getAttribute('href'))")
        for destination in destinations:
            response=await context.request.get(BASE+destination)
            assert response.status==200,(destination,response.status)
        first=links.first
        target=await first.get_attribute("href")
        await first.click()
        await expect(first).to_contain_text("Membuka")
        story_gate.set()
        await expect(page).to_have_url(BASE+target)
        await page.go_back(wait_until="domcontentloaded")
        checks.append("stories: four permanent destinations respond and selected story opens directly")
        await page.evaluate("""async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=400){scrollTo({top:y,behavior:'instant'});await new Promise(r=>setTimeout(r,250))}scrollTo({top:0,behavior:'instant'});} """)
        await page.wait_for_timeout(800)
        await page.screenshot(path=str(OUTPUT/"after-desktop.png"),full_page=True)
        assert not errors,errors
        assert not writes,writes
        (OUTPUT/"actions-checks.json").write_text(json.dumps({"checks":checks,"errors":errors,"writes":writes},indent=2))
        print(json.dumps({"checks":checks,"errors":errors},indent=2))
        await context.close()
        await browser.close()

asyncio.run(main())
