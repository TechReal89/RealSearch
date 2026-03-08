"""Auto-update mechanism - kiểm tra và tải bản mới từ GitHub Releases."""
import os
import subprocess
import sys
import tempfile

import httpx

from src.config import config, get_version
from src.utils.logger import log

GITHUB_API = "https://api.github.com/repos/TechReal89/RealSearch/releases/latest"


async def check_for_update() -> dict | None:
    """Kiểm tra bản mới. Trả về info nếu có update."""
    current = get_version().lstrip("v")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(GITHUB_API)
            if resp.status_code != 200:
                return None

            data = resp.json()
            latest = data["tag_name"].lstrip("v")

            if latest > current:
                # Tìm file .exe trong assets
                download_url = None
                for asset in data.get("assets", []):
                    if asset["name"].endswith(".exe"):
                        download_url = asset["browser_download_url"]
                        break

                if download_url:
                    log.info(f"Phiên bản mới: v{latest} (hiện tại: v{current})")
                    return {
                        "version": latest,
                        "download_url": download_url,
                        "changelog": data.get("body", ""),
                    }
    except Exception as e:
        log.warning(f"Không thể kiểm tra cập nhật: {e}")

    return None


async def download_and_update(download_url: str) -> bool:
    """Tải bản mới và thay thế file hiện tại."""
    if not getattr(sys, 'frozen', False):
        log.info("Chế độ dev, bỏ qua auto-update")
        return False

    try:
        log.info("Đang tải bản cập nhật...")
        current_exe = sys.executable
        temp_dir = tempfile.gettempdir()
        new_exe = os.path.join(temp_dir, "RealSearch_new.exe")

        async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
            resp = await client.get(download_url)
            if resp.status_code != 200:
                log.error(f"Tải thất bại: HTTP {resp.status_code}")
                return False

            with open(new_exe, "wb") as f:
                f.write(resp.content)

        log.info("Tải xong, đang cập nhật...")

        # Tạo batch script để thay thế exe sau khi app tắt
        bat_path = os.path.join(temp_dir, "realsearch_update.bat")
        with open(bat_path, "w") as f:
            f.write(f"""@echo off
timeout /t 2 /nobreak >nul
copy /Y "{new_exe}" "{current_exe}"
del "{new_exe}"
start "" "{current_exe}"
del "%~f0"
""")

        subprocess.Popen(
            ["cmd", "/c", bat_path],
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
        )
        return True

    except Exception as e:
        log.error(f"Cập nhật thất bại: {e}")
        return False
