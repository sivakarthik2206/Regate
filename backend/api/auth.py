from __future__ import annotations

import os
from fastapi import HTTPException, Request

# If API_KEY env var is set, all non-health endpoints require X-API-Key header.
# If not set (dev/local mode), the API is open.
_API_KEY: str | None = os.getenv("API_KEY")


def require_api_key(request: Request) -> None:
    """FastAPI dependency: validate X-API-Key header when API_KEY env var is set."""
    if not _API_KEY:
        return  # Dev mode: no key configured, allow all
    key = (
        request.headers.get("X-API-Key")
        or request.headers.get("x-api-key")
        or request.query_params.get("api_key")
    )
    if key != _API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid API key. Supply via X-API-Key header.",
            headers={"WWW-Authenticate": "ApiKey"},
        )


def api_key_configured() -> bool:
    return bool(_API_KEY)
