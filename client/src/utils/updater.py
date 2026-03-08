"""Auto-update mechanism - kiểm tra và tải bản mới từ GitHub Releases."""
import os
import shutil
import subprocess
import sys
import tempfile

import httpx

from src.config import get_version, get_app_dir
from src.utils.logger import log

GITHUB_API = "https://api.github.com/repos/TechReal89/RealSearch/releases/latest"

# Thư mục cài đặt cố định
INSTALL_DIR = get_app_dir()
INSTALLED_EXE = INSTALL_DIR / "RealSearch.exe"


def get_current_exe() -> str:
    """Lấy đường dẫn file .exe đang chạy."""
    if getattr(sys, 'frozen', False):
        return sys.executable
    return ""


async def check_for_update() -> dict | None:
    """Kiểm tra bản mới. Trả về info nếu có update."""
    current = get_version().lstrip("v")
    try:
        async with httpx.AsyncClient(timeout=15) as client:
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
            else:
                log.info(f"Đang dùng phiên bản mới nhất: v{current}")
    except Exception as e:
        log.warning(f"Không thể kiểm tra cập nhật: {e}")

    return None


async def download_and_update(download_url: str) -> bool:
    """Tải bản mới và thay thế file hiện tại."""
    if not getattr(sys, 'frozen', False):
        log.info("Chế độ dev, bỏ qua auto-update")
        return False

    try:
        current_exe = get_current_exe()
        temp_dir = tempfile.gettempdir()
        new_exe = os.path.join(temp_dir, "RealSearch_new.exe")

        log.info("Đang tải bản cập nhật...")
        async with httpx.AsyncClient(timeout=300, follow_redirects=True) as client:
            async with client.stream("GET", download_url) as resp:
                if resp.status_code != 200:
                    log.error(f"Tải thất bại: HTTP {resp.status_code}")
                    return False

                total = int(resp.headers.get("content-length", 0))
                downloaded = 0
                with open(new_exe, "wb") as f:
                    async for chunk in resp.aiter_bytes(chunk_size=65536):
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total > 0:
                            pct = int(downloaded / total * 100)
                            if pct % 20 == 0:
                                log.info(f"Đang tải: {pct}% ({downloaded // 1024 // 1024}MB)")

        log.info("Tải xong, đang cập nhật...")

        # Tạo batch script:
        # 1. Đợi app cũ tắt
        # 2. Copy bản mới ghi đè lên file đang chạy
        # 3. Copy vào thư mục cài đặt cố định (AppData/RealSearch)
        # 4. Xoá file tạm
        # 5. Khởi động lại từ vị trí hiện tại
        bat_path = os.path.join(temp_dir, "realsearch_update.bat")
        install_exe = str(INSTALLED_EXE)

        with open(bat_path, "w", encoding="utf-8") as f:
            f.write(f"""@echo off
chcp 65001 >nul
timeout /t 3 /nobreak >nul

rem Ghi de ban dang chay
copy /Y "{new_exe}" "{current_exe}" >nul 2>&1

rem Copy vao thu muc cai dat co dinh
if not exist "{INSTALL_DIR}" mkdir "{INSTALL_DIR}"
copy /Y "{new_exe}" "{install_exe}" >nul 2>&1

rem Xoa file tam
del /F /Q "{new_exe}" >nul 2>&1

rem Khoi dong lai
start "" "{current_exe}"

rem Xoa bat file
del /F /Q "%~f0" >nul 2>&1
""")

        subprocess.Popen(
            ["cmd", "/c", bat_path],
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
        )
        return True

    except Exception as e:
        log.error(f"Cập nhật thất bại: {e}")
        # Xoá file tạm nếu có
        try:
            new_exe_path = os.path.join(tempfile.gettempdir(), "RealSearch_new.exe")
            if os.path.exists(new_exe_path):
                os.remove(new_exe_path)
        except Exception:
            pass
        return False
