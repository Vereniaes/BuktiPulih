# Todo:
# -> check paged rendering, filters and two separate touch swipes

# --- Forum pagination checks ---
import asyncio,json
from datetime import datetime,timedelta,timezone
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.async_api import async_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/"knowledge/forum-pagination-2026-10-28";BASE="http://localhost:3001"
POSTS=[{"id":f"{i+1:024x}","author":{"username":f"warga_{i+1}","city":"Pontianak","age":30},"location_name":f"Petak pemulihan {i+1}","region_key":"kalbar" if i%2==0 else "kalteng","caption":"Pemantauan bibit di lahan pemulihan. "+("Temuan terakhir unik." if i==89 else "Tanah tetap lembap."),"created_at":(datetime(2026,10,28,tzinfo=timezone.utc)-timedelta(minutes=i)).isoformat().replace("+00:00","Z"),"time_ago":"","media":{"type":"image","url":"/hero-peat-seedling.jpg","aspect_ratio":"landscape"},"metrics":{"likes":i,"comments_count":i,"views":i,"user_has_liked":False},"comments":[],"persisted":True} for i in range(90)]
CARDS='section[aria-labelledby="forum-pulih-title"] article';MARKER='section[aria-labelledby="forum-pulih-title"] [class*="pagination"]'
async def fixture(browser,mobile=False,fail_page=None):
    context=await browser.new_context(viewport={"width":390 if mobile else 1440,"height":844 if mobile else 1000},is_mobile=mobile,has_touch=mobile,device_scale_factor=1)
    requests=[];errors=[];failed=False
    async def respond(route):
        nonlocal failed
        params=parse_qs(urlparse(route.request.url).query);number=int(params.get("page",[1])[0]);limit=int(params.get("limit",[0])[0]);requests.append(number);assert limit==25
        if number==fail_page and not failed:
            failed=True;await route.fulfill(status=503,json={"error":{"message":"Test offline"}});return
        if number>1:await asyncio.sleep(.15)
        await route.fulfill(json={"data":{"items":POSTS[(number-1)*limit:number*limit],"pagination":{"page":number,"total_pages":4},"legacy_comment_counts":{}}})
    await context.route("**/api/v1/forum/posts?*",respond)
    await context.route("**/api/v1/auth/me",lambda r:r.fulfill(status=401,json={"error":{"message":"Guest"}}))
    page=await context.new_page();page.on("pageerror",lambda e:errors.append(str(e)));page.set_default_timeout(12000)
    await page.goto(BASE+"/?tab=forum",wait_until="domcontentloaded")
    if fail_page!=1:await expect(page.locator(CARDS)).to_have_count(25)
    return context,page,requests,errors
async def settle(page):await page.wait_for_timeout(250)
async def near_end(page):
    for _ in range(4):
        await page.locator(MARKER).evaluate("el=>window.scrollBy(0,el.getBoundingClientRect().top-innerHeight+300)");await settle(page)
async def swipe(cdp,page,x1=190,y1=680,x2=190,y2=440):
    await cdp.send("Input.dispatchTouchEvent",{"type":"touchStart","touchPoints":[{"x":x1,"y":y1}]})
    for step in range(1,9):
        await cdp.send("Input.dispatchTouchEvent",{"type":"touchMove","touchPoints":[{"x":x1+(x2-x1)*step/8,"y":y1+(y2-y1)*step/8}]});await page.wait_for_timeout(25)
    await cdp.send("Input.dispatchTouchEvent",{"type":"touchEnd","touchPoints":[]});await settle(page)
