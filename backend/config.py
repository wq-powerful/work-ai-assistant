import json
import os
import sys
from collections.abc import Mapping
from pathlib import Path

APP_NAME = "WorkAIAssistant"
APP_DATA_DIR_ENV = "WORK_AI_ASSISTANT_DATA_DIR"
DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
)


def _resolve_home_dir(env: Mapping[str, str]) -> Path | None:
    home = (env.get("HOME") or "").strip()
    if home:
        return Path(home).expanduser()

    expanded_home = Path(os.path.expanduser("~"))
    if str(expanded_home) == "~":
        return None
    return expanded_home


def get_packaged_app_data_dir(
    *,
    platform: str | None = None,
    env: Mapping[str, str] | None = None,
    executable_dir: Path | None = None,
) -> Path:
    environ = os.environ if env is None else env
    platform_name = platform or sys.platform
    exe_dir = EXE_DIR if executable_dir is None else executable_dir

    override_dir = (environ.get(APP_DATA_DIR_ENV) or "").strip()
    if override_dir:
        return Path(override_dir).expanduser()

    if platform_name == "win32":
        base_dir = Path((environ.get("APPDATA") or "").strip() or exe_dir)
    elif platform_name == "darwin":
        home_dir = _resolve_home_dir(environ)
        base_dir = home_dir / "Library" / "Application Support" if home_dir else exe_dir
    else:
        xdg_data_home = (environ.get("XDG_DATA_HOME") or "").strip()
        if xdg_data_home:
            base_dir = Path(xdg_data_home).expanduser()
        else:
            home_dir = _resolve_home_dir(environ)
            base_dir = home_dir / ".local" / "share" if home_dir else exe_dir

    return base_dir / APP_NAME


def get_cors_origins(env: Mapping[str, str] | None = None) -> list[str]:
    environ = os.environ if env is None else env
    origins = list(DEFAULT_CORS_ORIGINS)
    extra_origins = [
        origin.strip()
        for origin in (environ.get("APP_CORS_ALLOW_ORIGINS") or "").split(",")
        if origin.strip()
    ]

    for origin in extra_origins:
        if origin not in origins:
            origins.append(origin)

    return origins


# Detect if running as a PyInstaller bundle
IS_PACKAGED = getattr(sys, 'frozen', False)

if IS_PACKAGED:
    # When packaged: bundle dir is sys._MEIPASS, exe dir is where the .exe lives
    BUNDLE_DIR = Path(sys._MEIPASS)
    EXE_DIR = Path(sys.executable).parent
    # Store user data in the platform-standard user data directory.
    APP_DATA_DIR = get_packaged_app_data_dir(executable_dir=EXE_DIR)
    # Static frontend files are bundled inside the exe
    STATIC_DIR = BUNDLE_DIR / "static"
else:
    BUNDLE_DIR = Path(__file__).parent
    EXE_DIR = BUNDLE_DIR
    APP_DATA_DIR = None  # Not used in dev mode
    STATIC_DIR = None

# Load .env file if python-dotenv available, otherwise rely on system env
try:
    from dotenv import load_dotenv
    env_path = BUNDLE_DIR / ".env" if IS_PACKAGED else Path(__file__).parent / ".env"
    load_dotenv(env_path)
except ImportError:
    pass

