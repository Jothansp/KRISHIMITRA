"""KrishiMitra ML models: LSTM rainfall forecasting.

Training data:
    backend/data/historical_weather.csv

Required columns:
    date,rainfall_mm,temperature_c,humidity,pressure_hpa

For development, train_models.py can use the bundled
historical_weather_demo.csv when real historical data is unavailable.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

BASE = Path(__file__).resolve().parent
DATA_DIR = BASE / "data"
MODEL_DIR = BASE / "models"
MODEL_DIR.mkdir(exist_ok=True)

LSTM_PATH = MODEL_DIR / "rainfall_lstm.pt"
LSTM_META = MODEL_DIR / "rainfall_lstm_meta.json"

LSTM_FEATURES = ["rainfall_mm", "temperature_c", "humidity", "pressure_hpa"]


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

    lstm_result = train_lstm(chosen)

    return {
        "dataset": str(chosen),
        "dataset_type": "real" if chosen.name == "historical_weather.csv" else "demo",
        "lstm": lstm_result,
    }


_lstm_model = None
_lstm_scaler = None
_lstm_meta = None


def load_models():
    global _lstm_model, _lstm_scaler, _lstm_meta

    if (
        _lstm_model is None
        and LSTM_PATH.exists()
        and (MODEL_DIR / "rainfall_lstm_scaler.joblib").exists()
    ):
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

    return _lstm_model, _lstm_scaler, _lstm_meta


def predict_rainfall(history: list[dict], steps: int = 3) -> list[dict]:
    torch, _ = _require_torch()
    model, scaler, meta = load_models()

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
