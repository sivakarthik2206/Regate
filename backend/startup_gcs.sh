#!/bin/bash
set -e

MODEL_BUCKET="${MODEL_BUCKET:-gs://regate-models-506903/v1}"
DATA_BUCKET="${DATA_BUCKET:-gs://regate-data-506903/processed}"

# Retry a command up to 3 times with exponential backoff (2s, 4s, 8s).
retry() {
    local n=0
    local max=3
    local delay=2
    until "$@"; do
        n=$((n + 1))
        if [ "$n" -ge "$max" ]; then
            echo "ERROR: command failed after $max attempts: $*" >&2
            return 1
        fi
        echo "Attempt $n failed. Retrying in ${delay}s..." >&2
        sleep "$delay"
        delay=$((delay * 2))
    done
}

echo "Downloading models from ${MODEL_BUCKET}..."
retry gcloud storage cp "${MODEL_BUCKET}/*.pkl" /app/models/
retry gcloud storage cp "${MODEL_BUCKET}/*.json" /app/models/

echo "Downloading processed data from ${DATA_BUCKET}..."
retry gcloud storage cp "${DATA_BUCKET}/*.parquet" /app/data/processed/

echo "Running integrity checks..."
for f in \
    /app/models/hospital_penalty_model.pkl \
    /app/models/patient_readmit_model.pkl \
    /app/data/processed/master_hospital_features.parquet; do
    if [ ! -f "$f" ]; then
        echo "ERROR: Required file missing: $f" >&2
        exit 1
    fi
    echo "OK: $f"
done

echo "All required files present. Starting API server..."
exec gunicorn -w 4 -k uvicorn.workers.UvicornWorker api.main:app --bind "0.0.0.0:${PORT:-8080}" --timeout 120 --keep-alive 5
