# Check onboarding, the two-save limit, immutable email and profile drafts with an isolated backend.
import asyncio,json,os,socket,signal
from pathlib import Path
from urllib.parse import urlsplit
from playwright.async_api import async_playwright,expect

ROOT=Path(__file__).resolve().parents[1]
BACKEND=ROOT.parent/'bukti-pulih-be'
OUT=ROOT/'knowledge/username-save-limit-2026-10-29'
BASE='http://localhost:3001'
NODE='/home/vereniaes/.nvm/versions/node/v24.22.0/bin/node'

async def main():
    with socket.socket() as check:
        assert check.connect_ex(('127.0.0.1',5002))!=0,'Test port is already in use.'
    env=os.environ.copy();env['NODE_ENV']='test';env['PATH']=str(Path(NODE).parent)+':'+env['PATH']
    process=await asyncio.create_subprocess_exec(NODE,'--import','tsx','tests/email-auth.browser-server.ts','--username-limit',cwd=BACKEND,env=env,stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.STDOUT)
    folder=None;reports=[];errors=[]
    try:
        for _ in range(20):
            line=await asyncio.wait_for(process.stdout.readline(),20)
            if line.startswith(b'{'):
                status=json.loads(line)
                if status.get('port')==5002:
                    folder=Path(status['folder']);break
        assert folder and folder.parent==Path('/tmp') and folder.name.startswith('buktipulih_auth_browser_test_')
        async with async_playwright() as p:
            browser=await p.chromium.launch()
            for width,height in [(390,844),(1440,1000),(320,740)]:
                context=await browser.new_context(viewport={'width':width,'height':height})
                page=await context.new_page();page.set_default_timeout(15000)
                page.on('pageerror',lambda e:errors.append(str(e)))
                patches=[]
                async def relay(route):
                    request=route.request;parsed=urlsplit(request.url)
                    if request.method=='PATCH':patches.append(request.post_data_json)
                    response=await route.fetch(url='http://127.0.0.1:5002'+parsed.path+('?' + parsed.query if parsed.query else ''))
                    await route.fulfill(response=response)
                await page.route('**/api/v1/auth/**',relay)
                await page.goto(BASE+'/?tab=forum',wait_until='domcontentloaded')
                await page.locator('a[href^="/forum/"]:visible').first.wait_for()
                await page.wait_for_timeout(500)
                if not await page.get_by_role('button',name='Masuk',exact=True).is_visible():
                    await page.get_by_role('button',name='Buka navigasi',exact=True).click()
                await page.get_by_role('button',name='Masuk',exact=True).click()
                await page.get_by_role('button',name='Daftar',exact=True).click()
                email=f'username-{width}@example.test'
                await page.get_by_label('Email',exact=True).fill(email)
                await page.get_by_label('Buat password',exact=True).fill('UsernameBrowser#2026')
                await page.get_by_label('Konfirmasi password',exact=True).fill('UsernameBrowser#2026')
                await page.get_by_role('button',name='Daftar dan kirim kode',exact=True).click()
                await page.get_by_label('Kode email').wait_for()
                code=next(item['code'] for item in reversed(json.loads((folder/'deliveries.json').read_text())) if item['email']==email)
                await page.get_by_label('Kode email').fill(code)
                await page.get_by_role('button',name='Verifikasi',exact=True).click()
                username=page.get_by_label('Username',exact=True);await username.wait_for()
                await expect(page.get_by_text('Username dapat disimpan 2 kali, termasuk penetapan pertama.',exact=False)).to_be_visible()
                valid=['A','C++','Élodie','緑の森','A🌿','🌿'*24]
                invalid=['','Rimba Hijau',' A','A ','A\u00a0B','x'*25,'🌿'*25]
                for value in valid+invalid:
                    await username.fill(value)
                    assert await username.input_value()==value
                    assert await username.evaluate('e=>e.checkValidity()') == (value in valid),(width,value)
                chosen={390:'Rimba.Hijau+🌿',1440:'Yuang.Jin+🌿',320:'Élodie+🌿'}[width]
                final='A🌿'+str(width)
                await username.fill(chosen)
                await page.get_by_label('Sebagai siapa?',exact=True).select_option('observer')
                await page.wait_for_timeout(250);await page.add_style_tag(content='nextjs-portal{display:none!important}')
                await page.screenshot(path=str(OUT/f'onboarding-{width}.png'))
                async with page.expect_response(lambda r:r.request.method=='PATCH' and r.url.endswith('/auth/me')) as initial:
                    await page.get_by_role('button',name='Simpan dan lanjutkan',exact=True).click()
                first=await initial.value;assert first.status==200
                assert (await first.json())['data']['username_saves_remaining']==1
                await page.wait_for_url('**/profile')
                username=page.locator('#profile-username');email_field=page.locator('#profile-email')
                await expect(username).to_have_value(chosen);await expect(email_field).to_have_value(email)
                assert await username.evaluate('e=>e.readOnly') and await email_field.evaluate('e=>e.readOnly')
                await expect(page.get_by_text('Sisa perubahan: 1 kali.',exact=True)).to_be_visible()
                await expect(page.get_by_text('Email tidak dapat diubah.',exact=True)).to_be_visible()
                await email_field.click();await page.keyboard.press('Control+A');await page.keyboard.type('invalid@example.test')
                await expect(email_field).to_have_value(email)
                await page.reload(wait_until='domcontentloaded');await expect(username).to_have_value(chosen)
                await expect(email_field).to_have_value(email)
                await page.wait_for_timeout(250);await page.add_style_tag(content='nextjs-portal{display:none!important}')
                await page.screenshot(path=str(OUT/f'profile-before-change-{width}.png'))
                if width==1440:
                    await page.get_by_role('button',name='Pilih bahasa',exact=True).click()
                    await expect(page.get_by_text('Email cannot be changed.',exact=True)).to_be_visible()
                    await expect(page.get_by_text('Changes remaining: 1.',exact=True)).to_be_visible()
                    role_en=page.get_by_role('combobox',name='I am here as',exact=True)
                    await expect(role_en).to_have_value('observer')
                    assert await role_en.locator('option').all_text_contents()==['Select one','I am affected','I am a volunteer','I am here to join the conversation']
                    await page.get_by_role('button',name='Pilih bahasa',exact=True).click()
                city=page.get_by_label('Kamu dari mana? (opsional)',exact=True)
                await city.fill('Kota draft '+str(width))
                edit=page.get_by_role('button',name='Ubah username',exact=True)
                await edit.click();modal=page.get_by_role('dialog',name='Ubah username',exact=True)
                await expect(modal).to_be_visible();field=modal.get_by_label('Username',exact=True)
                await expect(field).to_be_focused();await expect(field).to_have_value(chosen)
                await expect(modal.get_by_text('Ini adalah kesempatan terakhir untuk mengubah username.',exact=True)).to_be_visible()
                await expect(modal.get_by_role('button',name='Simpan username',exact=True)).to_be_disabled()
                before=len(patches);await field.fill('Draft.Cancel')
                await modal.get_by_role('button',name='Batal',exact=True).click()
                await expect(edit).to_be_focused();assert len(patches)==before
                await expect(username).to_have_value(chosen);await expect(city).to_have_value('Kota draft '+str(width))
                await edit.click();modal=page.get_by_role('dialog',name='Ubah username',exact=True);field=modal.get_by_label('Username',exact=True)
                await expect(field).to_have_value(chosen)
                await field.fill('Rimba Hijau');assert not await field.evaluate('e=>e.checkValidity()')
                await modal.get_by_role('button',name='Simpan username',exact=True).click();await page.wait_for_timeout(150)
                assert len(patches)==before
                await field.fill('ReservedName')
                async with page.expect_response(lambda r:r.request.method=='PATCH' and r.url.endswith('/auth/me')) as collision:
                    await modal.get_by_role('button',name='Simpan username',exact=True).click()
                response=await collision.value;assert response.status==409
                await expect(modal.get_by_role('alert')).to_have_text('Nama pengguna sudah digunakan.')
                current=await page.evaluate("async()=> (await (await fetch('/api/v1/auth/me')).json()).data.user")
                assert current['username']==chosen and current['username_saves_remaining']==1
                await field.fill(final);await expect(modal.get_by_role('alert')).to_have_count(0)
                assert await field.evaluate('e=>e.checkValidity()')
                await page.wait_for_timeout(220);await page.screenshot(path=str(OUT/f'dialog-{width}.png'))
                other=None
                if width==1440:
                    other=await context.new_page();other.on('pageerror',lambda e:errors.append(str(e)))
                    await other.route('**/api/v1/auth/**',relay)
                    await other.goto(BASE+'/profile',wait_until='domcontentloaded')
                    await expect(other.locator('#profile-username')).to_have_value(chosen)
                    await page.bring_to_front()
                before=len(patches)
                async with page.expect_response(lambda r:r.request.method=='PATCH' and r.url.endswith('/auth/me')) as saved:
                    if width==390:await field.press('Enter')
                    else:await modal.get_by_role('button',name='Simpan username',exact=True).click()
                response=await saved.value;assert response.status==200
                body=(await response.json())['data'];assert body['username']==final and body['username_saves_remaining']==0
                await expect(username).to_have_value(final);await expect(username).to_be_focused()
                await expect(page.locator('#profile-username-hint')).to_have_text('Username tidak dapat diubah lagi.')
                assert len(patches)==before+1 and patches[-1]=={'username':final},patches
                await expect(city).to_have_value('Kota draft '+str(width))
                await expect(page.get_by_role('button',name='Ubah username',exact=True)).to_have_count(0)
                if other:
                    await expect(other.locator('#profile-username')).to_have_value(final)
                    await expect(other.get_by_role('button',name='Ubah username',exact=True)).to_have_count(0)
                    await other.close()
                before=len(patches)
                async with page.expect_response(lambda r:r.request.method=='PATCH' and r.url.endswith('/auth/me')) as general:
                    await page.get_by_role('button',name='Simpan',exact=True).click()
                response=await general.value;assert response.status==200
                body=(await response.json())['data'];assert body['username']==final and body['username_saves_remaining']==0 and body['city']=='Kota draft '+str(width)
                assert len(patches)==before+1 and 'username' not in patches[-1] and 'email' not in patches[-1]
                await page.reload(wait_until='domcontentloaded');await expect(username).to_have_value(final)
                await expect(email_field).to_have_value(email);await expect(page.get_by_role('button',name='Ubah username',exact=True)).to_have_count(0)
                await expect(city).to_have_value('Kota draft '+str(width))
                forbidden=await page.evaluate("""async()=>{const me=(await (await fetch('/api/v1/auth/me')).json()).data.user;
                    const call=async payload=>{const r=await fetch('/api/v1/auth/me',{method:'PATCH',headers:{'Content-Type':'application/json','X-Session-Context':me.session_context},body:JSON.stringify(payload)});return r.status};
                    return [await call({username:'BypassAttempt'}),await call({email:'other@example.test'})];} """)
                assert forbidden==[409,422],forbidden
                await page.wait_for_timeout(200);await page.add_style_tag(content='nextjs-portal{display:none!important}')
                await page.screenshot(path=str(OUT/f'profile-locked-{width}.png'))
                assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
                assert '�' not in await page.locator('body').inner_text()
                reports.append({'width':width,'initial_counts_as_first':True,'email_readonly':True,'username_locked':True,'cancel_does_not_spend':True,'invalid_and_duplicate_do_not_spend':True,'dialog_saves_only_username':True,'draft_preserved':True,'second_save_is_final':True,'other_profile_edits_work':True,'cross_tab_tested':bool(other),'reload_persisted':True,'direct_api_enforced':True,'no_overflow':True})
                print(f'PASS {width}px: onboarding, immutable email, username quota, conflict, draft and reload',flush=True)
                await context.close()
            # An existing incomplete account keeps its username locked during onboarding.
            context=await browser.new_context(viewport={'width':390,'height':844});page=await context.new_page();page.set_default_timeout(15000)
            page.on('pageerror',lambda e:errors.append(str(e)))
            async def legacy_relay(route):
                req=route.request;u=urlsplit(req.url)
                response=await route.fetch(url='http://127.0.0.1:5002'+u.path+('?' + u.query if u.query else ''))
                await route.fulfill(response=response)
            await page.route('**/api/v1/auth/**',legacy_relay)
            await page.goto(BASE+'/?tab=forum',wait_until='domcontentloaded')
            await page.locator('a[href^="/forum/"]:visible').first.wait_for()
            if not await page.get_by_role('button',name='Masuk',exact=True).is_visible():await page.get_by_role('button',name='Buka navigasi',exact=True).click()
            await page.get_by_role('button',name='Masuk',exact=True).click()
            await page.get_by_label('Email',exact=True).fill('username-legacy@example.test')
            await page.get_by_label('Password',exact=True).fill('LegacyBrowser#2026')
            await page.get_by_role('button',name='Masuk dan kirim kode',exact=True).click()
            await page.get_by_label('Kode email').wait_for()
            code=next(item['code'] for item in reversed(json.loads((folder/'deliveries.json').read_text())) if item['email']=='username-legacy@example.test')
            await page.get_by_label('Kode email').fill(code);await page.get_by_role('button',name='Verifikasi',exact=True).click()
            username=page.get_by_label('Username',exact=True);await expect(username).to_have_value('ReservedName')
            assert await username.evaluate('e=>e.readOnly')
            await expect(page.get_by_text('Username yang tersimpan dapat diubah melalui Profil.',exact=True)).to_be_visible()
            await page.get_by_label('Sebagai siapa?',exact=True).select_option('observer')
            async with page.expect_response(lambda r:r.request.method=='PATCH' and r.url.endswith('/auth/me')) as completed:
                await page.get_by_role('button',name='Simpan dan lanjutkan',exact=True).click()
            response=await completed.value;assert response.status==200
            assert (await response.json())['data']['username_saves_remaining']==1
            await page.wait_for_url('**/profile');await expect(page.get_by_role('button',name='Ubah username',exact=True)).to_be_visible()
            print('PASS existing account: onboarding keeps the saved username and remaining opportunity',flush=True)
            await context.close()
            # A profile without a username can set its first and second value independently of biodata.
            context=await browser.new_context(viewport={'width':320,'height':420},reduced_motion='reduce')
            credentials=json.loads((folder/'username-unassigned.json').read_text())
            await context.add_cookies([{'name':'bp_session','value':credentials['token'],'url':BASE,'httpOnly':True,'sameSite':'Lax'}])
            page=await context.new_page();page.set_default_timeout(15000);page.on('pageerror',lambda e:errors.append(str(e)))
            held=asyncio.Event();release=asyncio.Event();unassigned_patches=[]
            async def unassigned_relay(route):
                req=route.request;u=urlsplit(req.url)
                if req.method=='PATCH':
                    payload=req.post_data_json;unassigned_patches.append(payload)
                    if payload.get('username')=='Kedua🌿':held.set();await release.wait()
                response=await route.fetch(url='http://127.0.0.1:5002'+u.path+('?' + u.query if u.query else ''))
                await route.fulfill(response=response)
            await page.route('**/api/v1/auth/**',unassigned_relay)
            await page.goto(BASE+'/profile',wait_until='domcontentloaded')
            username=page.locator('#profile-username');await expect(username).to_have_value('')
            await expect(page.locator('#profile-email')).to_have_value('username-unassigned@example.test')
            await expect(page.get_by_text('Username dapat disimpan 2 kali secara total.',exact=True)).to_be_visible()
            await page.get_by_role('button',name='Atur username',exact=True).click()
            modal=page.get_by_role('dialog',name='Atur username',exact=True);await expect(modal).to_be_visible()
            assert await modal.evaluate('e=>getComputedStyle(e).animationName')=='none'
            box=await modal.bounding_box();assert box['y']>=0 and box['y']+box['height']<=421,box
            field=modal.get_by_label('Username',exact=True);await expect(field).to_be_focused();await field.fill('Pertama🌿')
            await modal.get_by_role('button',name='Simpan username',exact=True).scroll_into_view_if_needed()
            async with page.expect_response(lambda r:r.request.method=='PATCH' and r.url.endswith('/auth/me')) as first:
                await modal.get_by_role('button',name='Simpan username',exact=True).click()
            response=await first.value;assert response.status==200 and (await response.json())['data']['username_saves_remaining']==1
            await expect(username).to_have_value('Pertama🌿');assert unassigned_patches==[{'username':'Pertama🌿'}]
            await page.set_viewport_size({'width':390,'height':844});await page.emulate_media(reduced_motion='no-preference')
            role=page.get_by_role('combobox',name='Sebagai siapa?',exact=True)
            await expect(role).to_have_value('')
            assert await role.locator('option').all_text_contents()==['Pilih salah satu','Saya Terdampak','Saya Relawan','Saya Cuman mau Nimbrung']
            assert not await role.evaluate('e=>e.checkValidity()')
            before=len(unassigned_patches)
            await page.get_by_role('button',name='Simpan',exact=True).click();await page.wait_for_timeout(150)
            assert len(unassigned_patches)==before
            await role.select_option('affected');await role.focus();await page.keyboard.press('ArrowDown')
            assert await role.input_value()=='volunteer'
            for value in ['affected','volunteer','observer']:
                await role.select_option(value)
                async with page.expect_response(lambda r:r.request.method=='PATCH' and r.url.endswith('/auth/me')) as detail:
                    await page.get_by_role('button',name='Simpan',exact=True).click()
                response=await detail.value;body=(await response.json())['data']
                assert response.status==200 and body['participation']==value and body['username_saves_remaining']==1
                assert unassigned_patches[-1]['participation']==value
                await page.reload(wait_until='domcontentloaded');await expect(role).to_have_value(value)
            await page.get_by_role('button',name='Pilih bahasa',exact=True).click() if await page.get_by_role('button',name='Pilih bahasa',exact=True).is_visible() else None
            await page.get_by_role('button',name='Ubah username',exact=True).click()
            modal=page.get_by_role('dialog',name='Ubah username',exact=True);await modal.get_by_label('Username',exact=True).fill('Kedua🌿')
            async with page.expect_response(lambda r:r.request.method=='PATCH' and r.url.endswith('/auth/me')) as final_save:
                await modal.get_by_role('button',name='Simpan username',exact=True).click()
                await asyncio.wait_for(held.wait(),5)
                await expect(modal.get_by_role('button',name='Menyimpan…',exact=True)).to_be_disabled()
                await page.keyboard.press('Escape');await expect(modal).to_be_visible()
                release.set()
            response=await final_save.value;assert response.status==200 and (await response.json())['data']['username_saves_remaining']==0
            await expect(username).to_have_value('Kedua🌿');await expect(page.get_by_role('button',name='Ubah username',exact=True)).to_have_count(0)
            assert sum('username' in payload for payload in unassigned_patches)==2
            print('PASS unset username: first/second save, short reduced-motion dialog and pending guard',flush=True)
            await context.close();await browser.close()
        assert not errors,errors
        (OUT/'browser-report.json').write_text(json.dumps({'checks':reports,'existing_account_onboarding':True,'unset_username_profile':True,'short_reduced_motion_and_pending':True,'participation_required_and_three_saved':True,'keyboard_and_english':True,'javascript_errors':errors,'real_mail_sent':False},indent=2)+'\n')
    finally:
        if process.returncode is None:
            process.send_signal(signal.SIGTERM)
            await asyncio.wait_for(process.wait(),20)
        assert not folder or not folder.exists(),'Fixture cleanup did not finish.'

asyncio.run(main())
