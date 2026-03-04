# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec file for Work AI Assistant backend

import os
import sys

block_cipher = None

# Paths
backend_dir = os.path.dirname(os.path.abspath(SPEC))
project_dir = os.path.dirname(backend_dir)
frontend_dist = os.path.join(project_dir, 'frontend', 'dist')
desktop_icon = os.path.join(project_dir, 'desktop', 'icon.ico')

a = Analysis(
    ['main.py'],
    pathex=[backend_dir],
    binaries=[],
    datas=[
        # Bundle frontend dist as 'static/'
        (frontend_dist, 'static'),
        # Bundle .env if exists
        ('.env', '.') if os.path.exists(os.path.join(backend_dir, '.env')) else (None, None),
    ],
    hiddenimports=[
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'sklearn.utils._typedefs',
        'sklearn.utils._heap',
        'sklearn.utils._sorting',
        'sklearn.utils._vector_sentinel',
        'sklearn.neighbors._partition_nodes',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

# Filter out None datas entries
a.datas = [(d, s, t) for d, s, t in a.datas if d is not None]

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # No console window (Electron manages it)
    icon=desktop_icon if os.path.exists(desktop_icon) else None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='backend',
)
