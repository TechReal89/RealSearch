"""RealSearch Client - Entry point."""
import asyncio
import sys
import tkinter as tk
from tkinter import ttk

from src.config import get_version
from src.utils.logger import log


def check_update_on_startup():
    """Kiểm tra cập nhật TRƯỚC khi hiện login. Hiện splash nếu có update."""
    if not getattr(sys, 'frozen', False):
        return  # Dev mode, bỏ qua

    try:
        loop = asyncio.new_event_loop()
        from src.utils.updater import check_for_update, download_and_update

        update = loop.run_until_complete(check_for_update())
        if update:
            version = update['version']
            log.info(f"Có bản mới: v{version}")

            # Hiện cửa sổ thông báo đang cập nhật
            splash = tk.Tk()
            splash.title("RealSearch - Cập nhật")
            splash.geometry("400x150")
            splash.resizable(False, False)
            # Center window
            splash.eval('tk::PlaceWindow . center')

            ttk.Label(
                splash,
                text=f"Đang cập nhật lên phiên bản v{version}...",
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
            # Nếu đến đây mà chưa exit = update failed, tiếp tục bình thường
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
    log.info(f"RealSearch Client v{version} khởi động")

    # Kiểm tra cập nhật trước khi hiện login
    check_update_on_startup()

    from src.ui.login_window import LoginWindow
    login = LoginWindow(on_login_success)
    login.run()


if __name__ == "__main__":
    main()
