# Check real form motion and media UI with intercepted account, upload and report writes.
import asyncio,json,re,sys,time,subprocess
from pathlib import Path
from playwright.async_api import async_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'knowledge/evidence-step-ui-2026-10-29'
BASE='http://localhost:3001'
USER={'id':'e'*24,'username':'HutanLestari','participation':'volunteer','avatar_url':None,'city':'Surabaya','email':'evidence-ui@example.test','role':'PUBLIC_GUEST','role_badge':'','assigned_plots':[],'created_at':'2026-10-29T00:00:00Z','session_context':'12345678-1234-4234-8234-123456789012'}
def safe(value):return re.sub(r'AIza[0-9A-Za-z_-]{20,}','[redacted]',str(value))
async def sample(page):
    await page.evaluate("""() => {
      window.stepSamples=[];const start=performance.now();
      const tick=()=>{const d=document.querySelector('dialog[aria-labelledby="evidence-title"]'),p=d?.querySelector('[data-evidence-step]'),h=d?.querySelector(':scope>header'),f=d?.querySelector('form>footer');
        if(d&&p)window.stepSamples.push({ms:performance.now()-start,step:Number(p.dataset.evidenceStep),opacity:Number(getComputedStyle(p).opacity),inert:p.inert,header:h.getBoundingClientRect().y,footer:f.getBoundingClientRect().y,count:d.querySelectorAll('[data-evidence-step]').length});
        if(performance.now()-start<600)requestAnimationFrame(tick);
      };requestAnimationFrame(tick);
    }""")
async def check_motion(page,reduced):
    await page.wait_for_timeout(470)
    values=await page.evaluate('window.stepSamples')
    assert values and max(v['header'] for v in values)-min(v['header'] for v in values)<2
    assert max(v['footer'] for v in values)-min(v['footer'] for v in values)<2
    assert all(v['count']==1 for v in values)
    tween=any(.01<v['opacity']<.99 for v in values)
    assert not tween if reduced else tween
    return {'tween_observed':tween,'frame_stable':True,'samples':values}
