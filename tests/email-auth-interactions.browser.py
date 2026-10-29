# Check resend, restored flows, focus and repeat sign-in against the isolated fixture.
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT = Path(__file__).resolve().parents[1]
PASSWORD = "BrowserForestPassword2026!"
BASE = "http://localhost:3001"
OUT = ROOT / "knowledge/password-otp-2026-10-28"
async def main(folder):
    fixture = Path(folder)
    assert fixture.parent == Path("/tmp") and fixture.name.startswith("buktipulih_auth_browser_test_")
    env_file = ROOT / ".env.local"
    original = env_file.read_text()
    report = {}
    try:
        env_file.write_text(original.replace("API_UPSTREAM_URL=http://localhost:5000/api/v1", "API_UPSTREAM_URL=http://localhost:5002/api/v1"))
        async with async_playwright() as p:
            b = await p.chromium.launch()
            context = await b.new_context(viewport={"width": 390, "height": 844})
            page = await context.new_page()
            page.set_default_timeout(15000)
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            now = json.loads((fixture / "clock.json").read_text())["now"] + 16 * 60_000
            (fixture / "clock.json").write_text(json.dumps({"now": now}))
            await page.clock.install(time=now)
            async def open_auth():
                await page.goto(BASE + "/?tab=forum", wait_until="domcontentloaded")
                await page.wait_for_timeout(800)
                await page.get_by_role("button", name="Buka navigasi").click()
                await page.get_by_role("button", name="Masuk", exact=True).click()
            await open_auth()
            email = "interactions@example.test"
            await page.get_by_role("button", name="Daftar", exact=True).click()
            await page.get_by_label("Email", exact=True).fill(email)
            await page.get_by_label("Buat password", exact=True).fill(PASSWORD)
            await page.get_by_label("Konfirmasi password", exact=True).fill(PASSWORD)
            await page.get_by_role("button", name="Daftar dan kirim kode", exact=True).click()
            await page.get_by_label("Kode email").wait_for()
            old_code = next(d["code"] for d in reversed(json.loads((fixture / "deliveries.json").read_text())) if d["email"] == email)
            await page.keyboard.press("Escape")
            await page.get_by_role("dialog").wait_for(state="hidden")
            assert await page.get_by_role("button", name="Buka navigasi").evaluate("el => el === document.activeElement")
            await page.get_by_role("button", name="Buka navigasi").click()
            async with page.expect_response(lambda response: "/auth/email/flow?" in response.url) as restored:
                await page.get_by_role("button", name="Masuk", exact=True).click()
            await (await restored.value).json()
            await page.get_by_label("Kode email").wait_for()
            await page.wait_for_timeout(100)
            assert await page.get_by_label("Kode email").input_value() == ""
            stored = await page.evaluate("sessionStorage.getItem('buktipulih_email_auth_flow_v1')")
            assert old_code not in stored and email not in stored
            report["escape_focus_and_flow_restore"] = True
            now += 61_000
            (fixture / "clock.json").write_text(json.dumps({"now": now}))
            await page.clock.fast_forward(61_000)
            await page.get_by_role("button", name="Kirim ulang kode", exact=True).click()
            await page.get_by_role("button", name="Kirim ulang dalam", exact=False).wait_for()
            new_code = next(d["code"] for d in reversed(json.loads((fixture / "deliveries.json").read_text())) if d["email"] == email)
            assert new_code != old_code
            await page.get_by_label("Kode email").fill(old_code)
            await page.get_by_role("button", name="Verifikasi", exact=True).click()
            await page.get_by_role("dialog").get_by_text("Kode tidak cocok atau sudah tidak berlaku.", exact=True).wait_for()
            await page.get_by_label("Kode email").fill(new_code)
            await page.get_by_role("button", name="Verifikasi", exact=True).click()
            await page.get_by_label("Username", exact=True).wait_for()
            await page.get_by_label("Username", exact=True).fill("interaction_user")
            await page.get_by_role("combobox", name="Sebagai siapa?").select_option("observer")
            await page.get_by_role("button", name="Simpan dan lanjutkan").click()
            await page.wait_for_url("**/profile")
            await page.get_by_role("button", name="Keluar", exact=True).click()
            await page.wait_for_url("**/?tab=forum")
            report["resend_invalidates_previous_code"] = True
            await open_auth()
            await page.get_by_label("Email", exact=True).fill(email)
            await page.get_by_label("Password", exact=True).fill(PASSWORD)
            await page.get_by_role("button", name="Masuk dan kirim kode", exact=True).click()
            await page.get_by_label("Kode email").wait_for()
            code = next(d["code"] for d in reversed(json.loads((fixture / "deliveries.json").read_text())) if d["email"] == email)
            await page.get_by_label("Kode email").fill(code)
            await page.get_by_role("button", name="Verifikasi", exact=True).click()
            await page.wait_for_url("**/profile")
            assert not await page.get_by_role("dialog").count()
            assert await page.get_by_label("Username", exact=True).input_value() == "interaction_user"
            report["returning_account_skips_onboarding"] = True
            await page.get_by_role("button", name="Keluar", exact=True).click()
            await page.wait_for_url("**/?tab=forum")
            await open_auth()
            await page.get_by_role("button", name="Daftar", exact=True).click()
            await page.get_by_label("Email", exact=True).fill("cancel-ui@example.test")
            await page.get_by_label("Buat password", exact=True).fill(PASSWORD)
            await page.get_by_label("Konfirmasi password", exact=True).fill(PASSWORD)
            await page.get_by_role("button", name="Daftar dan kirim kode", exact=True).click()
            await page.get_by_label("Kode email").wait_for()
            flow = json.loads(await page.evaluate("sessionStorage.getItem('buktipulih_email_auth_flow_v1')"))
            cancel_code = next(d["code"] for d in reversed(json.loads((fixture / "deliveries.json").read_text())) if d["email"] == "cancel-ui@example.test")
            await page.get_by_role("button", name="Ubah data", exact=True).focus()
            await page.keyboard.press("Tab")
            assert await page.get_by_role("button", name="Tutup dialog").evaluate("el => el === document.activeElement")
            await page.keyboard.press("Shift+Tab")
            assert await page.get_by_role("button", name="Ubah data", exact=True).evaluate("el => el === document.activeElement")
            report["keyboard_focus_trapped"] = True
            now += 301_000
            (fixture / "clock.json").write_text(json.dumps({"now": now}))
            await page.clock.fast_forward(301_000)
            await page.get_by_role("dialog").get_by_text("Kode kedaluwarsa. Kirim kode baru untuk melanjutkan.", exact=True).wait_for()
            assert await page.get_by_role("button", name="Verifikasi", exact=True).is_disabled()
            report["expired_code_disabled"] = True
            await page.get_by_role("button", name="Ubah data", exact=True).click()
            await page.get_by_label("Email", exact=True).wait_for()
            cancelled = await page.request.post(BASE + "/api/v1/auth/email/verify", headers={"Origin": BASE}, data={"flow_id": flow["flow_id"], "code": cancel_code})
            assert cancelled.status == 410
            report["change_email_cancels_server_flow"] = True
            await page.keyboard.press("Escape")
            report["browser_errors"] = errors
            assert not errors
            await context.close()
            await b.close()
    finally:
        env_file.write_text(original)
        (OUT / "implementation-interactions-report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report))
if __name__ == "__main__":
    import sys
    asyncio.run(main(sys.argv[1]))
