from __future__ import annotations

import sys
from pathlib import Path


MODEL_FILES = [
    "hospital_penalty_model.pkl",
    "hospital_scaler.pkl",
    "hospital_features.json",
    "hospital_encoders.pkl",
    "patient_readmit_model.pkl",
    "patient_scaler.pkl",
    "patient_features.json",
    "patient_encoders.pkl",
    "penalty_severity_model.pkl",
]


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    model_dir = root / "models"
    missing: list[str] = []

    print(f"Model directory: {model_dir}")
    if not model_dir.exists():
        print(f"ERROR: models directory does not exist: {model_dir}")
        return 1

    for filename in MODEL_FILES:
        path = model_dir / filename
        if not path.exists():
            missing.append(filename)
            continue
        size_bytes = path.stat().st_size
        print(f"{filename}: {size_bytes} bytes")

    if missing:
        print("ERROR: Missing required model artifacts:")
        for filename in missing:
            print(f"  - {filename}")
        return 1

    print("All required model artifacts are present.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
