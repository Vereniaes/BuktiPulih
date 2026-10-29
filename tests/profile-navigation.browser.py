# Check profile/menu/post arrival frames and cached navigation without account writes.
import asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright,expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'knowledge/profile-navigation-2026-10-29'
BASE=os.environ.get('QA_BASE_URL','http://localhost:3001').rstrip('/')
USER={'id':'a'*24,'username':'Rimba.Hijau','participation':'observer','avatar_url':None,'city':'','phone_number':None,'email':'navigation@example.test','role':'PUBLIC_GUEST','role_badge':'','assigned_plots':[],'created_at':'2026-10-29T00:00:00.000Z','session_context':'12345678-1234-4234-8234-123456789012'}
PROBE=r"""() => {
  window.navFrames=[];const start=performance.now();
  function frame(){
    const main=[...document.querySelectorAll('main')].find(e=>e.getClientRects().length);
    if(main){
      const animation=main.getAnimations().find(a=>a.animationName==='portal-page-enter');
      window.navFrames.push({url:location.pathname+location.search,heading:main.querySelector('h1')?.textContent,headerVisible:[...document.querySelectorAll('header.portal-header')].some(h=>h.getClientRects().length),opacity:+getComputedStyle(main).opacity,transform:getComputedStyle(main).transform,animationTime:animation?.currentTime ?? null});
    }
    if(performance.now()-start<3500)requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}"""

