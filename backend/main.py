import argparse
import uvicorn
from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from config import IS_PACKAGED, STATIC_DIR
from routers import chat, knowledge, settings

app = FastAPI(title="Work AI Assistant", version="1.0.0")

# CORS configuration for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(chat.router)
app.include_router(knowledge.router)
app.include_router(settings.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Work AI Assistant backend is running"}


# In packaged mode, serve frontend static files
if IS_PACKAGED and STATIC_DIR and STATIC_DIR.exists():
    # Serve static assets (js, css, images, etc.)
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="static-assets")

    # Serve other static files (favicon, logo, etc.)
    @app.get("/logo.svg")
    async def serve_logo():
        return FileResponse(str(STATIC_DIR / "logo.svg"))

    # SPA fallback: serve index.html for all non-API routes
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept API routes
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        file_path = STATIC_DIR / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(STATIC_DIR / "index.html"))


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
