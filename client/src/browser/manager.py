"""Browser lifecycle + stealth management."""
import asyncio

from playwright.async_api import async_playwright, Browser, BrowserContext, Page

from src.config import config
from src.utils.logger import log

_playwright = None
_browser: Browser | None = None


async def init_browser() -> Browser:
    """Khởi tạo Playwright browser."""
    global _playwright, _browser

    if _browser and _browser.is_connected():
        return _browser

    _playwright = await async_playwright().start()

    mode = config.browser_mode
    headless = mode == "headless"

    launch_args = [
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
        "--no-first-run",
        "--disable-extensions",
        "--disable-default-apps",
        "--disable-popup-blocking",
    ]

    _browser = await _playwright.chromium.launch(
        headless=headless,
        args=launch_args,
    )

    log.info(f"Browser khởi tạo (mode={mode})")
    return _browser


async def create_context() -> BrowserContext:
    """Tạo browser context với stealth settings."""
    browser = await init_browser()

    context = await browser.new_context(
        viewport={"width": 1366, "height": 768},
        user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/131.0.0.0 Safari/537.36"
        ),
        locale="vi-VN",
        timezone_id="Asia/Ho_Chi_Minh",
        java_script_enabled=True,
    )

    # Stealth scripts
    await context.add_init_script("""
        // Hide webdriver
        Object.defineProperty(navigator, 'webdriver', {get: () => undefined});

        // Override plugins
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5],
        });

        // Override languages
        Object.defineProperty(navigator, 'languages', {
            get: () => ['vi-VN', 'vi', 'en-US', 'en'],
        });

        // Chrome runtime
        window.chrome = {runtime: {}};

        // Permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) =>
            parameters.name === 'notifications'
                ? Promise.resolve({state: Notification.permission})
                : originalQuery(parameters);
    """)

    return context


async def create_page(context: BrowserContext) -> Page:
    """Tạo page mới."""
    page = await context.new_page()
    page.set_default_timeout(30000)
    page.set_default_navigation_timeout(30000)
    return page


async def close_browser():
    """Đóng browser."""
    global _browser, _playwright

    if _browser:
        try:
            await _browser.close()
        except Exception:
            pass
        _browser = None

    if _playwright:
        try:
            await _playwright.stop()
        except Exception:
            pass
        _playwright = None

    log.info("Browser đã đóng")
