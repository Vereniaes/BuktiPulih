# Check the profile console and reset account-scoped state without using real accounts.
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright,expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'knowledge/profile-duplicate-key-2026-10-29'
BASE='http://localhost:3001'
def user(identifier,username,email,city,participation):
    return {'id':identifier*24,'username':username,'username_saves_remaining':1,'participation':participation,'avatar_url':None,'city':city,'phone_number':None,'email':email,'role':'PUBLIC_GUEST','role_badge':'','assigned_plots':[],'created_at':'2026-10-29T00:00:00.000Z','session_context':'12345678-1234-4234-8234-123456789012'}

async def main():
    reports=[];errors=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch()
        for width,height in [(1440,1000),(390,844),(320,740)]:
            context=await browser.new_context(viewport={'width':width,'height':height});page=await context.new_page();page.set_default_timeout(15000)
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('console',lambda m:errors.append(m.text) if m.type=='error' and 'Encountered two children with the same key' in m.text else None)
            first=user('a','AkunPertama','first@example.test','Kota pertama','observer')
            second=user('b','AkunKedua','second@example.test','Kota kedua','volunteer')
            active={'user':first};logout_started=asyncio.Event();release_logout=asyncio.Event();writes=[]
            async def account(route):
                req=route.request;path=req.url.split('?')[0]
                if req.method=='GET':
                    if path.endswith('/activity'):return await route.fulfill(json={'data':{'items':[],'pagination':{'page':1,'limit':10,'total_items':0,'total_pages':0}}})
                    return await route.fulfill(json={'data':{'authenticated':True,'user':active['user']}})
                writes.append(req.method+' '+path.split('/api/v1')[-1])
                if req.method=='POST' and path.endswith('/auth/logout'):
                    logout_started.set();await release_logout.wait()
                    return await route.fulfill(status=503,json={'error':{'code':'TEST_PENDING','message':'Simulated request stopped.'}})
                if req.method=='PATCH' and path.endswith('/auth/me'):
                    active['user']=second
                    return await route.fulfill(json={'data':second})
                raise AssertionError('Unexpected mock request: '+req.method+' '+path)
            await page.route('**/api/v1/auth/**',account)
            await page.goto(BASE+'/profile',wait_until='domcontentloaded')
            await expect(page.locator('#profile-username')).to_have_value(first['username'])
            await expect(page.locator('#profile-email')).to_have_value(first['email'])
            await page.wait_for_timeout(350);await page.add_style_tag(content='nextjs-portal{display:none!important}')
            await page.screenshot(path=str(OUT/f'profile-after-{width}.png'))
            await page.locator('#profile-city').fill('Draft from first account')
            await page.get_by_role('button',name='Keluar',exact=True).click()
            await asyncio.wait_for(logout_started.wait(),10)
            await expect(page.get_by_role('button',name='Keluar…',exact=True)).to_be_disabled()
            await page.get_by_role('button',name='Simpan',exact=True).click()
            await expect(page.locator('#profile-username')).to_have_value(second['username'])
            await expect(page.locator('#profile-email')).to_have_value(second['email'])
            await expect(page.locator('#profile-city')).to_have_value(second['city'])
            await expect(page.get_by_role('combobox',name='Sebagai siapa?',exact=True)).to_have_value('volunteer')
            await expect(page.get_by_role('button',name='Keluar',exact=True)).to_be_enabled()
            release_logout.set();await page.wait_for_timeout(300)
            await expect(page.locator('#profile-username')).to_have_value(second['username'])
            assert writes==['POST /auth/logout','PATCH /auth/me'],writes
            assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
            reports.append({'width':width,'duplicate_console_error':False,'profile_state_reset':True,'account_action_state_reset':True,'account_requests_mocked':True})
            print(f'PASS {width}px: no duplicate key; profile and account-action state reset for another account',flush=True)
            await context.close()
        await browser.close()
    assert not errors,errors
    (OUT/'browser-report.json').write_text(json.dumps({'checks':reports,'javascript_or_duplicate_key_errors':errors,'real_account_writes':False},indent=2)+'\n')

asyncio.run(main())
