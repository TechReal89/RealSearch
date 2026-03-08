# -*- mode: python ; coding: utf-8 -*-
import os
import playwright

# Tìm thư mục driver của Playwright
pw_dir = os.path.dirname(playwright.__file__)
driver_dir = os.path.join(pw_dir, 'driver')

a = Analysis(
    ['src/main.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('src/VERSION', '.'),
        (driver_dir, 'playwright/driver'),
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
    upx=True,
    console=False,  # Ẩn console window
    icon=None,  # TODO: thêm icon sau
)
