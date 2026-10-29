# Check error recovery, keyboard access, cached pages and home integration.
import asyncio,importlib.util,json
from pathlib import Path
spec=importlib.util.spec_from_file_location("paging",Path(__file__).with_name("forum-pagination.browser.py"));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
async def main():
 results={}
 async with m.async_playwright() as p:
  browser=await p.chromium.launch();context,page,requests,errors=await m.fixture(browser,fail_page=1)
  await m.expect(page.get_by_role("button",name="Coba lagi",exact=True)).to_be_visible();await page.get_by_role("button",name="Coba lagi",exact=True).click();await m.expect(page.locator(m.CARDS)).to_have_count(25);assert requests==[1,1]
  await page.get_by_role("button",name="Load more",exact=True).focus();await page.keyboard.press("Enter");await m.expect(page.locator(m.CARDS)).to_have_count(50)
  assert await page.evaluate("document.activeElement.closest('article')?.getAttribute('aria-label')")=="Catatan dari warga_26"
  results["first_page_retry_and_keyboard_new_card_focus"]=True
  for width in [320,768,1440]:
   await page.set_viewport_size({"width":width,"height":1000});await page.locator(m.MARKER).scroll_into_view_if_needed();await m.settle(page)
   value=await page.locator(m.CARDS).evaluate_all("els=>{const r=els.map(el=>el.getBoundingClientRect());return {overflow:document.documentElement.scrollWidth>innerWidth,overlap:r.some((a,i)=>r.slice(i+1).some(b=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1))}}");assert not any(value.values()),value
   await page.screenshot(path=str(m.OUT/f"layout-{width}.png"))
  results["320_768_1440_no_overlap_overflow"]=True
  await page.goto(m.BASE+"/",wait_until="domcontentloaded");await page.get_by_text("Petak pemulihan 1",exact=True).wait_for();await page.wait_for_timeout(500)
  assert requests==[1,1,2,1,2],requests
  results["homepage_latest_preview_and_previous_50_record_coverage_preserved"]=True;assert not errors,errors
  await context.close()
  context,page,requests,errors=await m.fixture(browser,mobile=True);cdp=await context.new_cdp_session(page)
  await page.set_viewport_size({"width":320,"height":740});await m.near_end(page);await m.swipe(cdp,page,x1=150,y1=600,x2=150,y2=400)
  await m.expect(page.get_by_text("Gulir sekali lagi untuk memuat posting.",exact=True)).to_be_visible()
  await page.evaluate("scrollTo(0,0)");await m.settle(page);await m.near_end(page);await m.expect(page.get_by_text("Gulir 2 kali untuk memuat posting.",exact=True)).to_be_visible()
  button=page.get_by_role("button",name="Load more",exact=True);await button.focus();await page.keyboard.press("Enter");await m.expect(page.locator(m.CARDS)).to_have_count(50)
  assert await page.evaluate("document.documentElement.scrollWidth<=innerWidth")
  results["mobile_320_reset_after_leaving_end_keyboard_alternative"]=True;assert not errors,errors
  await context.close()
  context=await browser.new_context(viewport={"width":1440,"height":1000});await context.add_init_script('localStorage.setItem("buktipulih_forum_posts_v1",'+json.dumps(json.dumps(m.POSTS[:60]))+')');calls=[]
  async def cached_route(route):
   params=m.parse_qs(m.urlparse(route.request.url).query);n=int(params["page"][0]);calls.append(n)
   await route.fulfill(json={"data":{"items":m.POSTS[(n-1)*25:n*25],"pagination":{"page":n,"total_pages":4}}})
  await context.route("**/api/v1/forum/posts?*",cached_route);page=await context.new_page();await page.goto(m.BASE+"/?tab=forum",wait_until="domcontentloaded");await m.expect(page.locator(m.CARDS)).to_have_count(25)
  await page.get_by_role("button",name="Load more",exact=True).click();await m.expect(page.locator(m.CARDS)).to_have_count(50);assert calls==[1,2]
  await context.close();results["older_cache_does_not_skip_pages"]=True;await browser.close()
 (m.OUT/"browser-extra-results.json").write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
if __name__=="__main__":asyncio.run(main())
