"""RealSearch Client - Entry point."""
import asyncio
import os
import shutil
import sys
import tkinter as tk
from tkinter import ttk

from src.config import get_version, get_app_dir
from src.utils.logger import log


def _get_bundled_icon_path() -> str:
    """Lấy đường dẫn icon.ico từ bundle PyInstaller."""
    if getattr(sys, 'frozen', False):
        base = sys._MEIPASS
    else:
        base = os.path.join(os.path.dirname(__file__), "..")
    return os.path.join(base, "assets", "icon.ico")


def self_install():
    """Tự cài đặt vào thư mục cố định (AppData/RealSearch).
    Nếu user chạy từ Downloads hay Desktop, copy vào AppData và chạy từ đó.
    """
    if not getattr(sys, 'frozen', False):
        return  # Dev mode

    current_exe = os.path.abspath(sys.executable)
    install_dir = get_app_dir()
    installed_exe = install_dir / "RealSearch.exe"

    # Nếu đã chạy từ thư mục cài đặt thì bỏ qua
    if os.path.abspath(str(installed_exe)) == current_exe:
        # Vẫn copy icon nếu chưa có (trường hợp cập nhật từ bản cũ)
        _copy_icon_to_install_dir(install_dir)
        return

    # Copy vào thư mục cài đặt
    try:
        install_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(current_exe, str(installed_exe))
        log.info(f"Đã cài đặt vào: {installed_exe}")

        # Copy icon.ico vào thư mục cài đặt
        _copy_icon_to_install_dir(install_dir)

        # Tạo shortcut trên Desktop
        try:
            desktop = os.path.join(os.environ.get("USERPROFILE", ""), "Desktop")
            if os.path.exists(desktop):
                _create_shortcut(str(installed_exe), desktop)
        except Exception:
            pass

        # Thông báo user
        import tkinter.messagebox as mb
        root = tk.Tk()
        root.withdraw()
        mb.showinfo(
            "Real SEO - Đã cài đặt",
            f"Real SEO đã được cài vào:\n{installed_exe}\n\n"
            f"Shortcut đã tạo trên Desktop.\n"
            f"Bạn có thể xoá file hiện tại tại:\n{current_exe}"
        )
        root.destroy()
    except Exception as e:
        log.warning(f"Không thể tự cài đặt: {e}")


def _copy_icon_to_install_dir(install_dir):
    """Copy icon.ico từ bundle vào thư mục cài đặt."""
    try:
        bundled_icon = _get_bundled_icon_path()
        if os.path.exists(bundled_icon):
            dest_dir = install_dir / "assets"
            dest_dir.mkdir(parents=True, exist_ok=True)
            dest_icon = dest_dir / "icon.ico"
            shutil.copy2(bundled_icon, str(dest_icon))
            log.info(f"Đã copy icon vào: {dest_icon}")
        else:
            log.warning(f"Không tìm thấy icon bundled: {bundled_icon}")
    except Exception as e:
        log.warning(f"Không thể copy icon: {e}")


def _create_shortcut(target_exe: str, desktop_path: str):
    """Tạo shortcut .lnk trên Desktop bằng PowerShell."""
    import subprocess
    shortcut_path = os.path.join(desktop_path, "RealSearch.lnk")

    # Sử dụng icon.ico từ thư mục cài đặt thay vì icon nhúng trong .exe
    install_dir = os.path.dirname(target_exe)
    icon_path = os.path.join(install_dir, "assets", "icon.ico")
    # Fallback về exe nếu icon file không tồn tại
    icon_location = f"{icon_path},0" if os.path.exists(icon_path) else f"{target_exe},0"

    ps_script = f"""
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut("{shortcut_path}")
$sc.TargetPath = "{target_exe}"
$sc.WorkingDirectory = "{os.path.dirname(target_exe)}"
$sc.Description = "RealSearch Client"
$sc.IconLocation = "{icon_location}"
$sc.Save()
"""
    subprocess.run(
        ["powershell", "-Command", ps_script],
        capture_output=True,
        creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
    )
    log.info(f"Đã tạo shortcut: {shortcut_path} (icon: {icon_location})")


def check_update_on_startup():
    """Kiểm tra cập nhật TRƯỚC khi hiện login."""
    if not getattr(sys, 'frozen', False):
        return  # Dev mode

    try:
        loop = asyncio.new_event_loop()
        from src.utils.updater import check_for_update, download_and_update

        update = loop.run_until_complete(check_for_update())
        if update:
            version = update['version']
            log.info(f"Có bản mới: v{version}")

            # Hiện cửa sổ thông báo đang cập nhật
            splash = tk.Tk()
            splash.title("Real SEO - Cập nhật")
            splash.geometry("400x150")
            splash.resizable(False, False)
            splash.eval('tk::PlaceWindow . center')

            ttk.Label(
                splash,
                text=f"Đang cập nhật lên v{version}...",
                font=("Segoe UI", 11),
            ).pack(pady=20)

            progress = ttk.Progressbar(splash, mode="indeterminate", length=300)
            progress.pack(pady=5)
            progress.start(15)

            lbl_status = ttk.Label(splash, text="Đang tải...", font=("Segoe UI", 9))
            lbl_status.pack(pady=5)

            def do_update():
                try:
                    updated = loop.run_until_complete(
                        download_and_update(update["download_url"])
                    )
                    loop.close()
                    if updated:
                        lbl_status.config(text="Cập nhật xong! Đang khởi động lại...")
                        splash.after(1500, lambda: sys.exit(0))
                    else:
                        splash.destroy()
                except Exception as e:
                    log.warning(f"Cập nhật thất bại: {e}")
                    splash.destroy()

            splash.after(500, do_update)
            splash.mainloop()
        else:
            loop.close()
    except Exception as e:
        log.warning(f"Không thể kiểm tra cập nhật: {e}")


def on_login_success(user_data: dict):
    """Callback khi đăng nhập thành công."""
    from src.ui.main_window import MainWindow
    window = MainWindow(user_data)
    window.run()


def main():
    version = get_version()
    log.info(f"Real SEO v{version} khởi động")

    # Tự cài đặt vào thư mục cố định nếu chạy lần đầu
    self_install()

    # Kiểm tra cập nhật trước khi hiện login
    check_update_on_startup()

    from src.ui.login_window import LoginWindow
    login = LoginWindow(on_login_success)
    login.run()


if __name__ == "__main__":
    main()
