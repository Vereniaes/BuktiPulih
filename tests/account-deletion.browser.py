# Verify real account actions and preserved discussions on disposable accounts.
import asyncio,json,os,socket,signal
from pathlib import Path
from urllib.parse import urlsplit
from playwright.async_api import async_playwright,expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'knowledge/account-deletion-2026-10-29'
BASE='http://localhost:3001'
NODE='/home/vereniaes/.nvm/versions/node/v24.22.0/bin/node'

async def main():
    with socket.socket() as check:
        assert check.connect_ex(('127.0.0.1',5002))!=0,'Fixture port is in use.'
    env=os.environ.copy();env['NODE_ENV']='test';env['PATH']=str(Path(NODE).parent)+':'+env['PATH']
    process=await asyncio.create_subprocess_exec(NODE,'--import','tsx','tests/email-auth.browser-server.ts','--account-deletion',cwd=ROOT.parent/'bukti-pulih-be',env=env,stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.STDOUT)
    folder=None;reports=[];errors=[];videos=[]
    try:
        for _ in range(20):
            line=await asyncio.wait_for(process.stdout.readline(),20)
            if line.startswith(b'{'):
                state=json.loads(line)
                if state.get('port')==5002:folder=Path(state['folder']);break
        assert folder and folder.parent==Path('/tmp') and folder.name.startswith('buktipulih_auth_browser_test_')
        fixtures=json.loads((folder/'account-fixtures.json').read_text())
        async with async_playwright() as p:
            browser=await p.chromium.launch()
            # Check the real Next proxy without a session; this cannot delete any local user.
            api=await p.request.new_context()
            response=await api.delete(BASE+'/api/v1/auth/me',headers={'Origin':BASE},data={'password':'UnauthenticatedFixture'})
            assert response.status==401,(response.status,await response.text())
            response=await api.delete(BASE+'/api/v1/auth/me',headers={'Origin':'https://attacker.test'},data={'password':'UnauthenticatedFixture'})
            assert response.status==403
            response=await api.delete(BASE+'/api/v1/forum/posts',headers={'Origin':BASE},data={})
            assert response.status==404
            await api.dispose()
            for item in fixtures:
                width=item['width'];height=1000 if width==1440 else 844
                options={'viewport':{'width':width,'height':height}}
                if width in [1440,390]:options.update(record_video_dir=str(OUT/'recordings'),record_video_size={'width':width,'height':height})
                context=await browser.new_context(**options)
                await context.add_cookies([{'name':'bp_session','value':item['token'],'url':BASE,'httpOnly':True,'sameSite':'Lax'}])
                writes=[]
                async def relay(route):
                    req=route.request;url=urlsplit(req.url)
                    if req.method not in ['GET','HEAD']:writes.append({'method':req.method,'path':url.path})
                    response=await route.fetch(url='http://127.0.0.1:5002'+url.path+('?' + url.query if url.query else ''))
                    await route.fulfill(response=response)
                await context.route('**/api/v1/auth/**',relay)
                await context.route('**/api/v1/forum/**',relay)
                page=await context.new_page();page.set_default_timeout(15000)
                page.on('pageerror',lambda e:errors.append(str(e)))
                await page.goto(BASE+'/profile',wait_until='domcontentloaded')
                await expect(page.get_by_label('Username',exact=True)).to_have_value(item['username'])
                await page.get_by_text('Riwayat interaksi',exact=True).wait_for()
                logout=page.get_by_role('button',name='Keluar',exact=True)
                trigger=page.get_by_role('button',name='Hapus akun',exact=True)
                await logout.scroll_into_view_if_needed();await page.wait_for_timeout(350)
                await page.add_style_tag(content='nextjs-portal{display:none!important}')
                geometry=await logout.evaluate("e=>({y:e.getBoundingClientRect().y+scrollY,color:getComputedStyle(e).color,background:getComputedStyle(e).backgroundColor,height:e.getBoundingClientRect().height,last:e.closest('main').lastElementChild.contains(e)})")
                history=await page.get_by_role('heading',name='Riwayat interaksi',exact=True).evaluate('e=>e.getBoundingClientRect().bottom+scrollY')
                assert geometry['y']>history and geometry['last'] and geometry['height']>=44,geometry
                assert geometry['background']=='rgb(180, 35, 24)',geometry
                assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
                await page.screenshot(path=str(OUT/f'profile-bottom-{width}.png'),full_page=True)
                if width==800:
                    await logout.click();await page.wait_for_url('**/?tab=forum')
                    assert any(w['path'].endswith('/logout') for w in writes)
                    assert not any(w['method']=='DELETE' for w in writes)
                    reports.append({'width':width,'logout_at_bottom':True,'red_logout':True,'logout_success':True})
                    await context.close();continue
                await trigger.click();dialog=page.get_by_role('dialog',name='Hapus akun?',exact=True)
                await expect(dialog).to_be_visible();await expect(dialog.get_by_label('Password',exact=True)).to_be_focused()
                await expect(dialog.get_by_role('button',name='Hapus akun',exact=True)).to_be_disabled()
                for _ in range(8):
                    await page.keyboard.press('Tab')
                    focus=await dialog.evaluate('e=>({inside:e.contains(document.activeElement),body:document.activeElement===document.body,focused:document.hasFocus(),tag:document.activeElement?.tagName,id:document.activeElement?.id,modal:e.matches(":modal")})')
                    assert focus['inside'] or (focus['body'] and not focus['focused']),focus
                await page.emulate_media(reduced_motion='reduce')
                assert await dialog.evaluate('e=>getComputedStyle(e).animationName')=='none'
                await page.emulate_media(reduced_motion='no-preference')
                if width==390:
                    await page.set_viewport_size({'width':width,'height':420})
                    await dialog.get_by_role('button',name='Batal',exact=True).scroll_into_view_if_needed()
                    box=await dialog.bounding_box()
                    assert box['y']>=0 and box['y']+box['height']<=421,box
                    await page.set_viewport_size({'width':width,'height':height})

                await page.keyboard.press('Escape');await expect(dialog).not_to_be_visible();await expect(trigger).to_be_focused()
                assert not writes
                await trigger.click();await dialog.get_by_label('Password',exact=True).fill('CancelFixture#2026')
                await dialog.get_by_role('button',name='Batal',exact=True).click()
                assert not writes
                await trigger.click();await expect(dialog.get_by_label('Password',exact=True)).to_have_value('')
                await dialog.get_by_label('Password',exact=True).fill('WrongBrowser#2026')
                await dialog.get_by_role('button',name='Hapus akun',exact=True).click()
                await expect(dialog.get_by_role('alert')).to_have_text('Password tidak sesuai.')
                await expect(dialog).to_be_visible();await expect(page.get_by_label('Username',exact=True)).to_have_value(item['username'])
                await dialog.get_by_label('Password',exact=True).fill(item['password'])
                await expect(dialog.get_by_role('alert')).to_have_count(0)
                await page.wait_for_timeout(250)
                assert not await dialog.evaluate('e=>e.scrollWidth>e.clientWidth')
                await page.screenshot(path=str(OUT/f'confirmation-{width}.png'))
                second=None
                if width==1440:
                    second=await context.new_page();await second.goto(BASE+'/profile',wait_until='domcontentloaded')
                    await expect(second.get_by_label('Username',exact=True)).to_have_value(item['username'])
                    await page.bring_to_front()
                # Hold the fixture response briefly to inspect the pending state and block duplicate submission.
                async def hold_delete(route):
                    if route.request.method=='DELETE':await asyncio.sleep(.6)
                    await route.fallback()
                await page.route('**/api/v1/auth/me',hold_delete)
                await dialog.get_by_role('button',name='Hapus akun',exact=True).click()
                await expect(dialog.get_by_role('button',name='Menghapus…',exact=True)).to_be_disabled()
                await page.keyboard.press('Escape');await expect(dialog).to_be_visible()
                await page.wait_for_url('**/?tab=forum')
                assert len([w for w in writes if w['method']=='DELETE'])==2,writes
                if second:
                    await expect(second.get_by_role('heading',name='Masuk untuk membuka profil',exact=True)).to_be_visible()
                    await second.close()
                await page.locator(f'a[href="/forum/{item["postId"]}"]:visible').first.wait_for()
                author=page.locator('article',has=page.locator(f'a[href="/forum/{item["postId"]}"]')).first
                await expect(author.get_by_text('Deleted Account',exact=True)).to_be_visible()
                assert item['username'] not in await page.locator('body').inner_text()
                await page.goto(BASE+'/forum/'+item['postId'],wait_until='domcontentloaded')
                await page.get_by_role('heading',name=f'Hutan uji {width}',exact=True).wait_for()
                await expect(page.get_by_text('Deleted Account',exact=True).first).to_be_visible()
                await page.get_by_text('Komentar uji tetap tersimpan.',exact=True).wait_for()
                await page.get_by_role('button',name='Lihat balasan (1)',exact=True).click()
                await page.get_by_text('Balasan uji tetap tersimpan.',exact=True).wait_for()
                assert await page.get_by_text('Deleted Account',exact=True).count()==3
                await expect(page.get_by_text('@AkunLain',exact=True)).to_be_visible()
                await expect(page.get_by_text('Login/Register dulu baru bisa komentar',exact=True)).to_be_visible()
                assert item['username'] not in await page.locator('body').inner_text()
                assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
                await page.add_style_tag(content='nextjs-portal{display:none!important}')
                await page.screenshot(path=str(OUT/f'deleted-discussion-{width}.png'),full_page=True)
                reports.append({'width':width,'logout_at_bottom':True,'red_logout':True,'cancel_and_escape_no_request':True,'password_required':True,'focus_trap_and_reduced_motion':True,'short_viewport_checked':width==390,'wrong_password_preserves_session':True,'pending_blocks_escape_and_repeat':True,'account_deleted':True,'all_tabs_signed_out':True if second else None,'post_comment_reply_preserved':True,'other_author_unchanged':True,'no_old_username_or_overflow':True,'anonymous_post_checked':width==320})
                if page.video:videos.append(str(await page.video.path()))
                await context.close()
                print(f'PASS {width}px: bottom actions, password dialog and preserved Deleted Account discussion',flush=True)
            await browser.close()
        assert not errors,errors
        (OUT/'browser-report.json').write_text(json.dumps({'checks':reports,'javascript_errors':errors,'real_user_deleted':False,'production_changed':False,'proxy_allowlist_checked':True,'videos':videos},indent=2)+'\n')
    finally:
        if process.returncode is None:
            process.send_signal(signal.SIGTERM);await asyncio.wait_for(process.wait(),20)
        assert not folder or not folder.exists(),'Fixture cleanup failed.'

asyncio.run(main())
