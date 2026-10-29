# Verify password plus OTP login and recovery against a private captured-mail test server.
import asyncio
import json
import os
from pathlib import Path
from playwright.async_api import async_playwright
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / os.environ.get("PASSWORD_TEST_OUTPUT", "knowledge/password-otp-2026-10-28")
BASE = "http://localhost:3001"
PASSWORD = os.environ.get("PASSWORD_TEST_VALUE", "BrowserRegistrationPassword2026!")
NEW_PASSWORD = os.environ.get("PASSWORD_TEST_REPLACEMENT", "BrowserReplacementPassword2027!")
async def main(folder):
    fixture = Path(folder)
    assert fixture.parent == Path("/tmp") and fixture.name.startswith("buktipulih_auth_browser_test_")
    env_file = ROOT / ".env.local"
    original = env_file.read_text()
    report = {}
    try:
        env_file.write_text(original.replace("API_UPSTREAM_URL=http://localhost:5000/api/v1", "API_UPSTREAM_URL=http://localhost:5002/api/v1"))
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            context = await browser.new_context(viewport={"width": 390, "height": 844})
            page = await context.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            now = json.loads((fixture / "clock.json").read_text())["now"] + 16 * 60_000
            (fixture / "clock.json").write_text(json.dumps({"now": now}))
            await page.clock.install(time=now)
            page.set_default_timeout(15000)
            email = os.environ.get("PASSWORD_TEST_EMAIL", "password-ui@example.test")
            def latest_code():
                return next(item["code"] for item in reversed(json.loads((fixture / "deliveries.json").read_text())) if item["email"] == email)
            async def open_login():
                await page.goto(BASE + "/?tab=forum", wait_until="domcontentloaded")
                await page.wait_for_timeout(800)
                await page.get_by_role("button", name="Buka navigasi").click()
                await page.get_by_role("button", name="Masuk", exact=True).click()
            await open_login()
            await page.get_by_role("button", name="Daftar", exact=True).click()
            await page.get_by_label("Email", exact=True).fill(email)
            await page.get_by_label("Buat password", exact=True).fill("Rimba#2")
            await page.get_by_label("Konfirmasi password", exact=True).fill("Rimba#2")
            await page.get_by_role("button", name="Daftar dan kirim kode", exact=True).click()
            await page.get_by_text("Gunakan password 8-128 karakter tanpa spasi.", exact=True).wait_for()
            assert not any(item["email"] == email for item in json.loads((fixture / "deliveries.json").read_text()))
            report["seven_characters_rejected_before_otp"] = True
            await page.get_by_label("Buat password", exact=True).fill(PASSWORD)
            for width, height in [(1440, 1000), (320, 740), (390, 844)]:
                await page.set_viewport_size({"width": width, "height": height})
                await page.get_by_text("8-128 karakter, tanpa spasi.", exact=True).wait_for()
                assert await page.evaluate("document.documentElement.scrollWidth <= innerWidth")
                await page.screenshot(path=str(OUT / f"register-{width}.png"))
            report["password_hint_desktop_and_mobile"] = True
            await page.get_by_label("Konfirmasi password", exact=True).fill("IncorrectConfirmation2026!")
            await page.get_by_role("button", name="Daftar dan kirim kode", exact=True).click()
            await page.get_by_role("dialog").get_by_text("Konfirmasi password belum cocok.", exact=True).wait_for()
            assert not any(item["email"] == email for item in json.loads((fixture / "deliveries.json").read_text()))
            report["confirmation_checked_before_send"] = True
            await page.get_by_label("Konfirmasi password", exact=True).fill(PASSWORD)
            await page.get_by_role("button", name="Daftar dan kirim kode", exact=True).click()
            await page.get_by_label("Kode email").wait_for()
            assert not (await page.request.get(BASE + "/api/v1/auth/me")).ok
            stored = await page.evaluate("JSON.stringify({local:{...localStorage},session:{...sessionStorage}})")
            assert PASSWORD not in stored and latest_code() not in stored
            await page.get_by_label("Kode email").fill(latest_code())
            await page.get_by_role("button", name="Verifikasi", exact=True).click()
            await page.get_by_label("Username", exact=True).fill("password_ui_user")
            await page.get_by_role("combobox", name="Sebagai siapa?").select_option("observer")
            await page.get_by_role("button", name="Simpan dan lanjutkan").click()
            await page.wait_for_url("**/profile")
            first_user = (await (await page.request.get(BASE + "/api/v1/auth/me")).json())["data"]["user"]
            await page.get_by_role("button", name="Keluar", exact=True).click()
            await page.wait_for_url("**/?tab=forum")
            await open_login()
            await page.get_by_label("Email", exact=True).fill(email)
            await page.get_by_label("Password", exact=True).fill("WrongBrowserPassword2026!")
            count_before = len(json.loads((fixture / "deliveries.json").read_text()))
            await page.get_by_role("button", name="Masuk dan kirim kode", exact=True).click()
            await page.get_by_role("dialog").get_by_text("Email atau password tidak cocok.", exact=True).wait_for()
            assert len(json.loads((fixture / "deliveries.json").read_text())) == count_before
            report["wrong_password_sends_no_otp"] = True
            await page.get_by_label("Password", exact=True).fill(PASSWORD)
            await page.get_by_role("button", name="Masuk dan kirim kode", exact=True).click()
            await page.get_by_label("Kode email").wait_for()
            assert not (await page.request.get(BASE + "/api/v1/auth/me")).ok
            report["password_alone_has_no_session"] = True
            await page.get_by_label("Kode email").fill(latest_code())
            await page.get_by_role("button", name="Verifikasi", exact=True).click()
            await page.wait_for_url("**/profile")
            assert await page.get_by_label("Username", exact=True).input_value() == "password_ui_user"
            await page.get_by_role("button", name="Keluar", exact=True).click()
            await page.wait_for_url("**/?tab=forum")
            await open_login()
            await page.get_by_role("button", name="Lupa password?", exact=True).click()
            await page.get_by_label("Email", exact=True).fill(email)
            await page.get_by_role("button", name="Kirim kode pemulihan", exact=True).click()
            await page.get_by_label("Kode email").wait_for()
            await page.get_by_label("Kode email").fill(latest_code())
            await page.get_by_role("button", name="Verifikasi", exact=True).click()
            await page.get_by_role("heading", name="Password baru", exact=True).wait_for()
            assert not (await page.request.get(BASE + "/api/v1/auth/me")).ok
            await page.get_by_label("Buat password", exact=True).fill(NEW_PASSWORD)
            await page.get_by_label("Konfirmasi password", exact=True).fill(NEW_PASSWORD)
            await page.screenshot(path=str(OUT / "reset-password-390.png"))
            await page.get_by_role("button", name="Simpan password", exact=True).click()
            await page.get_by_role("dialog").get_by_text("Password berhasil diubah. Masuk dengan password baru.", exact=True).wait_for()
            assert not (await page.request.get(BASE + "/api/v1/auth/me")).ok
            report["reset_does_not_sign_in"] = True
            now += 16 * 60_000
            (fixture / "clock.json").write_text(json.dumps({"now": now}))
            await page.clock.fast_forward(16 * 60_000)
            await page.get_by_label("Password", exact=True).fill(PASSWORD)
            await page.get_by_role("button", name="Masuk dan kirim kode", exact=True).click()
            await page.get_by_role("dialog").get_by_text("Email atau password tidak cocok.", exact=True).wait_for()
            await page.get_by_label("Password", exact=True).fill(NEW_PASSWORD)
            await page.get_by_role("button", name="Masuk dan kirim kode", exact=True).click()
            await page.get_by_label("Kode email").wait_for()
            await page.get_by_label("Kode email").fill(latest_code())
            await page.get_by_role("button", name="Verifikasi", exact=True).click()
            await page.wait_for_url("**/profile")
            user = (await (await page.request.get(BASE + "/api/v1/auth/me")).json())["data"]["user"]
            assert user["id"] == first_user["id"]
            assert user["username"] == first_user["username"]
            assert "password_hash" not in user and "password_version" not in user
            report["new_password_plus_new_otp_preserves_account"] = True
            report["browser_errors"] = errors
            assert not errors
            await context.close()
            await browser.close()
    finally:
        env_file.write_text(original)
        (OUT / "password-interactions-report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report))
if __name__ == "__main__":
    import sys
    asyncio.run(main(sys.argv[1]))
