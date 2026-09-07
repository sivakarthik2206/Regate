from __future__ import annotations

import logging
import os
import time
import uuid
from collections import defaultdict
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.auth import require_api_key
from api.model_store import (
    CMS_PERFORMANCE_PERIOD,
    DATA_LAST_UPDATED,
    PREDICTIONS_APPLY_TO,
    ModelStore,
)
from api.routes.analytics import router as analytics_router
from api.routes.batch import router as batch_router
from api.routes.export import router as export_router
from api.routes.hospitals import router as hospitals_router
from api.routes.predict import router as predict_router

logging.basicConfig(level=logging.INFO)
LOGGER = logging.getLogger("regate.api")
AUDIT_LOGGER = logging.getLogger("regate.audit")

# ── Rate limiting ──────────────────────────────────────────────────────────────
_RATE_WINDOW = 60  # seconds
_RATE_LIMIT = int(os.getenv("RATE_LIMIT_PER_MINUTE", "120"))
_rate_counts: dict[str, list[float]] = defaultdict(list)

_RATE_EXEMPT = {"/health", "/api/v1/docs", "/api/v1/redoc", "/api/v1/openapi.json"}


def _check_rate_limit(client_ip: str) -> bool:
    now = time.monotonic()
    _rate_counts[client_ip] = [t for t in _rate_counts[client_ip] if now - t < _RATE_WINDOW]
    if len(_rate_counts[client_ip]) >= _RATE_LIMIT:
        return False
    _rate_counts[client_ip].append(now)
    return True


# ── CORS ───────────────────────────────────────────────────────────────────────
def _parse_origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "")
    if not raw:
        return ["*"]
    return [o.strip() for o in raw.split(",") if o.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    root = Path(__file__).resolve().parents[1]
    store = ModelStore(model_dir=root / "models", data_dir=root / "data" / "processed")
    store.load()
    app.state.model_store = store
    LOGGER.info(
        "Startup complete: models_loaded=%s hospitals=%d degraded=%s",
        store.models_loaded,
        len(store.hospitals),
        store.degraded,
    )
    if store.degraded:
        LOGGER.warning(
            "ALERT degraded=true models_loaded=%s — predictions falling back to heuristics. "
            "Check model artifacts and GCS bucket access.",
            store.models_loaded,
        )
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Regate API",
        version="2.0.0",
        lifespan=lifespan,
        docs_url="/api/v1/docs",
        redoc_url="/api/v1/redoc",
        openapi_url="/api/v1/openapi.json",
    )

    origins = _parse_origins()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def request_pipeline(request: Request, call_next):
        request_id = str(uuid.uuid4())
        start = time.perf_counter()

        # Rate limiting (skip exempt paths)
        if request.url.path not in _RATE_EXEMPT:
            client_ip = request.client.host if request.client else "unknown"
            if not _check_rate_limit(client_ip):
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": f"Rate limit exceeded. Max {_RATE_LIMIT} requests/minute.",
                        "request_id": request_id,
                    },
                    headers={"Retry-After": str(_RATE_WINDOW)},
                )

        try:
            response = await call_next(request)
        except Exception:
            LOGGER.exception(
                "Unhandled error request_id=%s path=%s", request_id, request.url.path
            )
            return JSONResponse(
                status_code=500,
                content={
                    "detail": "Internal server error",
                    "path": request.url.path,
                    "request_id": request_id,
                },
            )

        duration_ms = (time.perf_counter() - start) * 1000.0
        LOGGER.info(
            "request request_id=%s method=%s path=%s status=%s duration_ms=%.2f",
            request_id,
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        response.headers["X-Request-ID"] = request_id
        return response

    _auth = [Depends(require_api_key)]
    app.include_router(predict_router, prefix="/api/v1", dependencies=_auth)
    app.include_router(analytics_router, prefix="/api/v1", dependencies=_auth)
    app.include_router(hospitals_router, prefix="/api/v1", dependencies=_auth)
    app.include_router(batch_router, prefix="/api/v1", dependencies=_auth)
    app.include_router(export_router, prefix="/api/v1", dependencies=_auth)

    @app.get("/health")
    def health(request: Request) -> dict:
        store: ModelStore | None = getattr(request.app.state, "model_store", None)
        return {
            "status": "ok",
            "models_loaded": bool(store and store.models_loaded),
            "degraded": bool(store and store.degraded) if store else True,
            "hospitals_in_database": int(len(store.hospitals)) if store else 0,
            "data_last_updated": DATA_LAST_UPDATED,
            "predictions_apply_to": PREDICTIONS_APPLY_TO,
            "cms_performance_period": CMS_PERFORMANCE_PERIOD,
            "auth_required": bool(os.getenv("API_KEY")),
        }

    return app


app = create_app()
