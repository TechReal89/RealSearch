"""RealSearch Client - Entry point."""
import asyncio
import sys

from src.config import get_version
from src.utils.logger import log


def on_login_success(user_data: dict):
    """Callback khi đăng nhập thành công."""
    from src.ui.main_window import MainWindow

    # Kiểm tra auto-update
    try:
        loop = asyncio.new_event_loop()
        from src.utils.updater import check_for_update, download_and_update
        update = loop.run_until_complete(check_for_update())
        if update:
            log.info(f"Có bản mới: v{update['version']}")
            updated = loop.run_until_complete(
                download_and_update(update["download_url"])
            )
            if updated:
                log.info("Đang cập nhật, app sẽ khởi động lại...")
                sys.exit(0)
        loop.close()
    except Exception as e:
        log.warning(f"Không thể kiểm tra cập nhật: {e}")

    window = MainWindow(user_data)
    window.run()


def main():
    log.info(f"RealSearch Client {get_version()} khởi động")

    from src.ui.login_window import LoginWindow
    login = LoginWindow(on_login_success)
    login.run()


if __name__ == "__main__":
    main()
