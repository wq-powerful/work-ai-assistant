from fastapi import APIRouter, HTTPException
import httpx

from config import (
    get_knowledge_base_root,
    get_storage_dirs,
    load_config,
    save_config,
    validate_writable_directory,
)
from models.schemas import SettingsUpdate, ModelsResponse, ModelInfo

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _mask_api_key(key: str) -> str:
    """Mask API key for safe display."""
    if not key or len(key) <= 8:
        return "****"
    return key[:4] + "****" + key[-4:]


@router.get("")
async def get_settings():
    """Get current application settings."""
    config = load_config()
    # Return settings with masked API key to prevent frontend from storing plaintext
    safe_settings = config.copy()
    safe_settings["effective_knowledge_base_path"] = str(get_knowledge_base_root(config))
    safe_settings["api_key_masked"] = _mask_api_key(config.get("api_key", ""))
    # Don't send the real key to the frontend
    safe_settings.pop("api_key", None)
    return {"settings": safe_settings}


@router.get("/models")
async def get_available_models():
    """Fetch available models from the configured API endpoint."""
    config = load_config()
    api_base = config.get("api_base_url", "").rstrip("/")
    api_key = config.get("api_key", "")

    if not api_base or not api_key:
        return ModelsResponse(models=[], error="未配置 API 地址或密钥")

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{api_base}/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
            )
            resp.raise_for_status()
            data = resp.json()

            models = []
            for item in data.get("data", []):
                models.append(ModelInfo(
                    id=item.get("id", ""),
                    object=item.get("object"),
                    owned_by=item.get("owned_by"),
                ))
            models.sort(key=lambda m: m.id)
            return ModelsResponse(models=models)
    except Exception as e:
        return ModelsResponse(models=[], error=f"获取模型列表失败: {str(e)}")


@router.put("")
async def update_settings(updates: SettingsUpdate):
    """Update application settings."""
    try:
        config = load_config()
        update_data = updates.model_dump(exclude_none=True)

        if "knowledge_base_path" in update_data:
            raw_path = (update_data["knowledge_base_path"] or "").strip()
            if raw_path:
                update_data["knowledge_base_path"] = str(
                    validate_writable_directory(raw_path)
                )
            else:
                update_data["knowledge_base_path"] = ""

        config.update(update_data)
        saved = save_config(config)
        # Ensure storage directories exist for the effective path
        get_storage_dirs(saved)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"保存设置失败: {str(e)}")

    # Return safe settings (mask the key)
    safe_saved = saved.copy()
    safe_saved["effective_knowledge_base_path"] = str(get_knowledge_base_root(saved))
    safe_saved["api_key_masked"] = _mask_api_key(saved.get("api_key", ""))
    safe_saved.pop("api_key", None)
    return {"settings": safe_saved, "message": "设置已保存"}