async def main():
    reports=[];errors=[];writes=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch()
        for width,height,mode in [(1440,1000,'no-preference'),(390,844,'no-preference'),(320,740,'no-preference'),(1440,1000,'reduce'),(390,844,'reduce')]:
            opts={'viewport':{'width':width,'height':height},'reduced_motion':mode}
            if width==1440 and mode=='no-preference':opts.update(record_video_dir=str(OUT),record_video_size={'width':1280,'height':900})
            context=await browser.new_context(**opts)
            page=await context.new_page();page.set_default_timeout(15000)
            page.on('pageerror',lambda e:errors.append({'message':str(e),'stack':e.stack,'width':width,'mode':mode,'url':page.url}))
            page.on('console',lambda m:errors.append({'message':m.text,'width':width,'mode':mode,'url':page.url}) if m.type=='error' and 'Encountered two children with the same key' in m.text else None)
            async def isolate(route):
                if route.request.method not in ['GET','HEAD','OPTIONS'] and '/__nextjs_' not in route.request.url:
                    writes.append(route.request.url);return await route.fulfill(status=400,json={'error':{'message':'Test write blocked'}})
                await route.continue_()
            async def account(route):
                if route.request.method!='GET':raise AssertionError('Unexpected account mutation')
                if '/activity' in route.request.url:return await route.fulfill(json={'data':{'items':[],'pagination':{'page':1,'limit':10,'total_items':0,'total_pages':0}}})
                await route.fulfill(json={'data':{'authenticated':True,'user':USER}})
            await page.route('**/*',isolate)
            await page.route('**/api/v1/auth/**',account)
            await page.goto(BASE+'/?tab=forum',wait_until='domcontentloaded')
            await page.locator('a[href^="/forum/"]:visible').first.wait_for()
            await page.wait_for_timeout(600)
            await page.add_style_tag(content='nextjs-portal{display:none!important}')
            async def menu():
                toggle=page.get_by_role('button',name='Buka navigasi',exact=True)
                if await toggle.is_visible():await toggle.click()
            async def profile():
                await menu();await page.get_by_role('link',name='Profil',exact=True).click()
                await page.wait_for_url('**/profile')
            async def tab(label,value):
                await menu();await page.get_by_role('button',name=label,exact=True).click()
                await page.wait_for_url('**/?tab='+value)
            async def capture_profile(label):
                await page.evaluate(PROBE)
                await profile()
                await expect(page.get_by_label('Username',exact=True)).to_have_value('Rimba.Hijau')
                await page.wait_for_timeout(380)
                all_frames=await page.evaluate('window.navFrames')
                assert all(f['headerVisible'] for f in all_frames),all_frames
                frames=[f for f in all_frames if f.get('heading')=='Profil']
                assert frames
                if mode=='reduce':assert all(f['opacity']==1 and f['animationTime'] is None for f in frames),frames
                else:
                    assert any(f['animationTime'] is not None and f['opacity']<.95 for f in frames),frames
                    assert frames[-1]['opacity']==1,frames[-3:]
                    animated=frames
                    assert all(a['opacity']<=b['opacity']+.001 for a,b in zip(animated,animated[1:])),animated
                assert all(f['transform']=='none' for f in frames)
                return {'kind':label,'frames':frames}
            samples=[await capture_profile('first profile arrival')]
            await page.screenshot(path=str(OUT/f'profile-{width}-{mode}.png'))
            await page.get_by_label('Kamu dari mana? (opsional)',exact=True).fill('Kota Draft')
            await tab('Ruang Suara Hijau','forum')
            await page.evaluate(PROBE)
            await profile()
            await expect(page.get_by_label('Kamu dari mana? (opsional)',exact=True)).to_have_value('Kota Draft')
            await page.wait_for_timeout(350)
            cached=[f for f in await page.evaluate('window.navFrames') if f.get('heading')=='Profil']
            assert all(f['opacity']==1 for f in cached) if mode=='reduce' else any(f['animationTime'] is not None and f['opacity']<.95 for f in cached),cached
            samples.append({'kind':'cached profile with draft preserved','frames':cached})
            await tab('Pemulihan','recovery')
            await page.locator('.leaflet-container:visible').first.wait_for()
            box=await page.locator('.leaflet-container:visible').first.bounding_box()
            assert box['height']>height*.6 and box['y']+box['height']<=height+1
            await page.wait_for_timeout(320)
            await profile()
            await page.go_back(wait_until='domcontentloaded')
            await page.wait_for_url('**/?tab=recovery')
            await page.wait_for_timeout(350)
            assert await page.locator('main:visible').evaluate('e=>getComputedStyle(e).opacity')=='1'
            await tab('Ruang Suara Hijau','forum')
            await page.wait_for_timeout(350)
            await page.locator('a[href^="/forum/"]:visible').first.click()
            await page.wait_for_url('**/forum/*')
            await expect(page.locator('main:visible')).to_have_css('opacity','1')
            await page.get_by_role('link',name='Kembali ke Ruang Suara Hijau',exact=True).click()
            await page.wait_for_url('**/?tab=forum')
            await page.wait_for_timeout(350)
            for cycle in range(2):
                await tab('Pemulihan','recovery')
                await page.locator('.leaflet-container:visible').first.wait_for()
                if cycle:
                    await page.wait_for_timeout(320)
                    await page.locator('.leaflet-control-zoom-in:visible').click()
                await page.wait_for_timeout(40)
                await profile()
                await tab('Ruang Suara Hijau','forum')
                await profile()
            await page.wait_for_timeout(600)
            assert await page.locator('main:visible').count()==1
            assert await page.locator('main:visible').evaluate('e=>getComputedStyle(e).opacity')=='1'
            assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
            reports.append({'width':width,'mode':mode,'profile_arrivals':samples,'draft_preserved':True,'map_size_preserved':True,'back_and_post_navigation':True,'rapid_navigation_and_zoom_exit':True})
            print(f'PASS {width}px {mode}: first frames, cached profile, draft, Back, maps and posts',flush=True)
            video=page.video
            await context.close()
            if video:await video.save_as(str(OUT/'profile-navigation-preview.webm'))
        await browser.close()
    (OUT/'browser-report.json').write_text(json.dumps({'checks':reports,'javascript_errors':errors,'writes':writes},indent=2)+'\n')
    assert not errors,errors
    assert not writes,writes

asyncio.run(main())
