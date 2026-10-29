# Read-only check against the restored local backend.
from pathlib import Path
import asyncio,json
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
async def main():
    assert "API_UPSTREAM_URL=http://localhost:5000/api/v1" in (ROOT/".env.local").read_text()
    async with async_playwright() as p:
        browser=await p.chromium.launch()
        context=await browser.new_context(viewport={"width":390,"height":844},color_scheme="dark")
        await context.add_init_script("localStorage.setItem('buktipulih_theme','dark')")
        page=await context.new_page();page.set_default_timeout(15000)
        errors=[];page.on("pageerror",lambda e:errors.append(str(e)))
        await page.goto("http://localhost:3001/?tab=forum",wait_until="domcontentloaded")
        data=(await(await page.request.get("http://localhost:3001/api/v1/forum/posts?limit=50")).json())["data"]
        counts=data["legacy_comment_counts"]
        for post_id,count in counts.items():
            await page.wait_for_function("input=>Array.from(document.querySelectorAll('a')).find(a=>a.getAttribute('href')==='/forum/'+input.id+'#comments-section')?.querySelector('span')?.textContent.trim()===String(input.count)",arg={"id":post_id,"count":count})
        assert await page.evaluate("document.documentElement.dataset.theme")=="light"
        assert await page.evaluate("getComputedStyle(document.body).backgroundColor")=="rgb(246, 241, 231)"
        assert await page.get_by_role("button",name="Gelap",exact=True).count()==0
        await page.get_by_role("link",name="Baca catatan lengkap",exact=True).first.click()
        await page.get_by_role("heading",name="Diskusi",exact=True).wait_for()
        assert await page.evaluate("document.documentElement.dataset.theme")=="light"
        assert await page.get_by_role("button",name="Masuk untuk berkomentar",exact=True).count()==1
        assert not errors,errors
        result={"real_local_backend":True,"feed_counts_match_server":len(counts),"light_on_feed_and_direct_detail":True,"guest_comments_require_login":True,"page_errors":errors}
        (ROOT/"knowledge/forum-comments-2026-10-28/local-smoke.json").write_text(json.dumps(result,indent=2))
        print(json.dumps(result));await browser.close()
if __name__=="__main__":asyncio.run(main())