async def main():
    results={};all_errors=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch()
        context,page,requests,errors=await fixture(browser)
        await settle(page);assert requests==[1],requests
        first_ids=await page.locator(CARDS+" a[class*='readMore']").evaluate_all("nodes=>nodes.map(n=>n.pathname)")
        await page.locator(CARDS).first.get_by_role("button",name="Sukai catatan oleh warga_1",exact=True).click()
        for expected in [50,75,100,101]:
            button=page.get_by_role("button",name="Load more",exact=True);await button.scroll_into_view_if_needed();before=await page.evaluate("scrollY")
            await button.click();await expect(page.locator(CARDS)).to_have_count(expected);await settle(page)
            assert abs(await page.evaluate("scrollY")-before)<3,(expected,before,await page.evaluate("scrollY"))
            links=await page.locator(CARDS+" a[class*='readMore']").evaluate_all("nodes=>nodes.map(n=>n.pathname)")
            assert len(links)==len(set(links));assert links[:25]==first_ids
            if expected==50:
                await page.locator(MARKER).scroll_into_view_if_needed();await page.screenshot(path=str(OUT/"desktop-load-more.png"))
        assert requests==[1,2,3,4],requests
        await expect(page.get_by_role("button",name="Load more",exact=True)).to_have_count(0)
        await expect(page.locator(CARDS).first.get_by_role("button",name="Sukai catatan oleh warga_1",exact=True)).to_have_attribute("aria-pressed","true")
        await expect(page.locator(CARDS).first.get_by_text("0 Dilihat",exact=True)).to_be_visible()
        await page.get_by_role("combobox",name="Urutan",exact=True).select_option("likes");await expect(page.locator(CARDS)).to_have_count(25)
        await expect(page.locator(CARDS).first).to_have_attribute("aria-label","Catatan dari Bang Dedi")
        await page.get_by_role("searchbox",name="Cari pemulihan",exact=True).fill("Temuan terakhir unik");await expect(page.locator(CARDS)).to_have_count(1)
        await expect(page.locator(CARDS).first).to_have_attribute("aria-label","Catatan dari warga_90")
        await page.get_by_role("searchbox",name="Cari pemulihan",exact=True).fill("tidak-adanya-hasil")
        await expect(page.get_by_text("Belum ada catatan yang cocok",exact=True)).to_be_visible()
        await page.get_by_role("button",name="Hapus filter",exact=True).click();await expect(page.locator(CARDS)).to_have_count(25)
        results["desktop_batches_no_duplicates_scroll_jump_likes_end_reset_Dilihat"]=True
        all_errors+=errors;await context.close()
        context,page,requests,errors=await fixture(browser)
        await page.get_by_role("searchbox",name="Cari pemulihan",exact=True).fill("Temuan terakhir unik");await expect(page.locator(CARDS)).to_have_count(1)
        await expect(page.locator(CARDS).first).to_have_attribute("aria-label","Catatan dari warga_90");assert requests==[1,2,3,4],requests
        await page.get_by_role("button",name="Hapus filter",exact=True).click();await expect(page.locator(CARDS)).to_have_count(25)
        await page.get_by_role("combobox",name="Cari wilayah",exact=True).fill("Kalimantan Tengah");await expect(page.locator(CARDS)).to_have_count(25)
        results["filter_finds_posts_after_50_and_resets_batch"]=True
        all_errors+=errors;await context.close()
        context,page,requests,errors=await fixture(browser,fail_page=2)
        await page.get_by_role("button",name="Load more",exact=True).click()
        await expect(page.get_by_text("Posting belum dapat dimuat.",exact=True)).to_be_visible();assert await page.locator(CARDS).count()==25
        await settle(page);assert requests==[1,2],requests
        await page.get_by_role("button",name="Coba lagi",exact=True).click();await expect(page.locator(CARDS)).to_have_count(50);assert requests==[1,2,2],requests
        results["failed_page_keeps_cards_retries_same_page"]=True
        all_errors+=errors;await context.close()
        context,page,requests,errors=await fixture(browser,mobile=True);cdp=await context.new_cdp_session(page)
        assert await page.evaluate("matchMedia('(pointer:coarse)').matches")
        await swipe(cdp,page);await swipe(cdp,page);assert requests==[1] and await page.locator(CARDS).count()==25
        await near_end(page);await expect(page.get_by_text("Gulir 2 kali untuk memuat posting.",exact=True)).to_be_visible()
        await swipe(cdp,page,x1=60,y1=400,x2=310,y2=390);assert requests==[1]
        await near_end(page);await swipe(cdp,page,y1=400,y2=600);assert requests==[1]
        await near_end(page);await swipe(cdp,page)
        await expect(page.get_by_text("Gulir sekali lagi untuk memuat posting.",exact=True)).to_be_visible()
        assert requests==[1] and await page.locator(CARDS).count()==25;await page.screenshot(path=str(OUT/"mobile-one-swipe.png"))
        before=await page.evaluate("scrollY")
        await swipe(cdp,page);await expect(page.locator(CARDS)).to_have_count(50);assert requests==[1,2],requests
        await settle(page)
        assert abs(await page.evaluate("scrollY")-before)<700
        assert await page.locator(CARDS).evaluate_all("nodes=>nodes.some(n=>{const r=n.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0})")
        await page.screenshot(path=str(OUT/"mobile-appended.png"))
        await near_end(page);await swipe(cdp,page);assert await page.locator(CARDS).count()==50
        await swipe(cdp,page);await expect(page.locator(CARDS)).to_have_count(75);assert requests==[1,2,3]
        assert await page.evaluate("document.documentElement.scrollWidth<=innerWidth")
        results["two_real_swipes_each_batch_no_far_horizontal_upward_programmatic_trigger"]=True
        all_errors+=errors;await context.close()
        context,page,requests,errors=await fixture(browser,mobile=True);cdp=await context.new_cdp_session(page)
        await near_end(page);await swipe(cdp,page,y1=720,y2=100);await page.wait_for_timeout(800)
        assert await page.locator(CARDS).count()==25 and requests==[1]
        await page.set_viewport_size({"width":1440,"height":1000});await page.get_by_role("button",name="Load more",exact=True).click();await expect(page.locator(CARDS)).to_have_count(50)
        results["one_long_swipe_inertia_does_not_load_resize_button_works"]=True
        all_errors+=errors;await context.close();await browser.close()
    assert not all_errors,all_errors;results["page_errors"]=all_errors
    (OUT/"browser-results.json").write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
if __name__=="__main__":asyncio.run(main())
# --- end of Forum pagination checks ---
