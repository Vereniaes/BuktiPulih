# Verify the real email UI through the API proxy and a test-only captured mailer.
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
PASSWORD = "BrowserForestPassword2026!"
OUTPUT = ROOT / "knowledge/password-otp-2026-10-28"
BASE = "http://localhost:3001"

async def run(folder):
    fixture = Path(folder)
    assert fixture.parent == Path("/tmp") and fixture.name.startswith("buktipulih_auth_browser_test_")
    assert (fixture / "clock.json").exists()
    env_file = ROOT / ".env.local"
    original = env_file.read_text()
    assert "API_UPSTREAM_URL=http://localhost:5000/api/v1" in original
    report = {"layouts": [], "browser_errors": [], "proxy": {}}
    try:
        env_file.write_text(original.replace("API_UPSTREAM_URL=http://localhost:5000/api/v1", "API_UPSTREAM_URL=http://localhost:5002/api/v1"))
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch()
            async def open_login(page, width):
                await page.goto(BASE + "/?tab=forum", wait_until="domcontentloaded")
                await page.wait_for_timeout(900)
                if width <= 1100:
                    await page.get_by_role("button", name="Buka navigasi").click()
                await page.get_by_role("button", name="Masuk", exact=True).click()
                await page.get_by_role("dialog").wait_for()

            for index, (width, height, theme) in enumerate([(390, 844, "light"), (1440, 1000, "light"), (320, 740, "light"), (932, 430, "dark")]):
                context = await browser.new_context(viewport={"width": width, "height": height})
                page = await context.new_page()
                page.set_default_timeout(15000)
                page.on("pageerror", lambda error: report["browser_errors"].append(str(error)))
                await open_login(page, width)
                if theme == "dark":
                    await page.evaluate("document.documentElement.dataset.theme = 'dark'")
                dialog = page.get_by_role("dialog")
                assert "WHATSAPP" not in await dialog.inner_text() and "PIN" not in await dialog.inner_text()
                assert await page.get_by_label("Email", exact=True).evaluate("el => el === document.activeElement")
                await page.screenshot(path=str(OUTPUT / f"auth-email-{width}-{theme}.png"))
                email = f"ui-{index}@example.test"
                await page.get_by_role("button", name="Daftar", exact=True).click()
                await page.get_by_label("Email", exact=True).fill(email)
                await page.get_by_label("Buat password", exact=True).fill(PASSWORD)
                await page.get_by_label("Konfirmasi password", exact=True).fill(PASSWORD)
                await page.screenshot(path=str(OUTPUT / f"auth-register-{width}-{theme}.png"))
                await page.get_by_role("button", name="Daftar dan kirim kode", exact=True).click()
                await page.get_by_label("Kode email", exact=True).wait_for()
                deliveries = json.loads((fixture / "deliveries.json").read_text())
                code = next(item["code"] for item in reversed(deliveries) if item["email"] == email)
                assert await page.get_by_role("button", name="Kirim ulang dalam", exact=False).is_disabled()
                assert await page.get_by_label("Kode email").get_attribute("autocomplete") == "one-time-code"
                await page.screenshot(path=str(OUTPUT / f"auth-code-{width}-{theme}.png"))
                wrong = "99999999" if code != "99999999" else "00000000"
                await page.get_by_label("Kode email").fill(wrong)
                await page.get_by_role("button", name="Verifikasi", exact=True).click()
                await dialog.get_by_text("Kode tidak cocok atau sudah tidak berlaku.", exact=True).wait_for()
                await page.get_by_label("Kode email").fill(code)
                await page.get_by_role("button", name="Verifikasi", exact=True).click()
                await page.get_by_label("Username", exact=True).wait_for()
                assert await page.get_by_role("combobox", name="Sebagai siapa?").input_value() == ""
                options = await page.get_by_role("combobox", name="Sebagai siapa?").locator("option").all_text_contents()
                assert options == ["Pilih salah satu", "Saya Relawan", "Saya Terdampak", "Saya Cuman mau Nimbrung"]
                assert await page.get_by_role("button", name="Simpan dan lanjutkan").is_disabled()
                await page.get_by_label("Username", exact=True).fill(f"field_ui_{index}")
                await page.get_by_label("Kamu dari mana?", exact=False).fill("Ketapang")
                await page.get_by_role("combobox", name="Sebagai siapa?").select_option(["observer", "volunteer", "affected", "observer"][index])
                await page.screenshot(path=str(OUTPUT / f"auth-profile-{width}-{theme}.png"))
                assert not await page.evaluate("document.documentElement.scrollWidth > innerWidth")
                await page.get_by_role("button", name="Simpan dan lanjutkan").click()
                await page.wait_for_url("**/profile")
                await page.get_by_role("heading", name="Profil", exact=True).wait_for()
                me = await page.request.get(BASE + "/api/v1/auth/me")
                assert me.status == 200
                user = (await me.json())["data"]["user"]
                assert user["username"] == f"field_ui_{index}" and user["role"] == "PUBLIC_GUEST" and user["phone_number"] is None
                assert user["email"] == email and user["city"] == "Ketapang"
                assert "full_name" not in user
                assert not any("session" in key for key in await page.evaluate("Object.keys(localStorage)"))
                cookies = await context.cookies()
                assert all(cookie["httpOnly"] for cookie in cookies if cookie["name"] in ["bp_session", "bp_auth_proof"])
                await page.reload(wait_until="domcontentloaded")
                await page.get_by_label("Username", exact=True).wait_for()
                assert await page.get_by_label("Username", exact=True).input_value() == f"field_ui_{index}"
                await page.get_by_role("button", name="Keluar", exact=True).click()
                await page.wait_for_url("**/?tab=forum")
                assert (await page.request.get(BASE + "/api/v1/auth/me")).status == 401
                report["layouts"].append({"width": width, "height": height, "theme": theme, "email_code_profile": True, "wrong_code": True, "profile_reload": True, "logout_revoked": True, "overflow": False})
                await context.close()

            # Requests cannot cross the proxy's origin or route allowlist.
            context = await browser.new_context()
            page = await context.new_page()
            await page.goto(BASE, wait_until="domcontentloaded")
            cross = await page.request.post(BASE + "/api/v1/auth/email/start", headers={"Origin": "https://attacker.example", "Content-Type": "application/json"}, data="{}")
            assert cross.status == 403
            internal = await page.request.post(BASE + "/api/v1/internal/satellite/sync", headers={"Origin": BASE, "Content-Type": "application/json"}, data="{}")
            assert internal.status == 404
            report["proxy"] = {"cross_origin_denied": True, "internal_worker_blocked": True}
            await context.close()
            await browser.close()
    finally:
        env_file.write_text(original)
        (OUTPUT / "implementation-browser-report.json").write_text(json.dumps(report, indent=2) + "\n")
    assert not report["browser_errors"], report["browser_errors"]
    print(json.dumps(report, ensure_ascii=False))

if __name__ == "__main__":
    import sys
    asyncio.run(run(sys.argv[1]))
