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
datas = [
    # Bundle frontend dist as 'static/'
    (frontend_dist, 'static'),
]

env_file = os.path.join(backend_dir, '.env')
if os.path.exists(env_file):
    datas.append((env_file, '.'))

a = Analysis(
    ['main.py'],
    pathex=[backend_dir],
    binaries=[],
    datas=datas,
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
