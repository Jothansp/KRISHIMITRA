
"""KrishiMitra ML models: LSTM rainfall forecasting + Random Forest flood-risk classification.

Training data:
    backend/data/historical_weather.csv

Required columns:
    date,rainfall_mm,temperature_c,humidity,pressure_hpa,river_level,soil_moisture,slope,flood_risk

flood_risk must be one of LOW, MEDIUM, HIGH for the Random Forest.
For the demo, train_models.py can fall back to the clearly labelled synthetic demo dataset.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler

BASE = Path(__file__).resolve().parent
DATA_DIR = BASE / "data"
MODEL_DIR = BASE / "models"
MODEL_DIR.mkdir(exist_ok=True)

RF_PATH = MODEL_DIR / "flood_risk_random_forest.joblib"
LSTM_PATH = MODEL_DIR / "rainfall_lstm.pt"
LSTM_META = MODEL_DIR / "rainfall_lstm_meta.json"

FEATURES = [
    "rainfall_24h",
    "rainfall_7d",
    "predicted_rainfall_24h",
    "soil_moisture",
    "river_level",
    "slope_code",
]

LSTM_FEATURES = ["rainfall_mm", "temperature_c", "humidity", "pressure_hpa"]


def slope_code(slope: str) -> int:
    return {"flat": 0, "moderate": 1, "steep": 2}.get(str(slope).lower(), 1)


def build_rf_features(df: pd.DataFrame, predicted: np.ndarray | None = None) -> pd.DataFrame:
    out = df.copy()
    out["rainfall_24h"] = out["rainfall_mm"].astype(float)
    out["rainfall_7d"] = out["rainfall_mm"].rolling(7, min_periods=1).sum()
    if predicted is None:
        # Fallback training feature using only past observations.
        predicted = out["rainfall_mm"].rolling(3, min_periods=1).mean().shift(1).fillna(out["rainfall_mm"]).to_numpy()
    out["predicted_rainfall_24h"] = np.asarray(predicted, dtype=float)
    out["slope_code"] = out["slope"].map(slope_code).fillna(1)
    return out[FEATURES]


def train_random_forest(csv_path: Path, predicted: np.ndarray | None = None) -> dict[str, Any]:
    df = pd.read_csv(csv_path)
    required = set([
        "rainfall_mm", "soil_moisture", "river_level", "slope", "flood_risk"
    ])
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing columns for Random Forest: {sorted(missing)}")

    df = df.dropna(subset=list(required)).copy()
    X = build_rf_features(df, predicted=predicted)
    y = df["flood_risk"].astype(str).str.upper()

    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=12,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X, y)
    joblib.dump(model, RF_PATH)
    return {
        "model": "Random Forest Classifier",
        "rows": int(len(df)),
        "classes": sorted(model.classes_.tolist()),
        "path": str(RF_PATH),
    }


def _require_torch():
    try:
        import torch
        import torch.nn as nn
        return torch, nn
    except ImportError as exc:
        raise RuntimeError(
            "PyTorch is required for the LSTM rainfall forecaster. "
            "Run: pip install torch"
        ) from exc


def _make_lstm_sequences(values: np.ndarray, window: int):
    X, y = [], []
    for i in range(window, len(values)):
        X.append(values[i - window:i])
        y.append(values[i, 0])
    return np.asarray(X, dtype=np.float32), np.asarray(y, dtype=np.float32)


def train_lstm(csv_path: Path, window: int = 14, epochs: int = 12) -> dict[str, Any]:
    torch, nn = _require_torch()

    df = pd.read_csv(csv_path)
    missing = set(LSTM_FEATURES) - set(df.columns)
    if missing:
        raise ValueError(f"Missing columns for LSTM: {sorted(missing)}")

    df = df.dropna(subset=LSTM_FEATURES).copy()
    values = df[LSTM_FEATURES].astype(float).to_numpy()

    scaler = StandardScaler()
    scaled = scaler.fit_transform(values)
    X, y = _make_lstm_sequences(scaled, window)
    if len(X) < 30:
        raise ValueError("At least 30 rows are required to train the LSTM.")

    class RainfallLSTM(nn.Module):
        def __init__(self, input_size=4, hidden_size=32):
            super().__init__()
            self.lstm = nn.LSTM(input_size, hidden_size, batch_first=True)
            self.fc = nn.Linear(hidden_size, 1)

        def forward(self, x):
            out, _ = self.lstm(x)
            return self.fc(out[:, -1, :]).squeeze(1)

    model = RainfallLSTM()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
    loss_fn = nn.MSELoss()

    torch.manual_seed(42)
    model.train()
    tensor_x = torch.tensor(X)
    tensor_y = torch.tensor(y)

    for _ in range(epochs):
        optimizer.zero_grad()
        pred = model(tensor_x)
        loss = loss_fn(pred, tensor_y)
        loss.backward()
        optimizer.step()

    torch.save(model.state_dict(), LSTM_PATH)
    # StandardScaler is serializable with joblib.
    scaler_path = MODEL_DIR / "rainfall_lstm_scaler.joblib"
    joblib.dump(scaler, scaler_path)

    meta = {
        "window": window,
        "features": LSTM_FEATURES,
        "hidden_size": 32,
        "training_rows": int(len(df)),
        "epochs": epochs,
    }
    LSTM_META.write_text(json.dumps(meta, indent=2))
    return {"model": "LSTM", "rows": int(len(df)), "path": str(LSTM_PATH)}



def _lstm_training_predictions(csv_path: Path) -> np.ndarray:
    """Generate one-step LSTM predictions for RF training."""
    torch, _ = _require_torch()
    df = pd.read_csv(csv_path).dropna(subset=LSTM_FEATURES).copy()
    values = df[LSTM_FEATURES].astype(float).to_numpy()
    scaler = joblib.load(MODEL_DIR / "rainfall_lstm_scaler.joblib")
    meta = json.loads(LSTM_META.read_text())
    window = int(meta["window"])

    # Re-create the same network architecture and load the trained state.
    class RainfallLSTM(torch.nn.Module):
        def __init__(self, input_size=4, hidden_size=32):
            super().__init__()
            self.lstm = torch.nn.LSTM(input_size, hidden_size, batch_first=True)
            self.fc = torch.nn.Linear(hidden_size, 1)
        def forward(self, x):
            out, _ = self.lstm(x)
            return self.fc(out[:, -1, :]).squeeze(1)

    model = RainfallLSTM()
    model.load_state_dict(torch.load(LSTM_PATH, map_location="cpu"))
    model.eval()

    scaled = scaler.transform(values)
    preds = np.full(len(df), np.nan, dtype=float)
    with torch.no_grad():
        for i in range(window, len(df)):
            x = torch.tensor(scaled[i-window:i], dtype=torch.float32).unsqueeze(0)
            pred_scaled = float(model(x).item())
            target = np.zeros((1, len(LSTM_FEATURES)))
            target[0, 0] = pred_scaled
            preds[i] = max(0.0, float(scaler.inverse_transform(target)[0, 0]))

    # The first window has no LSTM prediction; use past-only rolling rainfall.
    fallback = df["rainfall_mm"].rolling(3, min_periods=1).mean().shift(1).fillna(df["rainfall_mm"]).to_numpy()
    return np.where(np.isnan(preds), fallback, preds)


def train_all(csv_path: Path | None = None) -> dict[str, Any]:
    real_path = DATA_DIR / "historical_weather.csv"
    demo_path = DATA_DIR / "historical_weather_demo.csv"
    chosen = csv_path or (real_path if real_path.exists() else demo_path)
    if not chosen.exists():
        raise FileNotFoundError(
            f"No training data found. Add {real_path.name} to {DATA_DIR}."
        )

    # Train the LSTM first. The RF training feature named
    # predicted_rainfall_24h is constructed only from information available
    # before the target day (no future rainfall leakage).
    lstm_result = train_lstm(chosen)
    predicted = _lstm_training_predictions(chosen)
    rf_result = train_random_forest(chosen, predicted=predicted)
    result = {
        "dataset": str(chosen),
        "dataset_type": "real" if chosen.name == "historical_weather.csv" else "demo",
        "random_forest": rf_result,
        "lstm": lstm_result,
    }
    return result


_rf_model = None
_lstm_model = None
_lstm_scaler = None
_lstm_meta = None


def load_models():
    global _rf_model, _lstm_model, _lstm_scaler, _lstm_meta
    if _rf_model is None and RF_PATH.exists():
        _rf_model = joblib.load(RF_PATH)

    if _lstm_model is None and LSTM_PATH.exists() and (MODEL_DIR / "rainfall_lstm_scaler.joblib").exists():
        torch, nn = _require_torch()

        class RainfallLSTM(nn.Module):
            def __init__(self, input_size=4, hidden_size=32):
                super().__init__()
                self.lstm = nn.LSTM(input_size, hidden_size, batch_first=True)
                self.fc = nn.Linear(hidden_size, 1)

            def forward(self, x):
                out, _ = self.lstm(x)
                return self.fc(out[:, -1, :]).squeeze(1)

        _lstm_model = RainfallLSTM()
        _lstm_model.load_state_dict(torch.load(LSTM_PATH, map_location="cpu"))
        _lstm_model.eval()
        _lstm_scaler = joblib.load(MODEL_DIR / "rainfall_lstm_scaler.joblib")
        _lstm_meta = json.loads(LSTM_META.read_text())

    return _rf_model, _lstm_model, _lstm_scaler, _lstm_meta


def predict_rainfall(history: list[dict], steps: int = 3) -> list[dict]:
    torch, _ = _require_torch()
    rf, model, scaler, meta = load_models()
    if model is None:
        raise RuntimeError(
            "LSTM model is not trained. Run `python train_models.py` in backend."
        )

    window = int(meta["window"])
    rows = []
    for x in history:
        rows.append([
            float(x.get("rainfall_mm", 0)),
            float(x.get("temperature_c", 25)),
            float(x.get("humidity", 70)),
            float(x.get("pressure_hpa", 1013)),
        ])

    if len(rows) < window:
        raise ValueError(f"LSTM needs at least {window} historical observations.")

    rows = rows[-window:]
    predictions = []

    # Autoregressive forecasting: predicted rainfall is fed into the next step.
    for i in range(steps):
        scaled = scaler.transform(np.asarray(rows, dtype=float))
        x = torch.tensor(scaled, dtype=torch.float32).unsqueeze(0)
        with torch.no_grad():
            pred_scaled = float(model(x).item())

        # Convert the rainfall output back to mm while retaining recent exogenous values.
        target = np.zeros((1, len(LSTM_FEATURES)))
        target[0, 0] = pred_scaled
        inverse = scaler.inverse_transform(target)[0]
        rain_mm = max(0.0, float(inverse[0]))

        next_row = list(rows[-1])
        next_row[0] = rain_mm
        rows.append(next_row)
        rows = rows[-window:]

        predictions.append({
            "day": i + 1,
            "rainfall_mm": round(rain_mm, 1),
            "method": "LSTM",
        })

    return predictions


def predict_flood_risk(
    rainfall_24h: float,
    rainfall_7d: float,
    predicted_rainfall_24h: float,
    soil_moisture: float,
    river_level: float,
    slope: str,
) -> dict[str, Any]:
    rf, *_ = load_models()
    if rf is None:
        raise RuntimeError(
            "Random Forest model is not trained. Run `python train_models.py` in backend."
        )

    X = pd.DataFrame([{
        "rainfall_24h": rainfall_24h,
        "rainfall_7d": rainfall_7d,
        "predicted_rainfall_24h": predicted_rainfall_24h,
        "soil_moisture": soil_moisture,
        "river_level": river_level,
        "slope_code": slope_code(slope),
    }], columns=FEATURES)

    risk = str(rf.predict(X)[0]).upper()
    probabilities = rf.predict_proba(X)[0]
    class_probabilities = {
        str(label).upper(): float(prob)
        for label, prob in zip(rf.classes_, probabilities)
    }
    confidence = float(max(probabilities))

    # Risk score represents severity, not model confidence.
    # LOW=10, MEDIUM=55 and HIGH=100, weighted by the model probabilities.
    risk_score = (
        class_probabilities.get("LOW", 0.0) * 10
        + class_probabilities.get("MEDIUM", 0.0) * 55
        + class_probabilities.get("HIGH", 0.0) * 100
    )

    actions = {
        "LOW": [
            "Continue normal monitoring.",
            "Keep drainage channels clear.",
        ],
        "MEDIUM": [
            "Inspect drainage and low-lying areas.",
            "Review field operations before heavy rainfall.",
            "Monitor local river and rainfall conditions.",
        ],
        "HIGH": [
            "Avoid unnecessary field operations during severe rainfall.",
            "Inspect drainage and vulnerable slopes.",
            "Follow local official warnings where applicable.",
        ],
    }

    return {
        "score": round(risk_score),
        "risk": risk,
        "confidence": round(confidence * 100, 1),
        "actions": actions.get(risk, []),
        "model": "Random Forest Classifier",
        "probabilities": {k: round(v * 100, 1) for k, v in class_probabilities.items()},
        "features": X.iloc[0].to_dict(),
    }
