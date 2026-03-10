"""Browser lifecycle + stealth management."""
import asyncio
import os
import subprocess
import sys

from playwright.async_api import async_playwright, Browser, BrowserContext, Page

from src.browser.fingerprint import Fingerprint, generate_fingerprint
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

    # Headed hidden: đẩy cửa sổ ra ngoài màn hình + tắt âm thanh
    if mode == "headed_hidden":
        launch_args.extend([
            "--window-position=-2400,-2400",
            "--window-size=1366,768",
            "--mute-audio",
        ])

    # Ưu tiên Chrome hệ thống (anti-detection tốt hơn Chromium)
    try:
        _browser = await _playwright.chromium.launch(
            headless=headless,
            channel="chrome",
            args=launch_args,
        )
        log.info(f"Chrome hệ thống khởi tạo (mode={mode})")
    except Exception:
        log.info("Chrome không có sẵn, dùng Chromium bundled...")
        try:
            _browser = await _playwright.chromium.launch(
                headless=headless,
                args=launch_args,
            )
            log.info(f"Chromium khởi tạo (mode={mode})")
        except Exception as e:
            log.error(f"Không thể mở trình duyệt: {e}")
            raise

    return _browser


def _build_stealth_script(fp: Fingerprint) -> str:
    """Build stealth JavaScript injection script based on fingerprint."""
    return f"""
        // Hide webdriver
        Object.defineProperty(navigator, 'webdriver', {{get: () => undefined}});

        // Override plugins - realistic Chrome plugins
        Object.defineProperty(navigator, 'plugins', {{
            get: () => {{
                const plugins = [
                    {{name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format'}},
                    {{name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: ''}},
                    {{name: 'Native Client', filename: 'internal-nacl-plugin', description: ''}},
                ];
                plugins.length = 3;
                return plugins;
            }},
        }});

        // Override languages
        Object.defineProperty(navigator, 'languages', {{
            get: () => {fp.languages},
        }});

        // Hardware concurrency
        Object.defineProperty(navigator, 'hardwareConcurrency', {{
            get: () => {fp.hardware_concurrency},
        }});

        // Device memory
        Object.defineProperty(navigator, 'deviceMemory', {{
            get: () => {fp.device_memory},
        }});

        // Platform
        Object.defineProperty(navigator, 'platform', {{
            get: () => '{fp.platform}',
        }});

        // Chrome runtime
        window.chrome = {{
            runtime: {{
                PlatformOs: {{MAC: 'mac', WIN: 'win', ANDROID: 'android', CROS: 'cros', LINUX: 'linux', OPENBSD: 'openbsd'}},
                PlatformArch: {{ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64', MIPS: 'mips', MIPS64: 'mips64'}},
                PlatformNaclArch: {{ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64', MIPS: 'mips', MIPS64: 'mips64'}},
                RequestUpdateCheckStatus: {{THROTTLED: 'throttled', NO_UPDATE: 'no_update', UPDATE_AVAILABLE: 'update_available'}},
                OnInstalledReason: {{INSTALL: 'install', UPDATE: 'update', CHROME_UPDATE: 'chrome_update', SHARED_MODULE_UPDATE: 'shared_module_update'}},
                OnRestartRequiredReason: {{APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic'}},
            }},
            loadTimes: function() {{ return {{}}; }},
            csi: function() {{ return {{}}; }},
            app: {{isInstalled: false, InstallState: {{INSTALLED: 'installed', DISABLED: 'disabled'}}, RunningState: {{RUNNING: 'running', CANNOT_RUN: 'cannot_run'}} }},
        }};

        // WebGL spoofing
        const getParameterOrig = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(param) {{
            if (param === 37445) return '{fp.webgl_vendor}';
            if (param === 37446) return '{fp.webgl_renderer}';
            return getParameterOrig.call(this, param);
        }};
        const getParameterOrig2 = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = function(param) {{
            if (param === 37445) return '{fp.webgl_vendor}';
            if (param === 37446) return '{fp.webgl_renderer}';
            return getParameterOrig2.call(this, param);
        }};

        // Connection API spoof
        if (navigator.connection) {{
            Object.defineProperty(navigator.connection, 'rtt', {{get: () => 50}});
            Object.defineProperty(navigator.connection, 'downlink', {{get: () => 10}});
            Object.defineProperty(navigator.connection, 'effectiveType', {{get: () => '4g'}});
        }}

        // Permissions - deny geolocation, notifications
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => {{
            if (parameters.name === 'geolocation' || parameters.name === 'notifications') {{
                return Promise.resolve({{state: 'denied', onchange: null}});
            }}
            return originalQuery(parameters);
        }};

        // Block geolocation API
        navigator.geolocation.getCurrentPosition = (s, e) => {{
            if (e) e({{code: 1, message: 'User denied Geolocation'}});
        }};
        navigator.geolocation.watchPosition = (s, e) => {{
            if (e) e({{code: 1, message: 'User denied Geolocation'}});
            return 0;
        }};
    """


async def create_context(proxy: dict | None = None) -> BrowserContext:
    """Tạo browser context với stealth settings và fingerprint ngẫu nhiên."""
    browser = await init_browser()
    fp = generate_fingerprint()

    ctx_kwargs = {
        "viewport": fp.viewport,
        "user_agent": fp.user_agent,
        "locale": "vi-VN",
        "timezone_id": "Asia/Ho_Chi_Minh",
        "java_script_enabled": True,
    }

    # Proxy support
    if proxy:
        protocol = proxy.get("protocol", "http")
        server = f"{protocol}://{proxy['host']}:{proxy['port']}"
        ctx_kwargs["proxy"] = {"server": server}
        if proxy.get("username"):
            ctx_kwargs["proxy"]["username"] = proxy["username"]
            ctx_kwargs["proxy"]["password"] = proxy.get("password", "")
        log.info(f"Proxy: {proxy['host']}:{proxy['port']}")

    context = await browser.new_context(**ctx_kwargs)

    # Inject stealth scripts
    await context.add_init_script(_build_stealth_script(fp))

    log.debug(
        f"Context: viewport={fp.viewport['width']}x{fp.viewport['height']} "
        f"GPU={fp.webgl_renderer[:30]}..."
    )

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
