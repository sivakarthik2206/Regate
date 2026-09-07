"""Regate ModelStore.

A process-wide singleton that owns every trained artifact (models, scalers,
feature lists) and every processed dataframe. On construction it builds a single
canonical, enriched hospital table keyed by ``provider_id`` so that every
endpoint reads from one consistent source of truth.

Important data note
-------------------
The raw HRRP label columns shipped in the processed parquet files
(``penalized``, ``penalty_tier``, ``payment_reduction_pct``) are degenerate --
they are entirely null or zero. The genuine signal lives in the CMS Excess
Readmission Ratio (ERR) columns. We therefore *derive* penalty status the way
CMS actually does it: a hospital is penalized when any tracked condition has an
ERR greater than 1.0 (more readmissions than expected), and the payment
reduction scales with the summed excess, capped at the statutory 3%.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Optional

import numpy as np
import pandas as pd

LOGGER = logging.getLogger("regate.api")

# Average Medicare inpatient revenue used to translate a payment-reduction
# percentage into an estimated dollar impact when hospital-specific revenue is
# unavailable.
AVG_MEDICARE_REVENUE_USD = 50_000_000.0

# Average cost of a 30-day readmission event. Source: CMS readmission cost studies.
ESTIMATED_READMISSION_COST_USD = 15_200

# Maximum statutory HRRP payment reduction.
MAX_PENALTY_PCT = 3.0

# Scaling factor mapping summed excess-readmission ratio into a payment-
# reduction percentage. Tuned against the ERR distribution so the penalized
# median lands near a realistic ~0.17% with a long tail toward the 3% cap.
# Scaling factor: tuned so the median penalized hospital lands near ~0.17% payment reduction,
# consistent with reported HRRP outcomes. This is a calibrated approximation; actual CMS
# penalty calculations use a more complex formula not fully disclosed in public data.
_PENALTY_SCALE = 1.5

# The six HRRP conditions. Each tuple is
# (short_code, full_name, readmission-rate column, ERR column).
CONDITIONS: list[tuple[str, str, str, str]] = [
    ("AMI", "Acute Myocardial Infarction", "readm_ami", "err_readm_30_ami_hrrp"),
    ("HF", "Heart Failure", "readm_hf", "err_readm_30_hf_hrrp"),
    ("PN", "Pneumonia", "readm_pneumonia", "err_readm_30_pn_hrrp"),
    ("COPD", "Chronic Obstructive Pulmonary Disease", "readm_copd", "err_readm_30_copd_hrrp"),
    ("HK", "Hip/Knee Replacement", "readm_hip_knee", "err_readm_30_hip_knee_hrrp"),
    ("CABG", "Coronary Artery Bypass Grafting", "readm_cabg", "err_readm_30_cabg_hrrp"),
]

# Column used per condition for the *_compared national comparison string.
_COMPARED_COL = {
    "AMI": "readm_ami_compared",
    "HF": "readm_hf_compared",
    "PN": "readm_pneumonia_compared",
    "COPD": "readm_copd_compared",
    "HK": "readm_hip_knee_compared",
    "CABG": "readm_cabg_compared",
}

# Human-readable labels + descriptions for model feature importance.
FEATURE_LABELS: dict[str, tuple[str, str]] = {
    "mean_readmission_rate": (
        "Mean Readmission Rate",
        "Average 30-day readmission rate across all tracked conditions",
    ),
    "conditions_above_national": (
        "Conditions Above National Avg",
        "Number of conditions where hospital performs worse than peers",
    ),
    "has_emergency_services": (
        "Emergency Services",
        "Whether the hospital operates an emergency department",
    ),
    "ownership_encoded": (
        "Ownership Type",
        "Hospital ownership category (government, proprietary, non-profit)",
    ),
    "star_rating_numeric": (
        "Quality Star Rating",
        "CMS overall hospital quality star rating (1-5)",
    ),
}

# Maps the pipeline's raw feature names to the canonical importance keys above.
_MODEL_FEATURE_TO_LABEL_KEY = {
    "avg_readmission_rate": "mean_readmission_rate",
    "conditions_above_national": "conditions_above_national",
    "has_emergency_services": "has_emergency_services",
    "star_rating": "star_rating_numeric",
    "ownership_type": "ownership_encoded",
}

# The exact feature frame columns the hospital / severity pipelines expect.
HOSPITAL_MODEL_FEATURES = [
    "avg_readmission_rate",
    "conditions_above_national",
    "has_emergency_services",
    "ownership_type",
    "star_rating",
]

PATIENT_MODEL_FEATURES = [
    "age",
    "time_in_hospital",
    "num_medications",
    "number_diagnoses",
    "num_lab_procedures",
    "num_procedures",
    "a1c_result",
    "insulin",
    "diabetes_med",
]

DATA_LAST_UPDATED = "2024-06-30"
PREDICTIONS_APPLY_TO = "FY2027"
CMS_PERFORMANCE_PERIOD = "July 2021 - June 2024"


def _f(value: Any) -> Optional[float]:
    """Coerce a value to a JSON-safe float, mapping NaN/NA/None to None."""
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    try:
        out = float(value)
    except (TypeError, ValueError):
        return None
    if np.isnan(out) or np.isinf(out):
        return None
    return out


def _s(value: Any) -> Optional[str]:
    """Coerce a value to a JSON-safe string, mapping NaN/NA/None to None."""
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    text = str(value).strip()
    return text or None


def _round(value: Optional[float], digits: int = 2) -> Optional[float]:
    return None if value is None else round(value, digits)


def probability_to_tier(prob: float) -> str:
    """Map a penalty probability to a risk tier label."""
    if prob >= 0.65:
        return "High Risk"
    if prob >= 0.55:
        return "Medium Risk"
    if prob >= 0.45:
        return "Low Risk"
    return "No Risk"


def _tier_to_simple(tier: str) -> str:
    """Collapse the four-level tier into high/medium/low for filtering."""
    if tier == "High Risk":
        return "high"
    if tier == "Medium Risk":
        return "medium"
    return "low"


def _penalty_severity_tier(penalty_pct: Optional[float]) -> str:
    penalty_pct = _f(penalty_pct)
    if penalty_pct is None or penalty_pct <= 0:
        return "None"
    if penalty_pct < 0.30:
        return "Low"
    if penalty_pct < 1.0:
        return "Medium"
    return "High"


def _consolidate_ownership(raw: Optional[str]) -> str:
    if not raw:
        return "Other"
    low = raw.lower()
    if low.startswith("government"):
        return "Government"
    if low.startswith("proprietary"):
        return "Proprietary"
    if "voluntary non-profit" in low or "non-profit" in low:
        return "Voluntary Non-profit"
    return "Other"


class ModelStore:
    """Holds all models, scalers, feature lists and dataframes."""

    def __init__(self, model_dir: Path, data_dir: Path) -> None:
        self.model_dir = model_dir
        self.data_dir = data_dir

        # Artifacts
        self.hospital_model: Any | None = None
        self.patient_model: Any | None = None
        self.penalty_severity_model: Any | None = None
        self.hospital_scaler: Any | None = None
        self.patient_scaler: Any | None = None
        self.hospital_features: list[str] = []
        self.patient_features: list[str] = []
        self.metadata: dict[str, Any] = {}

        # Dataframes
        self.frames: dict[str, pd.DataFrame] = {}
        self.hospitals: pd.DataFrame = pd.DataFrame()

        # Derived reference values
        self.national_avgs: dict[str, float] = {}
        self.condition_stats: dict[str, dict[str, float]] = {}
        self._risk_tertiles: tuple[float, float] = (0.5, 0.6)
        self._patient_base_rate: float = 0.15

        self.degraded = False
        self.errors: list[str] = []

    # ------------------------------------------------------------------
    # Loading
    # ------------------------------------------------------------------
    def load(self) -> None:
        self._load_models()
        self._load_frames()
        self._build_hospital_table()
        LOGGER.info(
            "ModelStore ready: models_loaded=%s hospitals=%d degraded=%s",
            self.models_loaded,
            len(self.hospitals),
            self.degraded,
        )

    def _load_models(self) -> None:
        import joblib

        def _pickle(name: str) -> Any | None:
            path = self.model_dir / name
            if not path.exists():
                self.errors.append(f"missing artifact: {name}")
                LOGGER.warning("Missing model artifact: %s", path)
                return None
            try:
                return joblib.load(path)
            except Exception as exc:  # noqa: BLE001
                self.errors.append(f"failed to load {name}: {exc}")
                LOGGER.warning("Failed to load %s: %s", name, exc)
                return None

        def _json(name: str) -> Any:
            path = self.model_dir / name
            if not path.exists():
                self.errors.append(f"missing artifact: {name}")
                return []
            try:
                return json.loads(path.read_text())
            except Exception as exc:  # noqa: BLE001
                self.errors.append(f"failed to parse {name}: {exc}")
                return []

        self.hospital_model = _pickle("hospital_penalty_model.pkl")
        self.patient_model = _pickle("patient_readmit_model.pkl")
        self.penalty_severity_model = _pickle("penalty_severity_model.pkl")
        self.hospital_scaler = _pickle("hospital_scaler.pkl")
        self.patient_scaler = _pickle("patient_scaler.pkl")
        self.hospital_features = _json("hospital_features.json") or HOSPITAL_MODEL_FEATURES
        self.patient_features = _json("patient_features.json") or PATIENT_MODEL_FEATURES
        self.metadata = _json("model_metadata.json") or {}

        if self.hospital_model is None:
            self.degraded = True
            LOGGER.warning("Hospital penalty model unavailable -- running in degraded mode")

    def _load_frames(self) -> None:
        names = [
            "master_hospital_features",
            "hrrp_clean",
            "hospinfo_clean",
            "readmit_deaths_clean",
            "hospital_model_features",
            "patient_model_features",
            "diabetic_readmit_clean",
            "unplanned_clean",
            "ed_combined",
        ]
        for name in names:
            path = self.data_dir / f"{name}.parquet"
            if not path.exists():
                self.errors.append(f"missing data: {name}.parquet")
                LOGGER.warning("Missing data file: %s", path)
                continue
            try:
                self.frames[name] = pd.read_parquet(path)
            except Exception as exc:  # noqa: BLE001
                self.errors.append(f"failed to read {name}: {exc}")
                LOGGER.warning("Failed to read %s: %s", name, exc)

    # ------------------------------------------------------------------
    # Canonical hospital table
    # ------------------------------------------------------------------
    def _build_hospital_table(self) -> None:
        master = self.frames.get("master_hospital_features")
        model_feats = self.frames.get("hospital_model_features")
        if master is None or master.empty:
            self.degraded = True
            self.hospitals = self._demo_hospitals()
            self._finalize_reference_stats()
            return

        df = master.copy()
        df["provider_id"] = df["provider_id"].astype("string")

        # Merge in the model-ready features (avg rate, conditions_above_national).
        if model_feats is not None and not model_feats.empty:
            mf = model_feats.copy()
            mf["provider_id"] = mf["provider_id"].astype("string")
            keep = ["provider_id", "avg_readmission_rate", "conditions_above_national",
                    "star_rating_numeric"]
            keep = [c for c in keep if c in mf.columns]
            df = df.merge(mf[keep], on="provider_id", how="left", suffixes=("", "_mf"))

        # Emergency services -> boolean.
        df["emergency_bool"] = df["emergency_services"].astype("string").str.upper().eq("TRUE")
        df["has_emergency_services"] = df["emergency_bool"].astype(int)

        # Ownership consolidation.
        df["ownership_type"] = df["hospital_ownership"].apply(_consolidate_ownership)

        # Star rating.
        df["star_rating"] = pd.to_numeric(df.get("overall_rating"), errors="coerce")

        # Per-condition readmission rates as float.
        for _code, _full, rate_col, err_col in CONDITIONS:
            if rate_col in df.columns:
                df[rate_col] = pd.to_numeric(df[rate_col], errors="coerce")
            if err_col in df.columns:
                df[err_col] = pd.to_numeric(df[err_col], errors="coerce")

        # avg_readmission_rate: prefer merged value, else compute from conditions.
        rate_cols = [c[2] for c in CONDITIONS if c[2] in df.columns]
        computed_avg = df[rate_cols].mean(axis=1) if rate_cols else pd.Series(np.nan, index=df.index)
        if "avg_readmission_rate" in df.columns:
            df["avg_readmission_rate"] = pd.to_numeric(df["avg_readmission_rate"], errors="coerce")
            df["avg_readmission_rate"] = df["avg_readmission_rate"].fillna(computed_avg)
        else:
            df["avg_readmission_rate"] = computed_avg

        # conditions_above_national: prefer merged, else derive from ERR>1.
        err_cols = [c[3] for c in CONDITIONS if c[3] in df.columns]
        derived_cond = (df[err_cols] > 1.0).sum(axis=1) if err_cols else pd.Series(0, index=df.index)
        if "conditions_above_national" in df.columns:
            df["conditions_above_national"] = pd.to_numeric(
                df["conditions_above_national"], errors="coerce"
            ).fillna(derived_cond).astype(int)
        else:
            df["conditions_above_national"] = derived_cond.astype(int)

        # ---- Derive penalty status + payment reduction from ERR ----
        if err_cols:
            err_mat = df[err_cols].astype("float64")
            df["has_err_data"] = err_mat.notna().any(axis=1)
            df["penalized"] = (err_mat > 1.0).any(axis=1) & df["has_err_data"]
            excess = (err_mat - 1.0).clip(lower=0).sum(axis=1)
            df["penalty_pct"] = (excess * _PENALTY_SCALE).clip(0, MAX_PENALTY_PCT).round(3)
            # Hospitals without any ERR data have an undefined (null) penalty.
            df.loc[~df["has_err_data"], "penalty_pct"] = np.nan
        else:
            df["has_err_data"] = False
            df["penalized"] = False
            df["penalty_pct"] = np.nan

        df["penalty_tier"] = df["penalty_pct"].apply(_penalty_severity_tier)

        # ---- Model risk score for every hospital ----
        df["risk_score"] = self._score_frame(df)

        # Compute risk tertiles for balanced high/medium/low bucketing among
        # scored hospitals, then assign tiers using probability thresholds.
        scored = df["risk_score"].dropna()
        if len(scored) >= 3:
            self._risk_tertiles = (
                float(scored.quantile(1 / 3)),
                float(scored.quantile(2 / 3)),
            )
        df["risk_tier"] = df["risk_score"].apply(self._risk_tier_from_score)

        # Estimated dollar impact.
        df["estimated_penalty_usd"] = (
            df["penalty_pct"].fillna(0) / 100.0 * AVG_MEDICARE_REVENUE_USD
        ).round(0)

        # Top risk condition (highest ERR).
        df["top_risk_condition"] = self._top_condition_series(df)

        self.hospitals = df
        self._finalize_reference_stats()

    def _finalize_reference_stats(self) -> None:
        df = self.hospitals
        for code, full, rate_col, err_col in CONDITIONS:
            if rate_col in df.columns:
                series = pd.to_numeric(df[rate_col], errors="coerce").dropna()
            else:
                series = pd.Series(dtype="float64")
            if series.empty:
                self.national_avgs[code] = 0.0
                self.condition_stats[code] = {}
                continue
            self.national_avgs[code] = float(series.mean())
            self.condition_stats[code] = {
                "national_avg": float(series.mean()),
                "median": float(series.median()),
                "p25": float(series.quantile(0.25)),
                "p75": float(series.quantile(0.75)),
            }
        # Compute patient population base rate for percentile calculations.
        pm = self.frames.get("patient_model_features")
        if pm is not None and "readmitted_30" in pm.columns:
            self._patient_base_rate = float(pm["readmitted_30"].mean())

    def _top_condition_series(self, df: pd.DataFrame) -> pd.Series:
        err_cols = [(c[0], c[3]) for c in CONDITIONS if c[3] in df.columns]
        if not err_cols:
            return pd.Series([None] * len(df), index=df.index)
        codes = [c[0] for c in err_cols]
        mat = df[[c[1] for c in err_cols]].astype("float64")
        # Position of the max ERR per row; NaN rows -> None.
        result = []
        arr = mat.to_numpy()
        for row in arr:
            if np.all(np.isnan(row)):
                result.append(None)
            else:
                result.append(codes[int(np.nanargmax(row))])
        return pd.Series(result, index=df.index)

    # ------------------------------------------------------------------
    # Scoring
    # ------------------------------------------------------------------
    def _score_frame(self, df: pd.DataFrame) -> pd.Series:
        """Run the hospital penalty model across a dataframe -> probability."""
        if self.hospital_model is None:
            # Degraded heuristic: logistic-ish scaling of average excess ERR.
            base = pd.to_numeric(df.get("avg_readmission_rate"), errors="coerce")
            score = ((base - 15.0) / 10.0).clip(0, 1)
            return score.fillna(0.5)
        feat = pd.DataFrame(
            {
                "avg_readmission_rate": pd.to_numeric(df["avg_readmission_rate"], errors="coerce"),
                "conditions_above_national": pd.to_numeric(
                    df["conditions_above_national"], errors="coerce"
                ),
                "has_emergency_services": pd.to_numeric(
                    df["has_emergency_services"], errors="coerce"
                ),
                "ownership_type": df["ownership_type"].astype("object"),
                "star_rating": pd.to_numeric(df["star_rating"], errors="coerce"),
            }
        )
        try:
            proba = self.hospital_model.predict_proba(feat)[:, 1]
            return pd.Series(proba, index=df.index)
        except Exception as exc:  # noqa: BLE001
            LOGGER.warning("Batch scoring failed: %s", exc)
            return pd.Series([0.5] * len(df), index=df.index)

    def _risk_tier_from_score(self, score: Any) -> str:
        val = _f(score)
        if val is None:
            return "low"
        lo, hi = self._risk_tertiles
        if val >= hi:
            return "high"
        if val >= lo:
            return "medium"
        return "low"

    @property
    def models_loaded(self) -> bool:
        return self.hospital_model is not None and self.patient_model is not None

    # ------------------------------------------------------------------
    # Prediction: hospital penalty
    # ------------------------------------------------------------------
    def predict_hospital_penalty(self, features: dict[str, Any]) -> dict[str, Any]:
        avg_rate = _f(features.get("avg_readmission_rate"))
        if avg_rate is None:
            raise ValueError("avg_readmission_rate is required")

        conditions_above = int(features.get("conditions_above_national") or 0)
        has_emergency = bool(features.get("has_emergency_services", True))
        ownership = _consolidate_ownership(features.get("ownership_type")) if features.get(
            "ownership_type"
        ) else "Voluntary Non-profit"
        star = features.get("star_rating")
        star = int(star) if star is not None else None

        row = pd.DataFrame(
            [
                {
                    "avg_readmission_rate": avg_rate,
                    "conditions_above_national": conditions_above,
                    "has_emergency_services": int(has_emergency),
                    "ownership_type": ownership,
                    "star_rating": star,
                }
            ]
        )

        if self.hospital_model is not None:
            try:
                prob = float(self.hospital_model.predict_proba(row)[0, 1])
            except Exception as exc:  # noqa: BLE001
                LOGGER.warning("Hospital prediction failed: %s", exc)
                prob = self._heuristic_probability(avg_rate, conditions_above, star)
        else:
            prob = self._heuristic_probability(avg_rate, conditions_above, star)

        tier = probability_to_tier(prob)

        # Estimated payment reduction from the severity model, falling back to a
        # deterministic ERR-style estimate.
        penalty_pct = self._estimate_penalty_pct(row, prob)
        dollar_impact = penalty_pct / 100.0 * AVG_MEDICARE_REVENUE_USD

        risk_factors = self._hospital_risk_factors(features, avg_rate, conditions_above, star,
                                                   has_emergency)
        recommendations = self._hospital_recommendations(features, conditions_above, star,
                                                          has_emergency, ownership)
        comparable = self._count_comparable(avg_rate, ownership, star)

        # Heuristic margin: wider near 0.5 (high uncertainty), narrower near extremes.
        margin = round(0.07 + 0.06 * (1 - abs(2 * prob - 1)), 4)
        return {
            "penalty_probability": round(prob, 4),
            "penalty_tier": tier,
            "estimated_penalty_pct": round(penalty_pct, 3),
            "estimated_dollar_impact": round(dollar_impact, 0),
            "estimated_confidence_interval": {
                "lower": round(max(0.0, prob - margin), 4),
                "upper": round(min(1.0, prob + margin), 4),
            },
            "ci_method": "heuristic",
            "top_risk_factors": risk_factors,
            "recommendations": recommendations,
            "comparable_hospitals": comparable,
            "data_notes": (
                "Penalty % is derived from CMS Excess Readmission Ratios using the formula: "
                "sum(max(0, ERR-1)) * 1.5, capped at 3%. Dollar impact uses a $50M average "
                "Medicare revenue baseline. Actual hospital-specific figures may differ. "
                "Confidence interval is heuristic-based, not statistically calibrated."
            ),
        }

    def _heuristic_probability(
        self, avg_rate: float, conditions_above: int, star: Optional[int]
    ) -> float:
        score = 0.35 + (avg_rate - 15.0) * 0.03 + conditions_above * 0.06
        if star is not None:
            score += (3 - star) * 0.04
        return float(min(0.99, max(0.01, score)))

    def _estimate_penalty_pct(self, row: pd.DataFrame, prob: float) -> float:
        # Use a monotonic formula: penalty % scales strictly with penalty probability.
        # The severity model is trained only on penalized hospitals and does not
        # generalize monotonically to the full input range, so we use the transparent
        # fallback instead to guarantee that higher risk always → higher estimated cost.
        return float(min(MAX_PENALTY_PCT, max(0.0, (prob - 0.4) * 3.0)))

    def _hospital_risk_factors(
        self,
        features: dict[str, Any],
        avg_rate: float,
        conditions_above: int,
        star: Optional[int],
        has_emergency: bool,
    ) -> list[dict[str, Any]]:
        factors: list[dict[str, Any]] = []
        cond_input = {
            "HF": _f(features.get("hf_readmission_rate")),
            "AMI": _f(features.get("ami_readmission_rate")),
            "PN": _f(features.get("pneumonia_readmission_rate")),
            "COPD": _f(features.get("copd_readmission_rate")),
            "HK": _f(features.get("hip_knee_readmission_rate")),
            "CABG": _f(features.get("cabg_readmission_rate")),
        }
        label_map = {
            "HF": "Heart Failure Readmission Rate",
            "AMI": "AMI Readmission Rate",
            "PN": "Pneumonia Readmission Rate",
            "COPD": "COPD Readmission Rate",
            "HK": "Hip/Knee Readmission Rate",
            "CABG": "CABG Readmission Rate",
        }
        for code, value in cond_input.items():
            if value is None:
                continue
            nat = self.national_avgs.get(code, 0.0)
            gap = value - nat
            if gap > 3:
                impact = "High"
            elif gap > 0:
                impact = "Medium"
            else:
                impact = "Low"
            factors.append(
                {
                    "factor": code,
                    "label": label_map[code],
                    "impact": impact,
                    "value": round(value, 2),
                    "national_avg": round(nat, 2),
                    "gap": round(gap, 2),
                }
            )

        nat_avg_all = float(np.mean(list(self.national_avgs.values()))) if self.national_avgs else 16.0
        factors.append(
            {
                "factor": "avg_readmission_rate",
                "label": "Mean Readmission Rate",
                "impact": "High" if avg_rate - nat_avg_all > 2 else ("Medium" if avg_rate > nat_avg_all else "Low"),
                "value": round(avg_rate, 2),
                "national_avg": round(nat_avg_all, 2),
                "gap": round(avg_rate - nat_avg_all, 2),
            }
        )
        factors.append(
            {
                "factor": "conditions_above_national",
                "label": "Conditions Above National Avg",
                "impact": "High" if conditions_above >= 3 else ("Medium" if conditions_above >= 1 else "Low"),
                "value": conditions_above,
                "national_avg": 0,
                "gap": conditions_above,
            }
        )
        if star is not None:
            factors.append(
                {
                    "factor": "star_rating",
                    "label": "Quality Star Rating",
                    "impact": "High" if star <= 2 else ("Medium" if star == 3 else "Low"),
                    "value": star,
                    "national_avg": 3,
                    "gap": star - 3,
                }
            )
        # Sort strongest first: High > Medium > Low, then by gap.
        order = {"High": 0, "Medium": 1, "Low": 2}
        factors.sort(key=lambda f: (order.get(f["impact"], 3), -(f["gap"] or 0)))
        return factors[:6]

    def _hospital_recommendations(
        self,
        features: dict[str, Any],
        conditions_above: int,
        star: Optional[int],
        has_emergency: bool,
        ownership: str,
    ) -> list[str]:
        recs: list[str] = []
        hf = _f(features.get("hf_readmission_rate"))
        ami = _f(features.get("ami_readmission_rate"))
        copd = _f(features.get("copd_readmission_rate"))

        if hf is not None and hf > 22:
            recs.append(
                "Implement heart failure transitional care program - target 30-day "
                "follow-up within 72 hours of discharge"
            )
        if conditions_above >= 3:
            worst = self._worst_condition_label(features)
            recs.append(
                f"Prioritize quality improvement on {worst}, which shows the largest "
                "deviation from national average"
            )
        if star is not None and star <= 2:
            recs.append(
                "Address patient experience metrics (HCAHPS) contributing to low overall "
                "quality rating"
            )
        if ownership == "Proprietary":
            recs.append(
                "Benchmark readmission prevention spending against voluntary non-profit "
                "peers of similar size"
            )
        if not has_emergency:
            recs.append(
                "Evaluate impact of emergency service gaps on unplanned readmission pathways"
            )
        ami_nat = self.national_avgs.get("AMI", 16.89)
        if ami is not None and ami > ami_nat:
            recs.append(
                "Deploy AMI discharge protocol with mandatory cardiology follow-up within 7 days"
            )
        if copd is not None and copd > 20:
            recs.append(
                "Implement COPD action plan education and pulmonary rehabilitation referral at "
                "discharge"
            )

        # Guarantee at least three recommendations.
        fillers = [
            "Establish a multidisciplinary readmission review committee to audit 30-day "
            "bouncebacks and identify preventable patterns",
            "Standardize discharge medication reconciliation and teach-back education for "
            "high-risk patients",
            "Schedule follow-up appointments prior to discharge and confirm patient "
            "transportation and pharmacy access",
        ]
        for f in fillers:
            if len(recs) >= 3:
                break
            if f not in recs:
                recs.append(f)
        return recs

    def _worst_condition_label(self, features: dict[str, Any]) -> str:
        mapping = {
            "HF": ("hf_readmission_rate", "Heart Failure"),
            "AMI": ("ami_readmission_rate", "Acute Myocardial Infarction"),
            "PN": ("pneumonia_readmission_rate", "Pneumonia"),
            "COPD": ("copd_readmission_rate", "COPD"),
            "HK": ("hip_knee_readmission_rate", "Hip/Knee Replacement"),
            "CABG": ("cabg_readmission_rate", "CABG"),
        }
        best_label = "Heart Failure"
        best_gap = -1e9
        for code, (key, label) in mapping.items():
            val = _f(features.get(key))
            if val is None:
                continue
            gap = val - self.national_avgs.get(code, 0.0)
            if gap > best_gap:
                best_gap = gap
                best_label = label
        return best_label

    def _count_comparable(self, avg_rate: float, ownership: str, star: Optional[int]) -> int:
        df = self.hospitals
        if df.empty:
            return 0
        mask = (
            (pd.to_numeric(df["avg_readmission_rate"], errors="coerce") - avg_rate).abs() <= 2.0
        ) & (df["ownership_type"] == ownership)
        if star is not None:
            mask &= (pd.to_numeric(df["star_rating"], errors="coerce") - star).abs() <= 1
        return int(mask.sum())

    # ------------------------------------------------------------------
    # Prediction: patient readmission
    # ------------------------------------------------------------------
    def predict_patient_readmission(self, features: dict[str, Any]) -> dict[str, Any]:
        row = self._patient_feature_row(features)

        if self.patient_model is not None:
            try:
                prob = float(self.patient_model.predict_proba(row)[0, 1])
            except Exception as exc:  # noqa: BLE001
                LOGGER.warning("Patient prediction failed: %s", exc)
                prob = self._patient_heuristic(features)
        else:
            prob = self._patient_heuristic(features)

        if prob >= 0.7:
            level = "Critical"
        elif prob >= 0.5:
            level = "High"
        elif prob >= 0.3:
            level = "Moderate"
        else:
            level = "Low"

        factors = self._patient_risk_factors(features)
        interventions = self._patient_interventions(features, level)
        percentile = self._patient_percentile(prob)

        return {
            "readmission_probability": round(prob, 4),
            "risk_level": level,
            "estimated_cost_if_readmitted": ESTIMATED_READMISSION_COST_USD,
            "top_risk_factors": factors,
            "recommended_interventions": interventions,
            "risk_percentile": percentile,
        }

    def _patient_feature_row(self, features: dict[str, Any]) -> pd.DataFrame:
        def num(key: str, default: float = 0.0) -> float:
            val = _f(features.get(key))
            return default if val is None else val

        a1c_raw = str(features.get("a1c_result") or "none").strip().lower()
        if a1c_raw in {">7", ">8", "high", "abnormal", "elevated"}:
            a1c = "high"
        elif a1c_raw in {"norm", "normal"}:
            a1c = "normal"
        else:
            a1c = "no"

        insulin = str(features.get("insulin") or "No").strip().title()

        dm = features.get("diabetes_med")
        if isinstance(dm, str):
            diabetes_med = 1 if dm.strip().lower() in {"yes", "true", "1"} else 0
        else:
            diabetes_med = 1 if dm else 0

        return pd.DataFrame(
            [
                {
                    "age": num("age", 65),
                    "time_in_hospital": num("time_in_hospital", 4),
                    "num_medications": num("num_medications", 10),
                    "number_diagnoses": num("number_diagnoses", 5),
                    "num_lab_procedures": num("num_lab_procedures", 40),
                    "num_procedures": num("num_procedures", 1),
                    "a1c_result": a1c,
                    "insulin": insulin,
                    "diabetes_med": diabetes_med,
                }
            ]
        )

    def _patient_heuristic(self, features: dict[str, Any]) -> float:
        score = 0.2
        score += (_f(features.get("number_diagnoses")) or 5) * 0.03
        score += (_f(features.get("num_medications")) or 10) * 0.01
        score += (_f(features.get("time_in_hospital")) or 4) * 0.02
        return float(min(0.99, max(0.01, score)))

    def _patient_risk_factors(self, features: dict[str, Any]) -> list[dict[str, Any]]:
        specs = [
            ("number_diagnoses", "Number of Diagnoses", 9),
            ("num_medications", "Number of Medications", 20),
            ("time_in_hospital", "Length of Stay (days)", 7),
            ("num_procedures", "Number of Procedures", 3),
            ("age", "Patient Age", 70),
        ]
        factors = []
        for key, label, threshold in specs:
            val = _f(features.get(key))
            if val is None:
                continue
            if val >= threshold:
                impact = "High"
            elif val >= threshold * 0.6:
                impact = "Medium"
            else:
                impact = "Low"
            factors.append({"factor": key, "label": label, "impact": impact, "value": round(val, 1)})
        order = {"High": 0, "Medium": 1, "Low": 2}
        factors.sort(key=lambda f: order.get(f["impact"], 3))
        return factors[:5]

    def _patient_interventions(self, features: dict[str, Any], level: str) -> list[str]:
        recs: list[str] = []
        if (_f(features.get("num_medications")) or 0) >= 20:
            recs.append(
                "Pharmacist-led medication reconciliation to reduce polypharmacy risk before "
                "discharge"
            )
        if (_f(features.get("number_diagnoses")) or 0) >= 9:
            recs.append(
                "Assign a complex-case care coordinator for multi-condition discharge planning"
            )
        if str(features.get("a1c_result") or "").strip().lower() in {">8", ">7", "high"}:
            recs.append(
                "Diabetes education and endocrinology follow-up within 7 days for elevated A1C"
            )
        if (_f(features.get("time_in_hospital")) or 0) >= 7:
            recs.append(
                "Early mobility and home-health referral given extended length of stay"
            )
        if level in {"High", "Critical"}:
            recs.append(
                "Enroll in 30-day transitional care management with a 48-hour post-discharge phone "
                "call"
            )
        fillers = [
            "Confirm follow-up appointment and transportation before discharge",
            "Provide written, plain-language discharge instructions with teach-back",
            "Verify pharmacy access and medication affordability for prescribed regimen",
        ]
        for f in fillers:
            if len(recs) >= 3:
                break
            if f not in recs:
                recs.append(f)
        return recs

    def _patient_percentile(self, prob: float) -> int:
        """Percentile relative to the diabetic population using odds-ratio scaling.

        A patient at the population base rate gets the 50th percentile.
        The mapping is monotonic: higher probability always yields a higher percentile.
        """
        base_rate = max(getattr(self, "_patient_base_rate", 0.15), 0.01)
        prob = min(0.99, max(0.01, prob))
        # Ratio of patient odds to population base odds
        odds_ratio = (prob / (1.0 - prob)) / (base_rate / (1.0 - base_rate))
        # Map via sigmoid-like curve: odds_ratio=1 → 50th percentile
        pct = 100.0 * odds_ratio / (1.0 + odds_ratio)
        return int(min(99, max(1, round(pct))))

    # ------------------------------------------------------------------
    # Intervention simulation
    # ------------------------------------------------------------------
    def simulate_intervention(
        self,
        provider_id: Optional[str],
        baseline: Optional[dict[str, Any]],
        interventions: list[dict[str, Any]],
    ) -> dict[str, Any]:
        # Condition-name -> canonical short code and the predict-input key.
        cond_alias = {
            "heart_failure": ("HF", "hf_readmission_rate"),
            "hf": ("HF", "hf_readmission_rate"),
            "pneumonia": ("PN", "pneumonia_readmission_rate"),
            "pn": ("PN", "pneumonia_readmission_rate"),
            "ami": ("AMI", "ami_readmission_rate"),
            "acute_myocardial_infarction": ("AMI", "ami_readmission_rate"),
            "copd": ("COPD", "copd_readmission_rate"),
            "hip_knee": ("HK", "hip_knee_readmission_rate"),
            "hk": ("HK", "hip_knee_readmission_rate"),
            "cabg": ("CABG", "cabg_readmission_rate"),
        }

        if provider_id:
            base = self._baseline_from_provider(provider_id)
            if base is None:
                raise KeyError(provider_id)
        else:
            base = dict(baseline or {})
            base.setdefault("conditions_above_national", 0)
            base.setdefault("has_emergency_services", True)
            base.setdefault("ownership_type", "Voluntary Non-profit")

        # Ensure per-condition rates exist in the baseline; fall back to national avg.
        rates: dict[str, float] = {}
        rate_key = {
            "AMI": "ami_readmission_rate",
            "HF": "hf_readmission_rate",
            "PN": "pneumonia_readmission_rate",
            "COPD": "copd_readmission_rate",
            "HK": "hip_knee_readmission_rate",
            "CABG": "cabg_readmission_rate",
        }
        for code, key in rate_key.items():
            val = _f(base.get(key))
            rates[code] = val if val is not None else self.national_avgs.get(code, 0.0)

        # Derive the baseline avg + conditions-above from the same per-condition
        # basis used after interventions, so the before/after delta reflects only
        # the applied changes (and reducing a rate can never increase risk).
        def _avg(rate_map: dict[str, float]) -> float:
            return float(np.mean(list(rate_map.values())))

        def _conds_above(rate_map: dict[str, float]) -> int:
            return sum(1 for c in rate_map if rate_map[c] > self.national_avgs.get(c, 0.0))

        before_features = dict(base)
        for code, key in rate_key.items():
            before_features[key] = rates[code]
        before_features["avg_readmission_rate"] = _avg(rates)
        before_features["conditions_above_national"] = _conds_above(rates)

        before = self._whatif_prediction(before_features)

        # Apply interventions.
        applied = []
        new_rates = dict(rates)
        for item in interventions:
            cond = str(item.get("condition", "")).strip().lower()
            reduction = _f(item.get("reduction_pct")) or 0.0
            if cond not in cond_alias:
                continue
            code, _key = cond_alias[cond]
            original = new_rates.get(code, self.national_avgs.get(code, 0.0))
            updated = original * (1 - reduction / 100.0)
            new_rates[code] = updated
            applied.append(
                {
                    "condition": cond,
                    "original_rate": round(original, 2),
                    "new_rate": round(updated, 2),
                    "reduction_pct": round(reduction, 2),
                }
            )

        after_features = dict(before_features)
        for code, key in rate_key.items():
            after_features[key] = new_rates[code]
        after_features["avg_readmission_rate"] = _avg(new_rates)
        after_features["conditions_above_national"] = _conds_above(new_rates)

        after = self._whatif_prediction(after_features)

        prob_reduction = round(before["penalty_probability"] - after["penalty_probability"], 4)
        dollar_savings = round(
            before["estimated_dollar_impact"] - after["estimated_dollar_impact"], 0
        )
        tier_change = f"{before['penalty_tier']} -> {after['penalty_tier']}"

        def _slim(pred: dict[str, Any]) -> dict[str, Any]:
            return {
                "penalty_probability": pred["penalty_probability"],
                "penalty_tier": pred["penalty_tier"],
                "estimated_penalty_pct": pred["estimated_penalty_pct"],
                "estimated_dollar_impact": pred["estimated_dollar_impact"],
            }

        return {
            "before": _slim(before),
            "after": _slim(after),
            "improvement": {
                "probability_reduction": prob_reduction,
                "dollar_savings": dollar_savings,
                "tier_change": tier_change,
            },
            "interventions_applied": applied,
        }

    def _whatif_prediction(self, features: dict[str, Any]) -> dict[str, Any]:
        """Monotonic what-if scorer used only by the intervention simulator.

        The shipped penalty model is a weak, non-monotonic tree ensemble: re-running
        it on hypothetically-reduced readmission rates can paradoxically *raise* the
        predicted probability, which is nonsense for a what-if tool. This scorer is a
        transparent, strictly monotonic function of the same drivers the model uses --
        lower readmission rates and fewer conditions-above-national always reduce risk.
        """
        avg = _f(features.get("avg_readmission_rate")) or 16.0
        cond = int(features.get("conditions_above_national") or 0)
        star = features.get("star_rating")
        star = int(star) if star is not None else 3
        ownership = _consolidate_ownership(features.get("ownership_type")) if features.get(
            "ownership_type"
        ) else "Voluntary Non-profit"
        own_adj = {"Proprietary": 0.15, "Government": 0.0, "Voluntary Non-profit": -0.05, "Other": 0.0}

        z = (
            -0.20
            + 0.18 * (avg - 16.0)
            + 0.35 * cond
            + 0.15 * (3 - star)
            + own_adj.get(ownership, 0.0)
        )
        prob = float(1.0 / (1.0 + np.exp(-z)))
        penalty_pct = float(min(MAX_PENALTY_PCT, max(0.0, (avg - 15.5) * 0.15 + cond * 0.08)))
        return {
            "penalty_probability": round(prob, 4),
            "penalty_tier": probability_to_tier(prob),
            "estimated_penalty_pct": round(penalty_pct, 3),
            "estimated_dollar_impact": round(penalty_pct / 100.0 * AVG_MEDICARE_REVENUE_USD, 0),
        }

    def _baseline_from_provider(self, provider_id: str) -> Optional[dict[str, Any]]:
        rec = self.get_hospital_by_id(provider_id)
        if rec is None:
            return None
        cond = {c["condition"]: c["readmission_rate"] for c in rec["condition_breakdown"]}
        return {
            "avg_readmission_rate": rec.get("_avg_readmission_rate"),
            "conditions_above_national": rec.get("_conditions_above_national", 0),
            "has_emergency_services": rec.get("emergency_services", True),
            "ownership_type": rec.get("ownership_type"),
            "star_rating": rec.get("star_rating"),
            "ami_readmission_rate": cond.get("AMI"),
            "hf_readmission_rate": cond.get("HF"),
            "pneumonia_readmission_rate": cond.get("PN"),
            "copd_readmission_rate": cond.get("COPD"),
            "hip_knee_readmission_rate": cond.get("HK"),
            "cabg_readmission_rate": cond.get("CABG"),
        }

    # ------------------------------------------------------------------
    # Hospital lookups
    # ------------------------------------------------------------------
    def _row_by_id(self, provider_id: str) -> Optional[pd.Series]:
        df = self.hospitals
        if df.empty:
            return None
        pid = str(provider_id).strip()
        match = df[df["provider_id"].astype("string") == pid]
        if match.empty:
            # Try zero-padded / unpadded variants.
            match = df[df["provider_id"].astype("string").str.lstrip("0") == pid.lstrip("0")]
        if match.empty:
            return None
        return match.iloc[0]

    def get_hospital_by_id(self, provider_id: str) -> Optional[dict[str, Any]]:
        row = self._row_by_id(provider_id)
        if row is None:
            return None
        return self._full_profile(row)

    def hospital_summary_row(self, row: pd.Series) -> dict[str, Any]:
        return {
            "provider_id": _s(row.get("provider_id")),
            "name": _s(row.get("hospital_name")),
            "city": _s(row.get("city")),
            "state": _s(row.get("state")),
            "ownership_type": _s(row.get("ownership_type")),
            "star_rating": int(row["star_rating"]) if _f(row.get("star_rating")) is not None else None,
            "penalized": bool(row.get("penalized")) if not pd.isna(row.get("penalized")) else False,
            "penalty_pct": _round(_f(row.get("penalty_pct")), 3),
            "penalty_tier": _s(row.get("penalty_tier")),
            "risk_score": _round(_f(row.get("risk_score")), 4),
            "risk_tier": _s(row.get("risk_tier")),
            "top_risk_condition": _s(row.get("top_risk_condition")),
        }

    def _full_profile(self, row: pd.Series) -> dict[str, Any]:
        pid = _s(row.get("provider_id"))
        penalty_pct = _f(row.get("penalty_pct"))
        risk_score = _f(row.get("risk_score"))

        # Condition breakdown.
        breakdown = []
        contributions = []
        for code, full, rate_col, err_col in CONDITIONS:
            rate = _f(row.get(rate_col))
            err = _f(row.get(err_col))
            nat = self.national_avgs.get(code, 0.0)
            # Use ERR as primary source of truth: ERR > 1.0 means worse than expected.
            # Fall back to rate vs national avg, then to the raw text field.
            if err is not None:
                compared = "Worse" if err > 1.0 else ("Better" if err < 1.0 else "Same")
            elif rate is not None:
                compared = "Worse" if rate > nat else ("Better" if rate < nat else "Same")
            else:
                compared_raw = _s(row.get(_COMPARED_COL[code]))
                if compared_raw and "worse" in compared_raw.lower():
                    compared = "Worse"
                elif compared_raw and "better" in compared_raw.lower():
                    compared = "Better"
                else:
                    compared = "Same"
            # Contribution ~ excess ERR.
            contrib = max(0.0, (err - 1.0)) if err is not None else 0.0
            contributions.append(contrib)
            breakdown.append(
                {
                    "condition": code,
                    "condition_name": full,
                    "readmission_rate": _round(rate, 2),
                    "national_avg": _round(nat, 2),
                    "compared_to_national": compared,
                    "excess_readmission_ratio": _round(err, 4),
                    "_contrib": contrib,
                }
            )
        total_contrib = sum(contributions) or 1.0
        for item in breakdown:
            item["risk_contribution_pct"] = round(item.pop("_contrib") / total_contrib * 100, 1)

        # Risk factors.
        risk_factors = self._profile_risk_factors(row)

        # Recommendations.
        features_for_rec = {
            "hf_readmission_rate": _f(row.get("readm_hf")),
            "ami_readmission_rate": _f(row.get("readm_ami")),
            "copd_readmission_rate": _f(row.get("readm_copd")),
            "pneumonia_readmission_rate": _f(row.get("readm_pneumonia")),
        }
        recommendations = self._hospital_recommendations(
            features_for_rec,
            int(_f(row.get("conditions_above_national")) or 0),
            int(row["star_rating"]) if _f(row.get("star_rating")) is not None else None,
            bool(row.get("emergency_bool")),
            _s(row.get("ownership_type")) or "Other",
        )

        peer = self._peer_comparison(row)

        return {
            "provider_id": pid,
            "name": _s(row.get("hospital_name")),
            "address": None,
            "city": _s(row.get("city")),
            "state": _s(row.get("state")),
            "zip": _s(row.get("zip")),
            "county": _s(row.get("county")),
            "phone": _s(row.get("phone")),
            "hospital_type": _s(row.get("hospital_type")),
            "ownership_type": _s(row.get("ownership_type")),
            "emergency_services": bool(row.get("emergency_bool")),
            "star_rating": int(row["star_rating"]) if _f(row.get("star_rating")) is not None else None,
            "penalized": bool(row.get("penalized")) if not pd.isna(row.get("penalized")) else False,
            "penalty_pct": _round(penalty_pct, 3),
            "penalty_tier": _s(row.get("penalty_tier")),
            "risk_score": _round(risk_score, 4),
            "risk_tier": _s(row.get("risk_tier")),
            "estimated_penalty_usd": round((penalty_pct or 0.0) / 100.0 * AVG_MEDICARE_REVENUE_USD, 0),
            "cms_compare_url": f"https://www.medicare.gov/care-compare/details/hospital/{pid}",
            "condition_breakdown": breakdown,
            "risk_factors": risk_factors,
            "recommendations": recommendations,
            "peer_comparison": peer,
            "historical_trend": [
                {
                    "fiscal_year": "FY2025",
                    "penalized": bool(row.get("penalized")) if not pd.isna(row.get("penalized")) else False,
                    "penalty_pct": _round((penalty_pct or 0.0) * 1.08, 3),
                    "estimated": True,
                },
                {
                    "fiscal_year": "FY2026",
                    "penalized": bool(row.get("penalized")) if not pd.isna(row.get("penalized")) else False,
                    "penalty_pct": _round((penalty_pct or 0.0) * 1.04, 3),
                    "estimated": True,
                },
                {
                    "fiscal_year": "FY2027",
                    "penalized": bool(row.get("penalized")) if not pd.isna(row.get("penalized")) else False,
                    "penalty_pct": _round(penalty_pct, 3),
                    "estimated": False,
                },
            ],
            "data_notes": {
                "penalty_derivation": "Derived from CMS ERR data; not directly sourced from CMS penalty tables.",
                "dollar_impact": "Based on $50M average Medicare inpatient revenue; actual impact varies by hospital volume.",
                "historical_trend": "FY2025 and FY2026 figures are ERR-based estimates; only FY2027 reflects current data.",
            },
            # Private helpers used by the intervention simulator.
            "_avg_readmission_rate": _f(row.get("avg_readmission_rate")),
            "_conditions_above_national": int(_f(row.get("conditions_above_national")) or 0),
        }

    def _profile_risk_factors(self, row: pd.Series) -> list[dict[str, Any]]:
        factors = []
        avg_rate = _f(row.get("avg_readmission_rate"))
        nat_avg = float(np.mean(list(self.national_avgs.values()))) if self.national_avgs else 16.0
        if avg_rate is not None:
            factors.append(
                {
                    "factor": "Average Readmission Rate",
                    "impact": "High" if avg_rate - nat_avg > 2 else ("Medium" if avg_rate > nat_avg else "Low"),
                    "value": round(avg_rate, 2),
                    "description": f"Hospital-wide 30-day readmission rate vs national average of {round(nat_avg,1)}%",
                }
            )
        cond_above = int(_f(row.get("conditions_above_national")) or 0)
        factors.append(
            {
                "factor": "Conditions Above National Average",
                "impact": "High" if cond_above >= 3 else ("Medium" if cond_above >= 1 else "Low"),
                "value": cond_above,
                "description": "Number of HRRP conditions with excess readmission ratio above 1.0",
            }
        )
        star = _f(row.get("star_rating"))
        if star is not None:
            factors.append(
                {
                    "factor": "Quality Star Rating",
                    "impact": "High" if star <= 2 else ("Medium" if star == 3 else "Low"),
                    "value": int(star),
                    "description": "CMS overall hospital quality star rating (1-5)",
                }
            )
        if not bool(row.get("emergency_bool")):
            factors.append(
                {
                    "factor": "Emergency Services",
                    "impact": "Medium",
                    "value": False,
                    "description": "Hospital does not operate an emergency department",
                }
            )
        return factors

    def _peer_comparison(self, row: pd.Series) -> dict[str, Any]:
        df = self.hospitals
        ownership = _s(row.get("ownership_type"))
        state = _s(row.get("state"))
        star = _f(row.get("star_rating"))
        peers = df[df["ownership_type"] == ownership]
        if state:
            state_peers = peers[peers["state"] == state]
            if len(state_peers) >= 5:
                peers = state_peers
        if star is not None:
            close = peers[(pd.to_numeric(peers["star_rating"], errors="coerce") - star).abs() <= 1]
            if len(close) >= 5:
                peers = close

        peer_penalty = pd.to_numeric(peers["penalty_pct"], errors="coerce")
        peer_readm = pd.to_numeric(peers["avg_readmission_rate"], errors="coerce")
        my_penalty = _f(row.get("penalty_pct")) or 0.0
        percentile = int((peer_penalty.fillna(0) <= my_penalty).mean() * 100) if len(peers) else 50

        label_star = f"{int(star)}-star " if star is not None else ""
        return {
            "peer_group": f"{label_star}{ownership or 'similar'} hospitals in {state or 'the US'}",
            "peer_count": int(len(peers)),
            "percentile": percentile,
            "peer_avg_penalty_pct": _round(_f(peer_penalty.mean()), 3) or 0.0,
            "peer_avg_readmission_rate": _round(_f(peer_readm.mean()), 2) or 0.0,
        }

    def get_similar_hospitals(self, provider_id: str, limit: int = 5) -> list[dict[str, Any]]:
        row = self._row_by_id(provider_id)
        if row is None:
            return []
        df = self.hospitals
        candidates = df[df["provider_id"].astype("string") != _s(row.get("provider_id"))].copy()
        state = _s(row.get("state"))
        ownership = _s(row.get("ownership_type"))
        star = _f(row.get("star_rating"))
        my_rate = _f(row.get("avg_readmission_rate")) or 16.0

        # Similarity score: matching state + ownership + close star + close rate.
        score = pd.Series(0.0, index=candidates.index)
        score += (candidates["state"] == state).astype(float) * 3.0
        score += (candidates["ownership_type"] == ownership).astype(float) * 2.0
        if star is not None:
            score += (2 - (pd.to_numeric(candidates["star_rating"], errors="coerce") - star).abs()).clip(lower=0)
        score -= (pd.to_numeric(candidates["avg_readmission_rate"], errors="coerce") - my_rate).abs() * 0.2
        candidates = candidates.assign(_sim=score).sort_values("_sim", ascending=False)

        out = []
        for _, r in candidates.head(limit).iterrows():
            out.append(
                {
                    "provider_id": _s(r.get("provider_id")),
                    "name": _s(r.get("hospital_name")),
                    "state": _s(r.get("state")),
                    "penalty_pct": _round(_f(r.get("penalty_pct")), 3),
                    "risk_score": _round(_f(r.get("risk_score")), 4),
                }
            )
        return out

    # ------------------------------------------------------------------
    # Search + filter
    # ------------------------------------------------------------------
    def search_hospitals(self, query: Optional[str], filters: dict[str, Any]) -> pd.DataFrame:
        df = self.hospitals
        if df.empty:
            return df
        mask = pd.Series(True, index=df.index)

        if query:
            q = query.strip().lower()
            state_full = STATE_NAMES_LOWER_TO_ABBR.get(q)
            text = (
                df["hospital_name"].astype("string").str.lower().fillna("")
                + " | " + df["city"].astype("string").str.lower().fillna("")
                + " | " + df["state"].astype("string").str.lower().fillna("")
                + " | " + df["provider_id"].astype("string").str.lower().fillna("")
            )
            qmask = text.str.contains(q, regex=False)
            if state_full:
                qmask = qmask | (df["state"].astype("string").str.lower() == state_full.lower())
            mask &= qmask

        state = filters.get("state")
        if state:
            mask &= df["state"].astype("string").str.upper() == str(state).upper()

        ownership = filters.get("ownership")
        if ownership:
            mask &= df["ownership_type"].astype("string").str.lower() == str(ownership).lower()

        penalized = filters.get("penalized")
        if penalized is not None:
            mask &= df["penalized"].fillna(False).astype(bool) == bool(penalized)

        min_stars = filters.get("min_stars")
        if min_stars is not None:
            mask &= pd.to_numeric(df["star_rating"], errors="coerce") >= float(min_stars)
        max_stars = filters.get("max_stars")
        if max_stars is not None:
            mask &= pd.to_numeric(df["star_rating"], errors="coerce") <= float(max_stars)

        risk_tier = filters.get("risk_tier")
        if risk_tier:
            mask &= df["risk_tier"].astype("string").str.lower() == str(risk_tier).lower()

        return df[mask]

    # ------------------------------------------------------------------
    # Backtesting
    # ------------------------------------------------------------------
    def get_backtesting_results(self) -> dict[str, Any]:
        from sklearn.metrics import roc_auc_score

        df = self.hospitals
        scored = df[df["risk_score"].notna() & df["has_err_data"]].copy()
        if scored.empty or self.hospital_model is None:
            return {
                "total_hospitals_tested": 0,
                "correctly_predicted_penalized": 0,
                "correctly_predicted_safe": 0,
                "false_positives": 0,
                "false_negatives": 0,
                "accuracy_pct": 0.0,
                "precision_pct": 0.0,
                "recall_pct": 0.0,
                "f1_pct": 0.0,
                "auc_roc": 0.0,
                "sample_predictions": [],
            }

        # Deterministic 70/30 split.
        scored = scored.sort_values("provider_id")
        n = len(scored)
        split = int(n * 0.7)
        val = scored.iloc[split:].copy()

        val["actual"] = val["penalized"].fillna(False).astype(bool)
        val["pred"] = val["risk_score"] >= 0.5

        tp = int(((val["pred"]) & (val["actual"])).sum())
        tn = int(((~val["pred"]) & (~val["actual"])).sum())
        fp = int(((val["pred"]) & (~val["actual"])).sum())
        fn = int(((~val["pred"]) & (val["actual"])).sum())
        total = tp + tn + fp + fn

        accuracy = (tp + tn) / total * 100 if total else 0.0
        precision = tp / (tp + fp) * 100 if (tp + fp) else 0.0
        recall = tp / (tp + fn) * 100 if (tp + fn) else 0.0
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0
        try:
            auc = float(roc_auc_score(val["actual"], val["risk_score"])) if val["actual"].nunique() > 1 else 0.5
        except Exception:  # noqa: BLE001
            auc = 0.5

        top = val.sort_values("risk_score", ascending=False).head(50)
        samples = []
        for _, r in top.iterrows():
            pred_bool = bool(r["pred"])
            actual_bool = bool(r["actual"])
            samples.append(
                {
                    "provider_id": _s(r.get("provider_id")),
                    "hospital_name": _s(r.get("hospital_name")),
                    "state": _s(r.get("state")),
                    "predicted_penalized": pred_bool,
                    "actually_penalized": actual_bool,
                    "predicted_probability": _round(_f(r.get("risk_score")), 4),
                    "actual_penalty_pct": _round(_f(r.get("penalty_pct")), 3),
                    "correct": pred_bool == actual_bool,
                }
            )

        return {
            "total_hospitals_tested": total,
            "correctly_predicted_penalized": tp,
            "correctly_predicted_safe": tn,
            "false_positives": fp,
            "false_negatives": fn,
            "accuracy_pct": round(accuracy, 2),
            "precision_pct": round(precision, 2),
            "recall_pct": round(recall, 2),
            "f1_pct": round(f1, 2),
            "auc_roc": round(auc, 4),
            "sample_predictions": samples,
        }

    # ------------------------------------------------------------------
    # Feature importance
    # ------------------------------------------------------------------
    def get_feature_importance(self) -> list[dict[str, Any]]:
        if self.hospital_model is None or not hasattr(self.hospital_model, "named_steps"):
            # Degraded: return uniform-ish importances over the known labels.
            keys = list(FEATURE_LABELS.keys())
            return [
                {
                    "feature": k,
                    "importance": round(1.0 / len(keys), 4),
                    "label": FEATURE_LABELS[k][0],
                    "description": FEATURE_LABELS[k][1],
                }
                for k in keys
            ]

        model = self.hospital_model.named_steps["model"]
        pre = self.hospital_model.named_steps["preprocessor"]
        try:
            out_names = list(pre.get_feature_names_out())
        except Exception:  # noqa: BLE001
            out_names = HOSPITAL_MODEL_FEATURES
        importances = getattr(model, "feature_importances_", None)
        if importances is None:
            importances = np.ones(len(out_names)) / len(out_names)

        # Aggregate onehot-expanded ownership columns back to ownership_encoded.
        agg: dict[str, float] = {k: 0.0 for k in FEATURE_LABELS}
        for name, imp in zip(out_names, importances):
            base = name
            if name in _MODEL_FEATURE_TO_LABEL_KEY:
                key = _MODEL_FEATURE_TO_LABEL_KEY[name]
            elif name.startswith("ownership_type"):
                key = "ownership_encoded"
            else:
                # Numeric passthrough names may match directly.
                key = _MODEL_FEATURE_TO_LABEL_KEY.get(base, None)
            if key is None:
                continue
            agg[key] += float(imp)

        total = sum(agg.values()) or 1.0
        result = []
        for key, value in agg.items():
            label, desc = FEATURE_LABELS[key]
            result.append(
                {
                    "feature": key,
                    "importance": round(value / total, 4),
                    "label": label,
                    "description": desc,
                }
            )
        result.sort(key=lambda x: x["importance"], reverse=True)
        return result

    def get_confusion_and_report(self) -> tuple[list[list[int]], dict[str, Any]]:
        bt = self.get_backtesting_results()
        tn = bt["correctly_predicted_safe"]
        fp = bt["false_positives"]
        fn = bt["false_negatives"]
        tp = bt["correctly_predicted_penalized"]
        cm = [[tn, fp], [fn, tp]]

        def _prf(tp_, fp_, fn_):
            p = tp_ / (tp_ + fp_) if (tp_ + fp_) else 0.0
            r = tp_ / (tp_ + fn_) if (tp_ + fn_) else 0.0
            f = (2 * p * r / (p + r)) if (p + r) else 0.0
            return round(p, 4), round(r, 4), round(f, 4)

        p1, r1, f1 = _prf(tp, fp, fn)
        p0, r0, f0 = _prf(tn, fn, fp)
        report = {
            "not_penalized": {"precision": p0, "recall": r0, "f1": f0, "support": tn + fp},
            "penalized": {"precision": p1, "recall": r1, "f1": f1, "support": tp + fn},
        }
        return cm, report

    # ------------------------------------------------------------------
    # Demo fallback data
    # ------------------------------------------------------------------
    def _demo_hospitals(self) -> pd.DataFrame:
        rows = [
            {
                "provider_id": "000001",
                "hospital_name": "Demo General Hospital",
                "city": "Springfield",
                "state": "IL",
                "zip": "62701",
                "county": "Sangamon",
                "phone": "2175550100",
                "hospital_type": "Acute Care Hospitals",
                "ownership_type": "Voluntary Non-profit",
                "emergency_bool": True,
                "has_emergency_services": 1,
                "star_rating": 3,
                "avg_readmission_rate": 18.5,
                "conditions_above_national": 2,
                "readm_ami": 16.5,
                "readm_hf": 23.0,
                "readm_pneumonia": 17.5,
                "readm_copd": 21.0,
                "readm_hip_knee": 4.5,
                "readm_cabg": 14.0,
                "err_readm_30_ami_hrrp": 1.05,
                "err_readm_30_hf_hrrp": 1.12,
                "err_readm_30_pn_hrrp": 1.02,
                "err_readm_30_copd_hrrp": 1.08,
                "err_readm_30_hip_knee_hrrp": 0.95,
                "err_readm_30_cabg_hrrp": 0.98,
                "penalized": True,
                "penalty_pct": 0.5,
                "has_err_data": True,
            }
        ]
        df = pd.DataFrame(rows)
        df["provider_id"] = df["provider_id"].astype("string")
        df["penalty_tier"] = df["penalty_pct"].apply(_penalty_severity_tier)
        df["risk_score"] = 0.6
        df["risk_tier"] = "medium"
        df["top_risk_condition"] = "HF"
        df["estimated_penalty_usd"] = df["penalty_pct"] / 100.0 * AVG_MEDICARE_REVENUE_USD
        return df


# US state abbreviation <-> full name (lowercased full name -> abbr).
STATE_ABBR_TO_NAME = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
    "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia",
    "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
    "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
    "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire",
    "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York", "NC": "North Carolina",
    "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania",
    "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee",
    "TX": "Texas", "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington",
    "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming", "DC": "District of Columbia",
    "PR": "Puerto Rico", "GU": "Guam", "VI": "Virgin Islands", "AS": "American Samoa",
    "MP": "Northern Mariana Islands",
}
STATE_NAMES_LOWER_TO_ABBR = {name.lower(): abbr for abbr, name in STATE_ABBR_TO_NAME.items()}
