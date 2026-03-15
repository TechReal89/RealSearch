"""Client configuration - lưu local bằng JSON."""
import json
import os
import sys
from pathlib import Path


def get_app_dir() -> Path:
    """Thư mục lưu config, log."""
    if getattr(sys, 'frozen', False):
        base = Path(os.environ.get("APPDATA", Path.home())) / "RealSearch"
    else:
        base = Path(__file__).parent.parent / "data"
    base.mkdir(parents=True, exist_ok=True)
    return base


def get_icon_path() -> str | None:
    """Trả về đường dẫn file icon.ico."""
    if getattr(sys, 'frozen', False):
        icon = Path(sys._MEIPASS) / "assets" / "icon.ico"  # type: ignore
    else:
        icon = Path(__file__).parent.parent / "assets" / "icon.ico"
    if icon.exists():
        return str(icon)
    return None


def get_version() -> str:
    """Đọc version từ file VERSION."""
    # Khi đóng gói PyInstaller, file nằm ở _MEIPASS root
    if getattr(sys, 'frozen', False):
        version_file = Path(sys._MEIPASS) / "VERSION"  # type: ignore
    else:
        version_file = Path(__file__).parent / "VERSION"
    if version_file.exists():
        return version_file.read_text().strip()
    return "0.0.1-dev"


APP_DIR = get_app_dir()
CONFIG_FILE = APP_DIR / "config.json"
LOG_FILE = APP_DIR / "realsearch.log"

DEFAULT_CONFIG = {
    "server_url": "https://api.seo.toolsx.vn",
    "ws_url": "wss://api.seo.toolsx.vn/ws",
    "browser_mode": "headed_hidden",  # headless, headed_hidden, headed
    "enabled_job_types": ["viewlink", "keyword_seo", "backlink", "social_media"],
    "max_concurrent": 1,
    "auto_start": False,
    "proxy": None,  # {"host": "", "port": 0, "username": "", "password": ""}
    # Schedule
    "schedule_enabled": False,
    "schedule_time": "22:00",
    "schedule_stop_time": None,
    "schedule_days": [0, 1, 2, 3, 4, 5, 6],
    # Tray
    "minimize_to_tray": True,
    # Autostart
    "autostart_windows": False,
}


class Config:
    def __init__(self):
        self._data: dict = {}
        self.load()

    def load(self):
        if CONFIG_FILE.exists():
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                self._data = json.load(f)
        # Merge defaults
        for k, v in DEFAULT_CONFIG.items():
            if k not in self._data:
                self._data[k] = v
        # Migrate: old URLs to new domain
        old_urls = ["36.50.232.108:8000", "api.realsearch.techreal.vn"]
        current_url = self._data.get("server_url", "")
        if any(old in current_url for old in old_urls):
            self._data["server_url"] = DEFAULT_CONFIG["server_url"]
            self._data["ws_url"] = DEFAULT_CONFIG["ws_url"]
            self.save()

    def save(self):
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(self._data, f, indent=2, ensure_ascii=False)

    def get(self, key: str, default=None):
        return self._data.get(key, default)

    def set(self, key: str, value):
        self._data[key] = value
        self.save()

    @property
    def server_url(self) -> str:
        return self._data["server_url"]

    @property
    def ws_url(self) -> str:
        return self._data["ws_url"]

    @property
    def browser_mode(self) -> str:
        return self._data["browser_mode"]

    @property
    def enabled_job_types(self) -> list[str]:
        return self._data["enabled_job_types"]

    @property
    def max_concurrent(self) -> int:
        return self._data["max_concurrent"]


config = Config()
