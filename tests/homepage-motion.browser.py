"""Check real homepage animation, clipping, and reduced motion in Chromium."""
import asyncio, json, os
from pathlib import Path
from playwright.async_api import async_playwright, expect

BASE = os.environ.get("QA_BASE_URL", "http://localhost:3001").rstrip("/")
OUTPUT = Path(__file__).resolve().parents[1] / "knowledge/homepage-motion-2026-10-26"
OUTPUT.mkdir(parents=True, exist_ok=True)
PROBE = """() => {
  const photo = document.querySelector('.home-hero-photo');
  const rect = e => {const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height}};
  const state = s => {const e=document.querySelector(s);const c=getComputedStyle(e);return {opacity:+c.opacity,transform:c.transform}};
  return {
    photo:rect(photo), visual:rect(document.querySelector('.home-hero-visual')),
    transform:getComputedStyle(photo).transform,
    kicker:state('.home-hero-kicker'),title:state('.home-hero-title'),
    actions:state('.home-hero-actions'),about:state('[aria-labelledby="about-title"]'),
    scrollY,overflow:document.documentElement.scrollWidth>innerWidth
  };
}"""

async def main():
    results, errors, writes = [], [], []
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        for width,height in [(390,844),(901,1000),(1440,1000)]:
            for mode in ["no-preference","reduce"]:
                context = await browser.new_context(viewport={"width":width,"height":height},reduced_motion=mode,color_scheme="light")
                async def isolate(route):
                    if "/__nextjs_" in route.request.url:
                        return await route.continue_()
                    if route.request.method not in {"GET","HEAD","OPTIONS"}:
                        writes.append(route.request.url)
                        return await route.fulfill(status=204,body="")
                    await route.continue_()
                await context.route("**/*",isolate)
                await context.add_init_script("""(() => {
                  window.motionSamples=[];
                  let start;
                  function sample(now) {
                    const selectors=['.home-hero-kicker','.home-hero-title','.home-hero-actions'];
                    const elements=selectors.map(s=>document.querySelector(s));
                    if(elements.every(Boolean)) {
                      start ??= now;
                      window.motionSamples.push({t:now-start,opacity:elements.map(e=>+getComputedStyle(e).opacity)});
                      if(now-start>1500)return;
                    }
                    requestAnimationFrame(sample);
                  }
                  requestAnimationFrame(sample);
                })();""")
                page = await context.new_page()
                page.on("pageerror", lambda e: errors.append(str(e)))
                page.on("console", lambda m: errors.append(m.text) if m.type=="error" else None)
                await page.goto(BASE,wait_until="domcontentloaded")
                await page.add_style_tag(content="nextjs-portal{display:none!important}")
                await expect(page.locator(".home-hero-title")).to_be_visible()
                await page.locator(".home-hero-photo").evaluate("i=>i.decode()")
                await page.evaluate("document.fonts.ready")
                await page.wait_for_function("window.motionSamples?.at(-1)?.t>=1500")
                top = await page.evaluate(PROBE)
                samples = await page.evaluate("window.motionSamples")
                assert all(top[key]["opacity"]==1 for key in ["kicker","title","actions"]), top
                assert not top["overflow"], top
                target = await page.locator(".home-identity-hero").evaluate("e=>e.offsetTop+e.offsetHeight*.6")
                await page.evaluate("y=>window.scrollTo({top:y,behavior:'instant'})",target)
                await page.wait_for_timeout(900)
                scrolled = await page.evaluate(PROBE)
                assert not scrolled["overflow"], scrolled
                for state in [top,scrolled]:
                    photo,visual=state["photo"],state["visual"]
                    assert photo["top"]<=visual["top"]+1 and photo["bottom"]>=visual["bottom"]-1, state
                    assert photo["left"]<=visual["left"]+1 and photo["right"]>=visual["right"]-1, state
                if mode == "reduce":
                    assert top["transform"]==scrolled["transform"]=="none", (top,scrolled)
                    assert all(all(value==1 for value in sample["opacity"]) for sample in samples), samples[:5]
                else:
                    assert top["transform"]!=scrolled["transform"], (top,scrolled)
                    assert any(s["opacity"][0]>.03 and s["opacity"][1]<.01 for s in samples), samples[:10]
                    assert any(s["opacity"][1]>.03 and s["opacity"][2]<.01 for s in samples), samples[:10]
                await page.locator('[aria-labelledby="about-title"]').scroll_into_view_if_needed()
                await page.wait_for_timeout(700)
                about = (await page.evaluate(PROBE))["about"]
                assert about["opacity"]==1 and about["transform"]=="none", about
                await page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
                await page.wait_for_timeout(900)
                await page.screenshot(path=str(OUTPUT/f"{mode}-{width}.png"))
                await page.get_by_role("button",name="Kirim bukti dari lapangan").click()
                await expect(page.get_by_role("heading",name="Kirim Bukti Lapangan")).to_be_visible()
                await page.get_by_role("button",name="Tutup",exact=True).click()
                await page.get_by_role("button",name="Lihat peta pemulihan").click()
                await expect(page.locator('.portal-tabs [aria-current="page"]')).to_have_text("Pemulihan")
                await page.get_by_role("button",name="Beranda",exact=True).click()
                await page.wait_for_timeout(1200)
                await expect(page.locator(".home-hero-title")).to_have_css("opacity","1")
                results.append({"width":width,"mode":mode,"top":top,"scrolled":scrolled,"about":about,"entrance_samples":samples})
                print(f"PASS {width}px {mode}: entrance, parallax, coverage, About, actions, remount",flush=True)
                await context.close()
        assert not errors, errors
        assert not writes, writes
        (OUTPUT/"motion-checks.json").write_text(json.dumps({"checks":results,"javascript_errors":errors,"writes":writes},indent=2))
        await browser.close()

asyncio.run(main())
