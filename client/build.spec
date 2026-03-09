# -*- mode: python ; coding: utf-8 -*-
import glob
import os
import sys
import playwright

# Tìm thư mục driver của Playwright
pw_dir = os.path.dirname(playwright.__file__)
driver_dir = os.path.join(pw_dir, 'driver')

# ===== Bundle VC++ Runtime DLLs để tránh lỗi "Failed to load Python DLL" =====
# python312.dll phụ thuộc: vcruntime140.dll, vcruntime140_1.dll, msvcp140.dll
# Nếu máy user chưa cài VC++ Redistributable 2015-2022 thì sẽ bị lỗi
vc_dlls = []
found_dlls = set()

# Tất cả các thư mục có thể chứa VC++ DLLs
python_dir = os.path.dirname(sys.executable)
search_dirs = [
    python_dir,
    os.path.join(python_dir, 'DLLs'),
    os.path.join(python_dir, 'Library', 'bin'),
    # Windows System directories
    os.path.join(os.environ.get('SystemRoot', r'C:\Windows'), 'System32'),
    os.path.join(os.environ.get('SystemRoot', r'C:\Windows'), 'SysWOW64'),
    # VC++ Redistributable directories
    os.path.join(os.environ.get('ProgramFiles', r'C:\Program Files'), 'Microsoft Visual Studio'),
]

# Thêm paths từ PATH environment
for p in os.environ.get('PATH', '').split(os.pathsep):
    if p and os.path.isdir(p):
        search_dirs.append(p)

# DLLs cần tìm
dll_patterns = [
    'vcruntime140.dll',
    'vcruntime140_1.dll',
    'msvcp140.dll',
    'msvcp140_1.dll',
    'python312.dll',
    'concrt140.dll',
    'vccorlib140.dll',
    'ucrtbase.dll',
]

# Tìm từng DLL trong tất cả search dirs
for dll_name in dll_patterns:
    if dll_name in found_dlls:
        continue
    for search_dir in search_dirs:
        dll_path = os.path.join(search_dir, dll_name)
        if os.path.exists(dll_path):
            vc_dlls.append((dll_path, '.'))
            found_dlls.add(dll_name)
            print(f"  [build.spec] Found {dll_name} in {search_dir}")
            break

# Tìm api-ms-win-crt-*.dll (Universal CRT) - cần cho Windows 7/8
for search_dir in search_dirs[:4]:  # Chỉ tìm trong Python dir và System32
    if not os.path.isdir(search_dir):
        continue
    for dll_path in glob.glob(os.path.join(search_dir, 'api-ms-win-crt-*.dll')):
        dll_name = os.path.basename(dll_path)
        if dll_name not in found_dlls:
            vc_dlls.append((dll_path, '.'))
            found_dlls.add(dll_name)

# Tìm thêm từ thư mục do GitHub Actions workflow copy sẵn
bundled_dlls_dir = os.path.join(os.path.dirname(os.path.abspath('.')), 'bundled_dlls')
if not os.path.isdir(bundled_dlls_dir):
    bundled_dlls_dir = os.path.join(os.path.abspath('.'), 'bundled_dlls')
if os.path.isdir(bundled_dlls_dir):
    print(f"  [build.spec] Found bundled_dlls dir: {bundled_dlls_dir}")
    for dll_path in glob.glob(os.path.join(bundled_dlls_dir, '*.dll')):
        dll_name = os.path.basename(dll_path)
        if dll_name not in found_dlls:
            vc_dlls.append((dll_path, '.'))
            found_dlls.add(dll_name)
            print(f"  [build.spec] Bundling from bundled_dlls: {dll_name}")

if vc_dlls:
    print(f"  [build.spec] Total DLLs bundled: {len(vc_dlls)}")
    for dll_path, _ in vc_dlls:
        print(f"    - {os.path.basename(dll_path)} ({os.path.getsize(dll_path):,} bytes)")
else:
    print("  [build.spec] WARNING: No VC++ runtime DLLs found to bundle!")

# Kiểm tra các DLL quan trọng có được tìm thấy không
critical_dlls = ['vcruntime140.dll', 'python312.dll']
for dll in critical_dlls:
    if dll not in found_dlls:
        print(f"  [build.spec] CRITICAL WARNING: {dll} NOT FOUND!")

a = Analysis(
    ['src/main.py'],
    pathex=[],
    binaries=vc_dlls,
    datas=[
        ('src/VERSION', '.'),           # Cho get_version() mới (_MEIPASS/VERSION)
        ('src/VERSION', 'src'),         # Cho get_version() cũ (_MEIPASS/src/VERSION)
        (driver_dir, 'playwright/driver'),
        ('assets/icon.ico', 'assets'),  # App icon
    ],
    hiddenimports=[
        'websockets',
        'httpx',
        'pydantic',
        'playwright',
        'playwright._impl',
        'playwright._impl._driver',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='RealSearch',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    icon='assets/icon.ico' if os.path.exists('assets/icon.ico') else None,
)
