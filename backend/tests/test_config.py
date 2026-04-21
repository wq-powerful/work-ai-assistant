from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import config


def test_get_packaged_app_data_dir_uses_xdg_data_home(tmp_path):
    xdg_dir = tmp_path / "xdg-data"

    result = config.get_packaged_app_data_dir(
        platform="linux",
        env={"XDG_DATA_HOME": str(xdg_dir)},
        executable_dir=tmp_path / "bin",
    )

    assert result == xdg_dir / "WorkAIAssistant"


def test_get_packaged_app_data_dir_uses_macos_application_support(tmp_path):
    home_dir = tmp_path / "home"

    result = config.get_packaged_app_data_dir(
        platform="darwin",
        env={"HOME": str(home_dir)},
        executable_dir=tmp_path / "Applications",
    )

    assert result == home_dir / "Library" / "Application Support" / "WorkAIAssistant"


def test_get_packaged_app_data_dir_prefers_explicit_override(tmp_path):
    override_dir = tmp_path / "custom-data"

    result = config.get_packaged_app_data_dir(
        platform="linux",
        env={config.APP_DATA_DIR_ENV: str(override_dir)},
        executable_dir=tmp_path / "bin",
    )

    assert result == override_dir


def test_get_cors_origins_merges_custom_origins():
    origins = config.get_cors_origins(
        {"APP_CORS_ALLOW_ORIGINS": "https://foo.example, https://bar.example"}
    )

    assert origins[:2] == list(config.DEFAULT_CORS_ORIGINS)
    assert "https://foo.example" in origins
    assert "https://bar.example" in origins
