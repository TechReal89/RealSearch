"""Windows Autostart - Khởi động cùng Windows."""
import sys
import os

from src.utils.logger import log

REGISTRY_KEY = r"Software\Microsoft\Windows\CurrentVersion\Run"
APP_NAME = "RealSearch"


def _get_exe_path() -> str:
    """Lấy đường dẫn .exe đã cài đặt."""
    if getattr(sys, 'frozen', False):
        app_dir = os.path.join(os.environ.get("APPDATA", ""), "RealSearch")
        return os.path.join(app_dir, "RealSearch.exe")
    return sys.executable


def is_autostart_enabled() -> bool:
    """Kiểm tra xem autostart có đang bật không."""
    if sys.platform != "win32":
        return False
    try:
        import winreg
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, REGISTRY_KEY, 0, winreg.KEY_READ)
        try:
            value, _ = winreg.QueryValueEx(key, APP_NAME)
            winreg.CloseKey(key)
            return bool(value)
        except FileNotFoundError:
            winreg.CloseKey(key)
            return False
    except Exception:
        return False


def enable_autostart() -> bool:
    """Bật khởi động cùng Windows (Registry)."""
    if sys.platform != "win32":
        log.warning("Autostart chỉ hỗ trợ Windows")
        return False

    try:
        import winreg
        exe_path = _get_exe_path()
        # Thêm flag --autostart để app biết là auto-launch
        value = f'"{exe_path}" --autostart'

        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, REGISTRY_KEY, 0, winreg.KEY_SET_VALUE)
        winreg.SetValueEx(key, APP_NAME, 0, winreg.REG_SZ, value)
        winreg.CloseKey(key)

        log.info(f"Đã bật khởi động cùng Windows: {value}")
        return True
    except Exception as e:
        log.error(f"Không thể bật autostart: {e}")
        return False


def disable_autostart() -> bool:
    """Tắt khởi động cùng Windows."""
    if sys.platform != "win32":
        return False

    try:
        import winreg
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, REGISTRY_KEY, 0, winreg.KEY_SET_VALUE)
        try:
            winreg.DeleteValue(key, APP_NAME)
        except FileNotFoundError:
            pass
        winreg.CloseKey(key)

        log.info("Đã tắt khởi động cùng Windows")
        return True
    except Exception as e:
        log.error(f"Không thể tắt autostart: {e}")
        return False