async def main():
    video_fixture=Path('/tmp/buktipulih-evidence-ui-test.mp4')
    subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','color=c=0x315a43:s=640x360:d=0.5','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-y',str(video_fixture)],check=True)
    reports=[];errors=[];video_source=None;clip_start=None
    async with async_playwright() as p:
        browser=await p.chromium.launch()
        for width,height,reduced in [(1440,1000,False),(390,844,False),(320,740,False),(800,450,False),(390,844,True),(1440,1000,True)]:
            record=width==1440 and not reduced
            options={'viewport':{'width':width,'height':height},'is_mobile':width<600,'has_touch':width<600,'reduced_motion':'reduce' if reduced else 'no-preference'}
            if record:options.update(record_video_dir=str(OUT/'recordings'),record_video_size={'width':1440,'height':1000})
            context=await browser.new_context(**options)
            page=await context.new_page();started=time.perf_counter();page.set_default_timeout(20000)
            page.on('pageerror',lambda error:errors.append(safe(error)))
            page.on('console',lambda m:errors.append(safe(m.text)) if m.type=='error' and ('not focusable' in m.text or 'same key' in m.text) else None)
            uploads=[];creates=[];saved={'post':None}
            async def account(route):
                assert route.request.method=='GET'
                await route.fulfill(json={'data':{'user':USER}})
            await context.route('**/api/v1/auth/**',account)
            async def forum(route):
                req=route.request;path=req.url.split('?')[0]
                if req.method=='POST':
                    payload=req.post_data_json;creates.append(payload)
                    assert req.headers.get('x-session-context')==USER['session_context']
                    if record and len(creates)==1:return await route.fulfill(status=503,json={'error':{'code':'SERVICE_UNAVAILABLE','message':'Simpan uji gagal.'}})
                    saved['post']={**payload,'id':'f'*24,'author':{'username':'Anonim' if payload['is_anonymous'] else USER['username'],'age':0,'city':'','avatar_url':None,'participation':None},'created_at':'2026-10-29T12:00:00Z','time_ago':'','metrics':{'likes':0,'views':0,'comments_count':0},'comments':[],'persisted':True,'verification_status':'unverified'}
                    await asyncio.sleep(.15)
                    return await route.fulfill(status=201,json={'data':saved['post']})
                assert req.method=='GET'
                if saved['post'] and path.endswith('/'+'f'*24):return await route.fulfill(json={'data':saved['post']})
                await route.fulfill(json={'data':{'items':[saved['post']] if saved['post'] else [],'truncated':False,'pagination':{'page':1,'total_pages':1}}})
            await context.route('**/api/v1/forum/**',forum)
            async def upload(route):
                uploads.append(route.request.headers.get('x-session-context'))
                if record and len(uploads)==1:return await route.fulfill(status=500,json={'error':'Unggahan uji gagal.'})
                await route.fulfill(json={'url':'https://evidence-fixture.public.blob.vercel-storage.com/bukti-lapangan/step-ui.webp'})
            await context.route('**/api/upload',upload)
            await context.route('https://evidence-fixture.public.blob.vercel-storage.com/**',lambda route:route.fulfill(body=(ROOT/'public/hero-peat-seedling.jpg').read_bytes(),content_type='image/jpeg'))
            await page.goto(BASE+'/?tab=forum&compose=1',wait_until='domcontentloaded')
            dialog=page.get_by_role('dialog',name='Kirim bukti',exact=True)
            await expect(dialog).to_be_visible()
            search=dialog.get_by_role('combobox',name='Cari lokasi',exact=True)
            await search.fill('Jalan Tunjungan Surabaya')
            await expect(dialog.get_by_role('option').first).to_be_visible(timeout=30000);await search.press('Enter')
            await expect(dialog.get_by_label('Daerah/Kota',exact=True)).to_have_value(re.compile('Surabaya'))
            await dialog.get_by_label('Nama lokasi',exact=True).fill('Pemulihan Taman Tunjungan')
            await dialog.get_by_label('Detail tempat',exact=True).fill('Samping taman')
            await dialog.get_by_role('checkbox',name='Titik peta dan wilayah sudah sesuai.',exact=False).check()
            await page.add_style_tag(content='nextjs-portal{display:none!important}')
            await sample(page);await dialog.get_by_role('button',name='Lanjutkan',exact=True).click()
            forward=await check_motion(page,reduced)
            await expect(dialog.get_by_role('button',name='Kirim bukti',exact=True)).to_be_enabled()
            assert await dialog.locator('form>div').evaluate('(e)=>e.scrollTop')==0
            assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
            if not reduced:await page.screenshot(path=str(OUT/f'after-{width}.png'))
            await dialog.get_by_role('button',name='Kirim bukti',exact=True).click()
            assert not uploads and not creates
            assert await dialog.locator('input[type=file]').evaluate('(e)=>e.validity.valueMissing')
            async with page.expect_file_chooser() as chosen:await dialog.get_by_label('Foto atau video',exact=True).click()
            await (await chosen.value).set_files(str(ROOT/'public/hero-peat-seedling.jpg'))
            await expect(dialog.get_by_alt_text('Pratinjau bukti',exact=True)).to_be_visible()
            await dialog.get_by_label('Ekosistem',exact=True).select_option('gambut')
            await dialog.get_by_label('Kondisi yang diamati',exact=True).select_option('perlu_rawat')
            await dialog.get_by_label('Catatan lapangan',exact=True).fill('Bibit mulai bertunas. Area di sekitar taman sudah dibersihkan.')
            await dialog.get_by_role('checkbox',name='Tampilkan sebagai anonim',exact=False).check()
            await expect(dialog.get_by_text('Nama dan foto profil disembunyikan. Lokasi tetap publik.',exact=True)).to_be_visible()
            if record:clip_start=time.perf_counter()-started-.3
            await sample(page);await dialog.get_by_role('button',name='Kembali',exact=True).click()
            backward=await check_motion(page,reduced)
            await expect(dialog.get_by_label('Nama lokasi',exact=True)).to_have_value('Pemulihan Taman Tunjungan')
            await expect(dialog.get_by_label('Detail tempat',exact=True)).to_have_value('Samping taman')
            await expect(dialog.get_by_role('checkbox',name='Titik peta dan wilayah sudah sesuai.',exact=False)).to_be_checked()
            await dialog.get_by_role('button',name='Lanjutkan',exact=True).click()
            await expect(dialog.get_by_role('button',name='Kirim bukti',exact=True)).to_be_enabled()
            await expect(dialog.get_by_label('Ekosistem',exact=True)).to_have_value('gambut')
            await expect(dialog.get_by_label('Catatan lapangan',exact=True)).to_have_value('Bibit mulai bertunas. Area di sekitar taman sudah dibersihkan.')
            await expect(dialog.get_by_alt_text('Pratinjau bukti',exact=True)).to_be_visible()
            assert not await dialog.locator('input[type=file]').evaluate('(e)=>e.required')
            if width in [1440,390] and not reduced:
                async with page.expect_file_chooser() as chosen:await dialog.get_by_label('Foto atau video',exact=True).click()
                await (await chosen.value).set_files('/tmp/buktipulih-evidence-ui-test.mp4')
                await page.wait_for_function('()=>document.querySelector("dialog[aria-labelledby=evidence-title] video")?.videoWidth===640')
                await expect(dialog.locator('video')).to_have_attribute('controls','')
                await dialog.get_by_role('button',name='Hapus',exact=True).click()
                await expect(dialog.locator('video')).to_have_count(0)
                assert await dialog.locator('input[type=file]').evaluate('(e)=>e.required&&e.files.length===0&&e===document.activeElement')
                await dialog.locator('input[type=file]').set_input_files({'name':'invalid.txt','mimeType':'text/plain','buffer':b'invalid fixture'})
                await expect(dialog.get_by_role('alert')).to_contain_text('maksimal 10 MB')
                await dialog.locator('input[type=file]').evaluate('(e)=>{const d=new DataTransfer();d.items.add(new File([new Uint8Array(10*1024*1024+1)],"large.jpg",{type:"image/jpeg"}));e.files=d.files;e.dispatchEvent(new Event("change",{bubbles:true}))}')
                await expect(dialog.get_by_role('alert')).to_contain_text('maksimal 10 MB')
                assert not uploads
                await dialog.locator('input[type=file]').set_input_files(str(ROOT/'public/hero-peat-seedling.jpg'))
                await expect(dialog.get_by_role('alert')).to_have_count(0)
            if not reduced:
                await dialog.get_by_alt_text('Pratinjau bukti',exact=True).scroll_into_view_if_needed()
                await page.screenshot(path=str(OUT/f'after-media-{width}.png'))
            if record:
                await dialog.get_by_role('button',name='Kirim bukti',exact=True).click()
                await expect(dialog.get_by_role('alert')).to_contain_text('Unggahan uji gagal.')
                await dialog.get_by_role('button',name='Kirim bukti',exact=True).click()
                await expect(dialog.get_by_role('alert')).to_contain_text('Simpan uji gagal.')
            await page.evaluate('()=>{const f=document.querySelector("dialog[aria-labelledby=evidence-title] form");f.requestSubmit();f.requestSubmit()}')
            await page.wait_for_url('**/?tab=recovery&report=*')
            assert len(uploads)==(2 if record else 1) and all(v==USER['session_context'] for v in uploads)
            assert len(creates)==(2 if record else 1)
            assert creates[-1]['is_anonymous'] and creates[-1]['location_name']=='Pemulihan Taman Tunjungan' and creates[-1]['media']['type']=='image'
            if record:assert creates[0]['submission_id']==creates[1]['submission_id']
            await expect(page.get_by_role('complementary',name='Rincian laporan warga',exact=True).get_by_text('Samping taman',exact=True)).to_be_visible()
            reports.append({'width':width,'height':height,'reduced_motion':reduced,'forward':forward,'backward':backward,'draft_preserved':True,'media_and_native_validation':True,'single_submission_and_retry':True})
            print('PASS',width,'reduced' if reduced else 'motion',flush=True)
            if record:video_source=page.video
            await context.close()
        if video_source:
            source=await video_source.path()
            subprocess.run(['ffmpeg','-v','error','-ss',str(max(0,clip_start)),'-i',source,'-t','2.4','-an','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-y',str(OUT/'step-transition-desktop.mp4')],check=True)
        await browser.close()
    assert not errors,errors
    (OUT/'browser-report.json').write_text(json.dumps({'checks':reports,'javascript_errors':errors,'account_and_report_requests_mocked':True,'google_search_live':True},indent=2)+'\n')
asyncio.run(main())