# Base directory for data storage
BASE_DIR = Path(__file__).parent if not IS_PACKAGED else BUNDLE_DIR
DATA_DIR = APP_DATA_DIR / "data" if IS_PACKAGED else BASE_DIR / "data"
CONFIG_FILE = DATA_DIR / "config.json"

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Default configuration - sensitive values from env vars
DEFAULT_CONFIG = {
    "api_base_url": os.environ.get("AI_API_BASE_URL", ""),
    "api_key": os.environ.get("AI_API_KEY", ""),
    "model": os.environ.get("AI_MODEL", "gpt-4o"),
    "temperature": 0.7,
    "max_tokens": 4096,
    "top_k": 5,
    "knowledge_base_path": "",
    "system_prompt": (
        "You are a dedicated Work AI Assistant. Your primary purpose is to help "
        "the user with work-related questions and tasks.\n\n"
        "When provided with [Knowledge Base File Inventory], it contains the COMPLETE "
        "and AUTHORITATIVE list of all files in the knowledge base. When the user asks "
        "about what files exist, how many files there are, or any metadata about the "
        "knowledge base, you MUST use ONLY this inventory. NEVER fabricate or guess "
        "file names that are not in the inventory.\n\n"
        "When provided with [Knowledge Base Context], you MUST:\n"
        "1. Prioritize information from the knowledge base context\n"
        "2. Cite or reference the source when using knowledge base information\n"
        "3. If the context partially answers the question, use it as a foundation "
        "and supplement with your own knowledge\n\n"
        "CRITICAL RULE - NEVER HALLUCINATE:\n"
        "- NEVER fabricate, invent, or guess information that is not in the provided context\n"
        "- If you don't know something or the context doesn't contain the answer, "
        "say so honestly\n"
        "- NEVER make up file names, document titles, or data that doesn't exist "
        "in the provided context\n"
        "- When listing files, ONLY list files that appear in the [Knowledge Base File Inventory]\n\n"
        "When NO knowledge base context is provided, or the question is unrelated "
        "to the uploaded documents:\n"
        "- Answer freely using your full general knowledge\n"
        "- There are no restrictions on what topics you can discuss\n\n"
        "Always respond in Simplified Chinese (\u7b80\u4f53\u4e2d\u6587).\n"
        "Be precise, professional, and helpful. Format your responses with proper "
        "markdown when appropriate."
    ),
    "theme": "light",
}


def _normalize_custom_path(path_value: str | None) -> str:
    """Normalize configured custom path (trim whitespace, handle None)."""
    return (path_value or "").strip()


def get_knowledge_base_root(config: dict | None = None) -> Path:
    """Return the effective knowledge base root directory."""
    cfg = config if config is not None else load_config()
    custom_path = _normalize_custom_path(cfg.get("knowledge_base_path"))
    if custom_path:
        return Path(custom_path).expanduser()
    return DATA_DIR


def get_storage_dirs(config: dict | None = None) -> tuple[Path, Path]:
    """Return (uploads_dir, knowledge_store_dir), creating them if needed."""
    kb_root = get_knowledge_base_root(config)
    uploads_dir = kb_root / "uploads"
    knowledge_dir = kb_root / "knowledge_store"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    knowledge_dir.mkdir(parents=True, exist_ok=True)
    return uploads_dir, knowledge_dir


def validate_writable_directory(path_value: str) -> Path:
    """Validate and prepare a writable custom directory."""
    if not path_value.strip():
        raise ValueError("路径不能为空")
    path = Path(path_value).expanduser()
    path.mkdir(parents=True, exist_ok=True)
    test_file = path / ".write_test.tmp"
    try:
        test_file.write_text("ok", encoding="utf-8")
        test_file.unlink(missing_ok=True)
    except OSError as e:
        raise ValueError(f"目录不可写: {e}") from e
    return path.resolve()


def load_config() -> dict:
    """Load configuration from file, falling back to defaults."""
    config = DEFAULT_CONFIG.copy()
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
            if isinstance(saved, dict):
                config.update(saved)
        except (json.JSONDecodeError, OSError):
            pass  # Use defaults on corrupted config
    # If system_prompt is empty, fall back to the default
    if not config.get("system_prompt", "").strip():
        config["system_prompt"] = DEFAULT_CONFIG["system_prompt"]
    config["knowledge_base_path"] = _normalize_custom_path(
        config.get("knowledge_base_path")
    )
    return config


def save_config(config: dict) -> dict:
    """Save configuration to file."""
    config["knowledge_base_path"] = _normalize_custom_path(
        config.get("knowledge_base_path")
    )
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    return config
