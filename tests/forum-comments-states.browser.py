# Exercise recoverable discussion errors and the real feed-to-detail link.
import asyncio,json,sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"knowledge/forum-comments-2026-10-28"
BASE="http://localhost:3001"
async def main(folder):
    fixture=Path(folder);assert fixture.parent==Path("/tmp") and fixture.name.startswith("buktipulih_auth_browser_test_")
    actors=json.loads((fixture/"discussion-actors.json").read_text());env=ROOT/".env.local";results={};errors=[]
    assert "API_UPSTREAM_URL=http://localhost:5000/api/v1" in env.read_text()
    try:
        env.write_text(env.read_text().replace("API_UPSTREAM_URL=http://localhost:5000/api/v1","API_UPSTREAM_URL=http://localhost:5002/api/v1"))
        async with async_playwright() as p:
            browser=await p.chromium.launch();context=await browser.new_context(viewport={"width":390,"height":844})
            await context.add_cookies([{"name":"bp_session","value":actors["cookie"],"url":BASE}])
            image=(ROOT/"public/hero-peat-seedling.jpg").read_bytes()
            await context.route("https://evidence-fixture.public.blob.vercel-storage.com/bukti-lapangan/**",lambda route:route.fulfill(status=200,body=image,content_type="image/jpeg"))
            page=await context.new_page();page.set_default_timeout(15000);page.on("pageerror",lambda e:errors.append(str(e)))
            fail_read=True
            async def read_comments(route):
                nonlocal fail_read
                if route.request.method=="GET" and fail_read:
                    await route.fulfill(status=503,json={"error":{"code":"SERVICE_UNAVAILABLE","message":"Uji pembacaan terputus."}})
                else:await route.continue_()
            await page.route("**/api/v1/forum/posts/post-kb-011/comments?**",read_comments)
            await page.goto(BASE+"/forum/post-kb-011#comments-section",wait_until="domcontentloaded")
            await page.get_by_role("button",name="Kirim komentar",exact=True).wait_for()
            await page.get_by_text("Komentar belum dapat dimuat.",exact=True).wait_for()
            fail_read=False
            await page.get_by_role("button",name="Coba lagi",exact=True).click()
            root=page.locator("#comment-"+actors["root"]);await root.wait_for()
            results["read_error_has_working_retry"]=True
            fail_vote=True
            async def vote(route):
                nonlocal fail_vote
                if fail_vote:fail_vote=False;await route.fulfill(status=503,json={"error":{"code":"SERVICE_UNAVAILABLE","message":"Suara uji belum tersimpan."}})
                else:await route.continue_()
            await page.route("**/api/v1/forum/posts/post-kb-011/comments/*/vote",vote)
            up=root.get_by_role("button",name="Upvote komentar @rimba_rani",exact=True)
            original=await up.get_attribute("aria-pressed");score=await root.get_by_label("Skor komentar",exact=True).first.inner_text()
            await up.click();await page.get_by_text("Suara uji belum tersimpan.",exact=True).wait_for()
            assert await up.get_attribute("aria-pressed")==original
            assert await root.get_by_label("Skor komentar",exact=True).first.inner_text()==score
            await up.click();await page.wait_for_function("input=>document.querySelector('#comment-'+input.id+' button[aria-label=\"Upvote komentar @rimba_rani\"]').getAttribute('aria-pressed')===input.expected",arg={"id":actors["root"],"expected":"false" if original=="true" else "true"})
            results["failed_vote_keeps_score_then_retries"]=True
            await page.get_by_role("heading",name="Diskusi",exact=True).scroll_into_view_if_needed()
            await page.screenshot(path=str(OUT/"composer-390.png"))
            await page.goto(BASE+"/?tab=forum",wait_until="domcontentloaded");await page.wait_for_timeout(700)
            await page.get_by_role("link",name="Baca catatan lengkap",exact=True).first.click()
            await page.wait_for_url("**/forum/*")
            await page.get_by_role("heading",name="Diskusi",exact=True).wait_for()
            assert await page.get_by_placeholder("Nama / Username").count()==0
            results["feed_uses_one_authenticated_discussion_page"]=True
            await page.goto(BASE+"/forum/"+actors["post"],wait_until="domcontentloaded")
            await page.get_by_role("heading",name="Kanal pemulihan Ketapang",exact=True).wait_for()
            await page.get_by_text("Kalimantan Barat",exact=True).wait_for()
            await page.screenshot(path=str(OUT/"post-390.png"))
            await page.evaluate("localStorage.setItem('buktipulih_language','en')")
            await page.reload(wait_until="domcontentloaded")
            await page.get_by_role("heading",name="Discussion",exact=True).wait_for()
            await page.get_by_role("button",name="Post comment",exact=True).wait_for()
            assert await page.evaluate("document.documentElement.scrollWidth<=innerWidth")
            await page.emulate_media(color_scheme="dark")
            await page.evaluate("localStorage.setItem('buktipulih_theme','dark')")
            await page.reload(wait_until="domcontentloaded")
            await page.get_by_role("heading",name="Discussion",exact=True).wait_for()
            assert await page.evaluate("document.documentElement.dataset.theme")=="light"
            assert await page.evaluate("getComputedStyle(document.body).backgroundColor")=="rgb(246, 241, 231)"
            await page.get_by_role("heading",name="Discussion",exact=True).scroll_into_view_if_needed()
            await page.screenshot(path=str(OUT/"discussion-en-390.png"))
            results["english_and_light_only"]=True
            await browser.close()
        assert not errors,errors
        results["page_errors"]=errors
        (OUT/"browser-states-results.json").write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
    finally:env.write_text(env.read_text().replace("API_UPSTREAM_URL=http://localhost:5002/api/v1","API_UPSTREAM_URL=http://localhost:5000/api/v1"))
if __name__=="__main__":asyncio.run(main(sys.argv[1]))
