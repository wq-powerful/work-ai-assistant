import argparse
import uvicorn
from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from config import IS_PACKAGED, STATIC_DIR, get_cors_origins
from routers import chat, knowledge, settings

app = FastAPI(title="Work AI Assistant", version="1.0.0")

# CORS configuration for frontend dev server and externally hosted frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(chat.router)
app.include_router(knowledge.router)
app.include_router(settings.router)


def get_packaged_static_dir():
    if not (IS_PACKAGED and STATIC_DIR):
        return None

    static_dir = STATIC_DIR.resolve()
    assets_dir = static_dir / "assets"
    index_file = static_dir / "index.html"

    if not static_dir.is_dir():
        print(f"Packaged static directory not found: {static_dir}")
        return None

    if not assets_dir.is_dir():
        print(f"Packaged assets directory not found: {assets_dir}")
        return None

    if not index_file.is_file():
        print(f"Packaged index file not found: {index_file}")
        return None

    return static_dir


PACKAGED_STATIC_DIR = get_packaged_static_dir()


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Work AI Assistant backend is running"}


# In packaged mode, serve frontend static files
if PACKAGED_STATIC_DIR:
    # Serve static assets (js, css, images, etc.)
    app.mount("/assets", StaticFiles(directory=str(PACKAGED_STATIC_DIR / "assets")), name="static-assets")

    # Serve other static files (favicon, logo, etc.)
    @app.get("/logo.svg")
    async def serve_logo():
        logo_path = PACKAGED_STATIC_DIR / "logo.svg"
        if not logo_path.is_file():
            raise HTTPException(status_code=404, detail="Not Found")
        return FileResponse(str(logo_path))

    # SPA fallback: serve index.html for all non-API routes
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept API routes
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        file_path = PACKAGED_STATIC_DIR / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(PACKAGED_STATIC_DIR / "index.html"))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    uvicorn.run(
        "main:app" if not IS_PACKAGED else app,
        host="127.0.0.1",
        port=args.port,
        reload=not IS_PACKAGED,
    )
