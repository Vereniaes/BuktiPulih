"""Focused browser checks for homepage layout, language, and primary actions."""
import asyncio, json, os
from pathlib import Path
from playwright.async_api import async_playwright, expect

BASE = os.environ.get("QA_BASE_URL", "http://localhost:3001").rstrip("/")
PHASE = os.environ.get("QA_PHASE", "after").lower()
if PHASE not in {"before", "after"}:
    raise ValueError("QA_PHASE must be before or after")
OUTPUT = Path(__file__).resolve().parents[1] / "knowledge" / "homepage-photo-redesign-2026-10-26"
OUTPUT.mkdir(parents=True, exist_ok=True)

async def main():
    errors, failures, writes, checks = [], [], [], []
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(viewport={"width":1440,"height":1000}, color_scheme="light", reduced_motion="reduce")
            async def isolate(route):
                req = route.request
                if req.method not in {"GET","HEAD","OPTIONS"}:
                    writes.append({"method":req.method,"url":req.url})
                    return await route.fulfill(status=204, body="")
                await route.continue_()
            await context.route("**/*", isolate)
            page = await context.new_page()
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("requestfailed", lambda r: failures.append({"url":r.url,"error":r.failure}))
            await page.goto(BASE, wait_until="domcontentloaded")
            await page.add_style_tag(content="nextjs-portal { display: none !important; }")
            await expect(page.locator(".home-identity-hero")).to_be_visible()
            await expect(page.locator(".home-hero-title")).to_be_visible()
            await page.locator(".home-hero-photo").evaluate("i=>i.decode()")
            await page.evaluate("document.fonts.ready")

            async def viewport(w,h,language="ID"):
                await page.set_viewport_size({"width":w,"height":h})
                await page.evaluate("window.scrollTo(0,0)")
                await page.evaluate("document.fonts.ready")
                await page.wait_for_timeout(120)
                data = await page.evaluate("""() => {
                  const rect=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
                  const hero=rect('.home-identity-hero'), actions=rect('.home-hero-actions');
                  const about=rect('[aria-labelledby="about-title"]'), photo=document.querySelector('.home-hero-photo');
                  const controls=[...document.querySelectorAll('.portal-actions button,.logo-brand')].map(e=>e.getBoundingClientRect());
                  return {
                    viewport:innerWidth, scrollWidth:document.documentElement.scrollWidth,
                    hero, actions, about, visual:rect('.home-hero-visual'),
                    headerGap:hero.y-rect('.portal-header').bottom,
                    aboutActionsGap:about.y-actions.bottom,
                    aboutHeroOverlap:hero.bottom-about.y,
                    titleActionsGap:actions.y-rect('.home-hero-title').bottom,
                    ctaHeights:[...document.querySelectorAll('.home-hero-actions button')].map(e=>e.getBoundingClientRect().height),
                    headerControlsFit:controls.every(r=>r.x>=0&&r.right<=innerWidth),
                    photoLoaded:photo.complete&&photo.naturalWidth>0
                  };
                }""")
                checks.append({"kind":"viewport","language":language,**data})
                if PHASE == "after":
                    assert data["scrollWidth"]<=w, f"overflow at {w}: {data['scrollWidth']}"
                    assert all(x>=44 for x in data["ctaHeights"]), f"small CTA at {w}"
                    assert data["titleActionsGap"]>=16, f"title/action gap at {w}"
                    assert data["headerControlsFit"], f"header controls clipped at {w}"
                    assert abs(data["headerGap"])<=1, f"gap below header at {w}: {data['headerGap']}"
                    assert data["aboutActionsGap"]>=16, f"about covers actions at {w}: {data['aboutActionsGap']}"
                    assert 0<data["aboutHeroOverlap"]<=100, f"about overlap at {w}: {data['aboutHeroOverlap']}"
                    assert data["photoLoaded"], f"hero photo missing at {w}"
                    assert abs(data["visual"]["right"]-w)<=1, f"photo stops before viewport edge at {w}"
                await page.evaluate("window.scrollTo(0,0)")
                await page.screenshot(path=str(OUTPUT/f"{PHASE}-{language}-{w}x{h}.png"))
                if language == "ID" and w in {390,768}:
                    await page.locator(".home-identity-hero").screenshot(path=str(OUTPUT/f"{PHASE}-{language}-{w}x{h}-hero.png"))

            sizes=[(320,844),(390,844),(768,1024),(901,1000),(1024,1000),(1280,1000),(1440,1000),(1920,1080)]
            for w,h in sizes:
                await viewport(w,h)

            await expect(page.locator(".home-hero-title")).to_contain_text("Melihat")
            await page.get_by_role("button",name="Pilih bahasa").click()
            await expect(page.locator(".home-hero-title")).to_contain_text("Seeing")
            await expect(page.get_by_role("heading",name="About BuktiPulih")).to_be_visible()
            for w,h in sizes:
                await viewport(w,h,"EN")
            checks.append({"kind":"language","status":"ok","viewports":sizes})
            await page.get_by_role("button",name="Pilih bahasa").click()
            await page.get_by_role("button",name="Lihat peta pemulihan").click()
            await expect(page.locator('.portal-tabs [aria-current="page"]')).to_contain_text("Pemulihan")
            checks.append({"kind":"hero-recovery-navigation","status":"ok"})
            await page.get_by_role("button",name="Beranda",exact=True).click()
            await page.get_by_role("button",name="Kirim bukti dari lapangan").click()
            await expect(page.get_by_role("dialog")).to_be_visible()
            await expect(page.get_by_role("heading",name="Kirim Bukti Lapangan")).to_be_visible()
            await page.get_by_role("button",name="Tutup",exact=True).click()
            await expect(page.get_by_role("dialog")).to_have_count(0)
            checks.append({"kind":"hero-report-selector","status":"opened-and-closed"})
            labels=["Beranda","Karhutla","Pemulihan","Ruang Suara Hijau"]
            for label in labels:
                await page.get_by_role("button",name=label,exact=True).click()
                await expect(page.locator('.portal-tabs [aria-current="page"]')).to_have_text(label)
            checks.append({"kind":"top-navigation","tabs":labels})

            await page.set_viewport_size({"width":320,"height":844})
            await page.get_by_role("button",name="Ruang Suara Hijau",exact=True).click()
            await expect(page.locator('.portal-tabs [aria-current="page"]')).to_have_text("Ruang Suara Hijau")
            await page.get_by_role("button",name="Beranda",exact=True).click()
            await expect(page.locator('.portal-tabs [aria-current="page"]')).to_have_text("Beranda")
            checks.append({"kind":"mobile-tab-rail","width":320,"last_tab":"reachable","restored":"Beranda"})

            await page.get_by_role("button",name="Beranda",exact=True).click()
            await page.get_by_role("button",name="Masuk",exact=True).click()
            await expect(page.get_by_role("dialog")).to_be_visible()
            await expect(page.get_by_role("heading",name="Masuk Kader Terdaftar")).to_be_visible()
            await page.get_by_role("button",name="Tutup Dialog Masuk").click()
            await expect(page.get_by_role("dialog")).to_have_count(0)
            await page.locator('.portal-actions .btn-report-primary').click()
            await expect(page.get_by_role("heading",name="Kirim Bukti Lapangan")).to_be_visible()
            await page.get_by_role("button",name="Tutup",exact=True).click()
            await expect(page.get_by_role("dialog")).to_have_count(0)
            await page.get_by_role("button",name="Forum",exact=True).click()
            await page.get_by_role("button",name="BuktiPulih - Beranda",exact=True).click()
            await expect(page.locator('.portal-tabs [aria-current="page"]')).to_have_text("Beranda")
            checks.append({"kind":"header-actions","account":"opened-and-closed","report":"opened-and-closed","logo":"returns-home"})
            await page.evaluate("""async()=>{const step=Math.max(400,innerHeight*.75);for(let y=0;y<document.documentElement.scrollHeight;y+=step){scrollTo(0,y);await new Promise(r=>setTimeout(r,80))}scrollTo(0,0);await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))}""")
            for w,h in [(390,844),(1440,1000)]:
                await page.set_viewport_size({"width":w,"height":h})
                await page.evaluate("window.scrollTo(0,0)")
                await page.evaluate("document.fonts.ready")
                await page.wait_for_timeout(120)
                await page.screenshot(path=str(OUTPUT/f"{PHASE}-{w}x{h}-full.png"),full_page=True)
            imgs=await page.locator("img").evaluate_all("xs=>xs.filter(i=>new URL(i.src).origin===location.origin).map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0}))")
            broken=[i for i in imgs if not i["loaded"]]
            if PHASE=="after":
                assert not broken, f"broken local images: {broken}"
                assert not errors, f"page errors: {errors}"
            report={"phase":PHASE,"base_url":BASE,"checks":checks,"local_images":imgs,"broken_local_images":broken,"resource_failures":failures,"javascript_errors":errors,"intercepted_writes":writes}
            (OUTPUT/f"{PHASE}-checks.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
            print(json.dumps(report,indent=2))
            await context.close()
            await browser.close()
    except Exception as error:
        report={"phase":PHASE,"base_url":BASE,"checks":checks,"resource_failures":failures,"javascript_errors":errors,"intercepted_writes":writes,"exception":repr(error)}
        (OUTPUT/f"{PHASE}-checks.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
        print(json.dumps(report,indent=2))
        raise

asyncio.run(main())
