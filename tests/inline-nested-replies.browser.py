# Check nested discussions with sessions and writes confined to a temporary backend.
import asyncio,json,os,re,socket,sys
from pathlib import Path
from urllib.parse import urlsplit,parse_qs
from playwright.async_api import async_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'knowledge/inline-nested-replies-2026-10-29'
BASE='http://localhost:3001'
NODE='/home/vereniaes/.nvm/versions/node/v24.22.0/bin/node'
async def main():
    with socket.socket() as probe:assert probe.connect_ex(('127.0.0.1',5002))!=0
    env=os.environ.copy();env['PATH']=str(Path(NODE).parent)+':'+env['PATH']
    backend=ROOT.parent/'bukti-pulih-be'
    fixture=await asyncio.create_subprocess_exec(NODE,'--import','tsx','tests/email-auth.browser-server.ts',cwd=backend,env=env,stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.PIPE)
    folder=None;errors=[];checks=[];showcase=None
    try:
        start=json.loads((await asyncio.wait_for(fixture.stdout.readline(),25)).decode());folder=Path(start['folder'])
        assert folder.parent==Path('/tmp') and folder.name.startswith('buktipulih_auth_browser_test_')
        seed=await asyncio.create_subprocess_exec(NODE,'--import','tsx','tests/forum-comments.browser-seed.ts',str(folder),cwd=backend,env=env)
        assert await seed.wait()==0
        actors=json.loads((folder/'discussion-actors.json').read_text())
        async with async_playwright() as p:
            browser=await p.chromium.launch()
            for width,height in [(1440,1000),(390,844),(320,740),(800,450)]:
                context=await browser.new_context(viewport={'width':width,'height':height})
                await context.add_cookies([{'name':'bp_session','value':actors['cookie'],'domain':'localhost','path':'/','httpOnly':True,'sameSite':'Lax'}])
                writes=[];responses=[];fail_reply={'active':width==1440};slow={'active':False,'started':asyncio.Event(),'release':asyncio.Event()}
                async def api(route):
                    req=route.request;u=urlsplit(req.url)
                    if req.method=='POST' and u.path.endswith('/comments'):
                        writes.append(req.post_data_json)
                        if fail_reply['active']:
                            fail_reply['active']=False
                            return await route.fulfill(status=503,json={'error':{'code':'SERVICE_UNAVAILABLE','message':'Balasan uji belum tersimpan.'}})
                    response=await route.fetch(url='http://127.0.0.1:5002'+u.path+('?' +u.query if u.query else ''))
                    if req.method=='POST' and u.path.endswith('/comments') and response.ok:responses.append((await response.json())['data'])
                    if req.method=='GET' and u.path.endswith('/comments') and parse_qs(u.query).get('parent_id')==[actors['root']] and slow['active']:
                        slow['active']=False;slow['started'].set();await slow['release'].wait()
                    await route.fulfill(response=response)
                await context.route(re.compile(r'/api/v1/(auth|forum)/'),api)
                page=await context.new_page();page.set_default_timeout(20000);page.on('pageerror',lambda e:errors.append(str(e)))
                await page.goto(BASE+'/forum/post-kb-011#comments-section',wait_until='domcontentloaded')
                root=page.locator('#comment-'+actors['root']);await expect(root).to_be_visible()
                main=page.get_by_label('Tambahkan tanggapan...',exact=True)
                await main.fill('Draft komentar utama tetap tersimpan.')
                await root.get_by_role('button',name='Balas',exact=True).first.click()
                form=root.locator('#reply-composer-'+actors['root'])
                reply=form.get_by_label('Tulis balasan...',exact=True)
                await expect(reply).to_be_focused()
                await expect(main).to_have_value('Draft komentar utama tetap tersimpan.')
                await expect(root.get_by_text('Terima kasih. Apakah pengukuran juga dilakukan di sisi hulu kanal?',exact=True)).to_be_visible()
                positions=await form.evaluate('(f)=>({input:f.getBoundingClientRect().top,replies:document.getElementById("replies-"+f.id.slice(15)).getBoundingClientRect().bottom})')
                assert positions['input']>=positions['replies']-1
                await reply.fill('Draft balasan tetap pada komentar yang dipilih.')
                await page.get_by_role('combobox',name='Urutan komentar',exact=True).select_option('new')
                await expect(page.locator('#reply-composer-'+actors['root']).get_by_label('Tulis balasan...',exact=True)).to_have_value('Draft balasan tetap pada komentar yang dipilih.')
                await page.get_by_role('combobox',name='Urutan komentar',exact=True).select_option('top')
                form=page.locator('#reply-composer-'+actors['root'])
                await expect(form.get_by_label('Tulis balasan...',exact=True)).to_be_focused()
                await root.get_by_role('button',name='Muat balasan lainnya',exact=True).click()
                await expect(root.get_by_text('Balasan lapangan 11: hasil pengukuran tambahan dicatat di pos pantau.',exact=True)).to_be_visible()
                await expect(form.get_by_label('Tulis balasan...',exact=True)).to_have_value('Draft balasan tetap pada komentar yang dipilih.')
                await form.get_by_role('button',name='Batal membalas',exact=True).click()
                await expect(form).to_have_count(0)
                child=root.get_by_text('Terima kasih. Apakah pengukuran juga dilakukan di sisi hulu kanal?',exact=True).locator('xpath=ancestor::article[1]')
                child_id=(await child.get_attribute('id'))[8:]
                await child.get_by_role('button',name='Balas',exact=True).first.click()
                nested=page.locator('#reply-composer-'+child_id)
                await expect(nested.get_by_label('Tulis balasan...',exact=True)).to_be_focused()
                await expect(child.get_by_text('Pemantauan lanjutan 1:',exact=False)).to_be_visible()
                content=f'Balasan bertingkat uji {width}: pengukuran hulu sudah dicatat.'
                await nested.get_by_label('Tulis balasan...',exact=True).fill(content)
                await nested.get_by_role('button',name='Kirim balasan',exact=True).click()
                if width==1440:
                    await expect(nested.get_by_role('alert')).to_contain_text('Balasan uji belum tersimpan.')
                    await expect(nested.get_by_label('Tulis balasan...',exact=True)).to_have_value(content)
                    await nested.get_by_role('button',name='Kirim balasan',exact=True).click()
                await expect(nested).to_have_count(0)
                await expect(child.get_by_text(content,exact=True)).to_be_visible()
                assert responses and responses[-1]['parent_id']==child_id and all(w['parent_id']==child_id for w in writes)
                assert await child.get_by_text(content,exact=True).evaluate('(e)=>e.closest("article").parentElement.closest("article").id')==('comment-'+child_id)
                await expect(main).to_have_value('Draft komentar utama tetap tersimpan.')
                for depth in range(5):
                    parent=root.get_by_text(('Terima kasih. Apakah pengukuran juga dilakukan di sisi hulu kanal?' if depth==0 else f'Pemantauan lanjutan {depth}:'),exact=depth==0).locator('xpath=ancestor::article[1]')
                    next_text=root.get_by_text(f'Pemantauan lanjutan {depth+1}:',exact=False)
                    if not await next_text.is_visible():await parent.get_by_role('button',name='Lihat balasan',exact=False).first.click()
                    await expect(next_text).to_be_visible()
                leaf=root.get_by_text('Pemantauan lanjutan 5:',exact=False).locator('xpath=ancestor::article[1]')
                await leaf.get_by_role('button',name='Balas',exact=True).first.click()
                await expect(leaf.get_by_label('Tulis balasan...',exact=True)).to_be_focused()
                await page.add_style_tag(content='nextjs-portal{display:none!important}')
                await page.wait_for_timeout(200)
                await page.screenshot(path=str(OUT/f'deep-{width}.png'))
                assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
                assert len(await page.locator('[id^=reply-composer-]').all())==1
                await leaf.get_by_role('button',name='Batal membalas',exact=True).click()
                if width==1440:
                    up=root.get_by_role('button',name='Upvote komentar @rimba_rani',exact=True).first
                    down=root.get_by_role('button',name='Downvote komentar @rimba_rani',exact=True).first
                    score=root.get_by_label('Skor komentar',exact=True).first;initial=int(await score.inner_text())
                    await up.click();await expect(score).to_have_text(str(initial+1))
                    await down.click();await expect(score).to_have_text(str(initial-1))
                    await down.click();await expect(score).to_have_text(str(initial))
                    await page.reload(wait_until='domcontentloaded');await expect(root).to_be_visible()
                    slow['active']=True
                    await root.get_by_role('button',name='Balas',exact=True).first.click();await asyncio.wait_for(slow['started'].wait(),10)
                    raced=page.locator('#reply-composer-'+actors['root'])
                    race_text='Balasan baru tetap terlihat setelah respons lama.'
                    await raced.get_by_label('Tulis balasan...',exact=True).fill(race_text)
                    await raced.get_by_role('button',name='Kirim balasan',exact=True).click()
                    await expect(raced).to_have_count(0);slow['release'].set();await page.wait_for_timeout(250)
                    await expect(root.get_by_text(race_text,exact=True)).to_be_visible()
                    assert await root.get_by_text(race_text,exact=True).count()==1
                if showcase is None:
                    async def fixture_comment(text,parent=None,second=False):
                        response=await context.request.post('http://127.0.0.1:5002/api/v1/forum/posts/post-kb-011/comments',headers={'Cookie':'bp_session='+actors['second_cookie' if second else 'cookie'],'Origin':BASE,'X-Session-Context':actors['second_context' if second else 'context']},data={'content':text,**({'parent_id':parent} if parent else {})})
                        assert response.status==201
                        return (await response.json())['data']['id']
                    first=await fixture_comment('Bibit di sisi kanal mulai tumbuh.')
                    second=await fixture_comment('Apakah tinggi air sudah diukur?',first,True)
                    third=await fixture_comment('Sudah. Hasil pengukuran akan dicatat di sini.',second)
                    showcase={'root':first,'child':second,'leaf':third}
                await page.reload(wait_until='domcontentloaded')
                short=page.locator('#comment-'+showcase['root']);await expect(short).to_be_visible()
                await short.get_by_role('button',name='Balas',exact=True).first.click()
                nested_short=page.locator('#comment-'+showcase['child']);await expect(nested_short).to_be_visible()
                await nested_short.get_by_role('button',name='Balas',exact=True).first.click()
                await expect(page.locator('#reply-composer-'+showcase['child']).get_by_label('Tulis balasan...',exact=True)).to_be_focused()
                await page.wait_for_timeout(200);await short.scroll_into_view_if_needed()
                await page.add_style_tag(content='nextjs-portal{display:none!important}')
                await page.screenshot(path=str(OUT/f'after-{width}.png'))
                assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
                checks.append({'width':width,'inline_after_reply_list':True,'nested_parent_saved':True,'main_draft_preserved':True,'sort_and_reply_pagination':True,'six_levels_readable':True,'retry':True,'stale_read_checked':width==1440,'vote_switch_clear_checked':width==1440})
                print('PASS',width,flush=True)
                await context.unroute_all(behavior="ignoreErrors")
                await context.close()
            context=await browser.new_context(viewport={'width':390,'height':844});page=await context.new_page();page.set_default_timeout(20000)
            page.on('pageerror',lambda e:errors.append(str(e)))
            async def guest_api(route):
                u=urlsplit(route.request.url)
                response=await route.fetch(url='http://127.0.0.1:5002'+u.path+('?' +u.query if u.query else ''))
                await route.fulfill(response=response)
            await context.route(re.compile(r'/api/v1/(auth|forum)/'),guest_api)
            await page.goto(BASE+'/forum/post-kb-011#comments-section',wait_until='domcontentloaded')
            short=page.locator('#comment-'+showcase['root']);await expect(short).to_be_visible()
            await short.get_by_role('button',name='Balas',exact=True).first.click()
            child=page.locator('#comment-'+showcase['child']);await expect(child).to_be_visible()
            await child.get_by_role('button',name='Balas',exact=True).first.click()
            leaf=page.locator('#comment-'+showcase['leaf']);await expect(leaf).to_be_visible()
            await leaf.get_by_role('button',name='Balas',exact=True).first.click()
            guest_form=page.locator('#reply-composer-'+showcase['leaf'])
            await guest_form.get_by_label('Login/Register dulu baru bisa komentar',exact=True).fill('Balasan tamu dilanjutkan setelah masuk.')
            await guest_form.get_by_role('button',name='Masuk untuk berkomentar',exact=True).click()
            await page.get_by_role('button',name='Daftar',exact=True).click()
            await page.get_by_label('Email',exact=True).fill('inline-reply-browser@example.test')
            await page.get_by_label('Buat password',exact=True).fill('InlineReplyBrowser#2026')
            await page.get_by_label('Konfirmasi password',exact=True).fill('InlineReplyBrowser#2026')
            await page.get_by_role('button',name='Daftar dan kirim kode',exact=True).click()
            await page.get_by_label('Kode email',exact=True).wait_for()
            deliveries=json.loads((folder/'deliveries.json').read_text());code=next(item['code'] for item in reversed(deliveries) if item['email']=='inline-reply-browser@example.test')
            await page.get_by_label('Kode email',exact=True).fill(code)
            await page.get_by_role('button',name='Verifikasi',exact=True).click()
            await page.get_by_label('Username',exact=True).fill('HijauInline')
            await page.get_by_role('combobox',name='Sebagai siapa?',exact=True).select_option('volunteer')
            await page.get_by_role('button',name='Simpan dan lanjutkan',exact=True).click()
            await expect(guest_form.get_by_label('Tulis balasan...',exact=True)).to_have_value('Balasan tamu dilanjutkan setelah masuk.')
            await expect(guest_form.get_by_label('Tulis balasan...',exact=True)).to_be_focused()
            await guest_form.get_by_role('button',name='Kirim balasan',exact=True).click()
            await expect(guest_form).to_have_count(0)
            await expect(leaf.get_by_text('Balasan tamu dilanjutkan setelah masuk.',exact=True)).to_be_visible()
            checks.append({'guest_nested_reply_login_and_draft':True,'real_email_sent':False})
            print('PASS guest registration and nested reply resume',flush=True)
            await context.unroute_all(behavior='ignoreErrors');await context.close()
            await browser.close()
        assert not errors,errors
        (OUT/'browser-report.json').write_text(json.dumps({'checks':checks,'javascript_errors':errors},indent=2)+'\n')
        print(json.dumps(checks),flush=True)
    finally:
        if fixture.returncode is None:fixture.terminate();await asyncio.wait_for(fixture.wait(),15)
        if folder:assert not folder.exists()
asyncio.run(main())
