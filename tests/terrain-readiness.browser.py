# Todo:
# -> Reproduce missing close imagery and delayed terrain data.
# -> Verify camera controls, quality changes, and rapid renderer switches.

# --- Browser checks ---
import asyncio,json,time
from pathlib import Path
from playwright.async_api import async_playwright,expect
OUT=Path(__file__).resolve().parents[2]/'knowledge/google-maps-terrain-rain-2026-10-30/bug-terrain-loading'
API="const el=document.querySelector('[data-map-controls]');if(!el)return null;let f=el[Object.keys(el).find(k=>k.startsWith('__reactFiber$'))];while(f&&!f.memoizedProps?.api?.getView)f=f.return;const api=f?.memoizedProps?.api;if(!api)return null;"
READY='()=>{'+API+'return api.engine;}'

async def open_map(browser,width=1440):
    context=await browser.new_context(viewport={'width':width,'height':1000 if width>700 else 844},is_mobile=width<700,has_touch=width<700,device_scale_factor=2)
    await context.add_init_script("localStorage.setItem('buktipulih_map_quality','low')")
    page=await context.new_page();page.set_default_timeout(30000)
    await page.goto('http://localhost:3001/?tab=fire',wait_until='domcontentloaded')
    await page.wait_for_function('('+READY+')()==="google"',timeout=60000)
    await page.add_style_tag(content='nextjs-portal{display:none!important}')
    await page.wait_for_timeout(1500)
    return context,page

async def main():
    OUT.mkdir(parents=True,exist_ok=True);report={}
    async with async_playwright() as p:
        browser=await p.chromium.launch()
        try:
            context,page=await open_map(browser)
            errors=[];console_errors=[];active=set();maximum=0
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('console',lambda message:console_errors.append(message.text) if message.type=='error' and ('arcgisonline' in message.text or 'arcgisonline' in message.location.get('url','')) else None)
            def started(request):
                nonlocal maximum
                if 'World_Imagery/MapServer/' in request.url: active.add(request);maximum=max(maximum,len(active))
            def finished(request): active.discard(request)
            page.on('request',started);page.on('requestfinished',finished);page.on('requestfailed',finished)
            await page.evaluate('()=>{'+API+'api.moveTo([114.361,-2.336],21);}')
            await page.wait_for_timeout(500);start=time.monotonic()
            await page.get_by_role('button',name='Jelajah 3D',exact=True).click()
            await page.wait_for_function('('+READY+')()==="terrain"',timeout=15000)
            ready_ms=round((time.monotonic()-start)*1000)
            await page.wait_for_function('()=>{'+API+'return api.getView().zoom===19 && api.native.isSourceLoaded("imagery");}',timeout=45000)
            fallback=await page.evaluate('()=>{'+API+'const canvas=api.native.getCanvas();return {view:api.getView(),css:[canvas.clientWidth,canvas.clientHeight],canvas:[canvas.width,canvas.height],dem:api.native.isSourceLoaded("elevation")};}')
            await page.screenshot(path=str(OUT/'fallback-cold-basic-1440.png'))
            assert maximum<=4,maximum
            assert not console_errors,console_errors
            quality=page.get_by_role('combobox',name='Kualitas peta',exact=True)
            await quality.select_option('detail')
            await page.wait_for_timeout(500)
            detailed=await page.evaluate('()=>{'+API+'const c=api.native.getCanvas();return {pixels:c.width,css:c.clientWidth,view:api.getView()};}')
            assert detailed['pixels']==detailed['css']*2,detailed
            await quality.select_option('low');await page.wait_for_timeout(300)
            basic=await page.evaluate('()=>{'+API+'const c=api.native.getCanvas();return {pixels:c.width,css:c.clientWidth,view:api.getView()};}')
            assert basic['pixels']==basic['css'] and abs(basic['view']['zoom']-19)<.001,basic
            report['cold_fallback']={'ready_ms':ready_ms,'maximum_imagery_requests':maximum,'console_errors':console_errors,'state':fallback,'detailed':detailed,'basic':basic,'errors':errors}
            await context.close()

            context,page=await open_map(browser,390);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            delayed=[]
            async def delay_dem(route):
                delayed.append(route.request.url);await asyncio.sleep(30)
                try: await route.continue_()
                except Exception: pass
            await context.route('https://tiles.mapterhorn.com/**',delay_dem)
            await page.evaluate('()=>{'+API+'api.moveTo([114.361,-2.336],17);}')
            await page.wait_for_timeout(300);start=time.monotonic()
            await page.get_by_role('button',name='Jelajah 3D',exact=True).click();await page.wait_for_function('('+READY+')()==="terrain"',timeout=15000)
            ready_ms=round((time.monotonic()-start)*1000)
            await expect(page.get_by_role('button',name='Perbesar peta',exact=True)).to_be_enabled()
            await page.get_by_role('button',name='Perbesar peta',exact=True).click();await page.wait_for_timeout(600)
            early=await page.evaluate('()=>{'+API+'return {view:api.getView(),dem:api.native.isSourceLoaded("elevation")};}')
            assert not early['dem'] and early['view']['zoom']>17,early
            assert await page.get_by_text('Memuat peta…',exact=True).count()==0
            await page.screenshot(path=str(OUT/'dem-delayed-interactive-390.png'))
            await page.wait_for_function('()=>{'+API+'return api.native.isSourceLoaded("elevation");}',timeout=45000)
            after=await page.evaluate('()=>{'+API+'return {view:api.getView(),dem:api.native.isSourceLoaded("elevation")};}')
            report['delayed_dem']={'delay_seconds':30,'ready_ms':ready_ms,'requests':len(delayed),'early':early,'after':after,'errors':errors}
            await context.unroute_all(behavior='ignoreErrors');await context.close()

            context,page=await open_map(browser);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            await page.evaluate('()=>{'+API+'api.moveTo([114.361,-2.336],19);}')
            await page.wait_for_timeout(500)
            for label in ['Jelajah 3D','Peta','Jelajah 3D','Satelit','Jelajah 3D','Peta','Jelajah 3D']:
                await page.get_by_role('button',name=label,exact=True).click();await page.wait_for_timeout(120)
            await page.wait_for_function('('+READY+')()==="terrain"',timeout=15000)
            await expect(page.get_by_role('button',name='Perbesar peta',exact=True)).to_be_enabled()
            await page.wait_for_timeout(2500)
            final=await page.evaluate('()=>{'+API+'return {view:api.getView(),projection:api.project([114.361,-2.336]),canvases:document.querySelectorAll(".maplibregl-canvas").length};}')
            assert final['canvases']==1 and abs(final['view']['zoom']-19)<.001 and abs(final['view']['center'][0]-114.361)<.001,final
            assert not errors,errors
            await page.screenshot(path=str(OUT/'rapid-switch-final-1440.png'))
            report['rapid_switches']={'count':7,'state':final,'errors':errors}
            await context.close()
        finally: await browser.close()
    (OUT/'readiness-browser-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))

asyncio.run(main())
# --- end of Browser checks ---
