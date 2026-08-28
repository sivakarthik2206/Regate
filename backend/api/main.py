from __future__ import annotations

import json
import logging
import os
import pickle
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, AsyncGenerator, Optional

import pandas as pd
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.routes.analytics import router as analytics_router
from api.routes.hospitals import router as hospitals_router
from api.routes.predict import router as predict_router

LOGGER = logging.getLogger("regate.api")


class ModelStore:
    def __init__(self, model_dir: Path) -> None:
        self.model_dir = model_dir
        self.hospital_model: Any | None = None
        self.hospital_scaler: Any | None = None
        self.hospital_features: list[str] = []
        self.hospital_encoders: Any | None = None
        self.patient_model: Any | None = None
        self.patient_scaler: Any | None = None
        self.patient_features: list[str] = []
        self.patient_encoders: Any | None = None
        self.penalty_severity_model: Any | None = None

    def load(self) -> None:
        self.hospital_model = self._load_pickle("hospital_penalty_model.pkl")
        self.hospital_scaler = self._load_pickle("hospital_scaler.pkl")
        self.hospital_features = self._load_json("hospital_features.json")
        self.hospital_encoders = self._load_pickle("hospital_encoders.pkl")
        self.patient_model = self._load_pickle("patient_readmit_model.pkl")
        self.patient_scaler = self._load_pickle("patient_scaler.pkl")
        self.patient_features = self._load_json("patient_features.json")
        self.patient_encoders = self._load_pickle("patient_encoders.pkl")
        self.penalty_severity_model = self._load_pickle("penalty_severity_model.pkl")

    def loaded(self) -> bool:
        return self.hospital_model is not None and self.patient_model is not None and self.penalty_severity_model is not None

    def _load_pickle(self, filename: str) -> Any | None:
        path = self.model_dir / filename
        if not path.exists():
            LOGGER.warning("Missing model artifact: %s", path)
            return None
        with path.open("rb") as handle:
            return pickle.load(handle)

    def _load_json(self, filename: str) -> list[str]:
        path = self.model_dir / filename
        if not path.exists():
            LOGGER.warning("Missing model artifact: %s", path)
            return []
        return json.loads(path.read_text())


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    root = Path(__file__).resolve().parents[1]
    model_dir = root / "models"
    app.state.model_store = ModelStore(model_dir)
    app.state.data_path = root / "data" / "processed"
    app.state.model_store.load()
    LOGGER.info("Startup complete, models_loaded=%s", app.state.model_store.loaded())
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Regate API",
        description="ED-to-Penalty Pipeline Predictor",
        version="1.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def request_logging_middleware(request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000.0
        LOGGER.info(
            "request method=%s path=%s status=%s duration_ms=%.2f",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        return response

    @app.middleware("http")
    async def error_handling_middleware(request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as exc:  # noqa: BLE001
            LOGGER.exception("Unhandled error on %s %s", request.method, request.url.path)
            return JSONResponse(status_code=500, content={"detail": "Internal server error"})

    app.include_router(predict_router)
    app.include_router(analytics_router)
    app.include_router(hospitals_router)

    @app.get("/health")
    def health_check() -> JSONResponse:
        model_store = getattr(app.state, "model_store", None)
        try:
            models_loaded = bool(model_store and model_store.loaded())
        except Exception:  # noqa: BLE001
            models_loaded = False
        return JSONResponse(content={"status": "ok", "models_loaded": models_loaded})

    return app


app = create_app()
