"""Browser lifecycle + stealth management."""
import asyncio
import os
import subprocess
import sys

from playwright.async_api import async_playwright, Browser, BrowserContext, Page

from src.config import config, APP_DIR
from src.utils.logger import log

_playwright = None
_browser: Browser | None = None


_browsers_checked = False


def _get_browsers_path() -> str:
    """Trả về thư mục lưu Chromium cố định (không bị xóa khi tắt app)."""
    browsers_dir = str(APP_DIR / "browsers")
    os.makedirs(browsers_dir, exist_ok=True)
    return browsers_dir


def ensure_browsers_installed():
    """Kiểm tra và tự động cài đặt Chromium nếu chưa có."""
    global _browsers_checked
    if _browsers_checked:
        return
    _browsers_checked = True

    # Set PLAYWRIGHT_BROWSERS_PATH to persistent directory
    # This ensures Chromium is downloaded to %APPDATA%/RealSearch/browsers
    # instead of the temp _MEIPASS directory
    browsers_path = _get_browsers_path()
    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = browsers_path

    try:
        if getattr(sys, 'frozen', False):
            # Đang chạy từ PyInstaller .exe
            base_dir = sys._MEIPASS  # type: ignore
            driver_dir = os.path.join(base_dir, "playwright", "driver")
            if os.name == "nt":
                node_exe = os.path.join(driver_dir, "node.exe")
                cli_js = os.path.join(driver_dir, "package", "cli.js")
            else:
                node_exe = os.path.join(driver_dir, "node")
                cli_js = os.path.join(driver_dir, "package", "cli.js")

            if os.path.exists(node_exe) and os.path.exists(cli_js):
                log.info("Kiểm tra và cài đặt trình duyệt Chromium (lần đầu có thể mất vài phút)...")
                env = os.environ.copy()
                env["PLAYWRIGHT_BROWSERS_PATH"] = browsers_path
                result = subprocess.run(
                    [node_exe, cli_js, "install", "chromium"],
                    capture_output=True, text=True, timeout=600,
                    env=env,
                    creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
                )
                if result.returncode == 0:
                    log.info(f"Chromium đã sẵn sàng ({browsers_path})")
                else:
                    log.warning(f"Cài Chromium: {result.stdout} {result.stderr}")
            else:
                log.warning("Không tìm thấy Playwright driver trong bundle")
        else:
            # Dev mode - dùng playwright install
            log.info("Kiểm tra trình duyệt Chromium...")
            result = subprocess.run(
                [sys.executable, "-m", "playwright", "install", "chromium"],
                capture_output=True, text=True, timeout=600,
            )
            if result.returncode == 0:
                log.info("Chromium đã sẵn sàng")
            else:
                log.warning(f"Cài Chromium: {result.stderr}")
    except Exception as e:
        log.error(f"Lỗi cài đặt trình duyệt: {e}")


async def init_browser() -> Browser:
    """Khởi tạo Playwright browser."""
    global _playwright, _browser

    if _browser and _browser.is_connected():
        return _browser

    # Đảm bảo browser đã được cài
    ensure_browsers_installed()

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
        "--deny-permission-prompts",
        "--disable-notifications",
        "--disable-translate",
    ]

    try:
        _browser = await _playwright.chromium.launch(
            headless=headless,
            args=launch_args,
        )
    except Exception as e:
        log.error(f"Không thể mở trình duyệt: {e}")
        # Thử lại với channel chrome (dùng Chrome đã cài trên máy)
        log.info("Thử dùng Chrome có sẵn trên máy...")
        _browser = await _playwright.chromium.launch(
            headless=headless,
            channel="chrome",
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

        // Permissions - deny geolocation, notifications, etc.
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => {
            if (parameters.name === 'geolocation' || parameters.name === 'notifications') {
                return Promise.resolve({state: 'denied', onchange: null});
            }
            return originalQuery(parameters);
        };

        // Block geolocation API
        navigator.geolocation.getCurrentPosition = (s, e) => {
            if (e) e({code: 1, message: 'User denied Geolocation'});
        };
        navigator.geolocation.watchPosition = (s, e) => {
            if (e) e({code: 1, message: 'User denied Geolocation'});
            return 0;
        };
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
