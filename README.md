# KrishiMitra — Complete Full-Stack MVP

KrishiMitra implements the project modules from the supplied project specification:

- Unified farmer dashboard
- Plantation advisory
- Weather monitoring
- Flood / monsoon risk assessment
- Farm risk management
- Wildlife intrusion image analysis
- Government scheme recommender
- Equipment/resource sharing
- Community forum and semantic search
- Agricultural news and alerts
- Farmer profile
- Notification center

## Stack

Frontend:
- React + TypeScript
- Vite
- React Router
- Lucide React

Backend:
- FastAPI
- SQLAlchemy
- SQLite by default
- PostgreSQL supported with DATABASE_URL
- scikit-learn for Random Forest and similarity models
- PyTorch for LSTM rainfall forecasting

AI pipeline:
- LSTM → rainfall forecasting
- Random Forest → flood-risk classification
- Weather API → current/forecast weather data
- Historical rainfall + environmental/flood records → model training
- YOLOv8 wildlife inference hook
- TF-IDF + cosine similarity scheme recommender
- TF-IDF semantic community search
- Priority-based equipment allocation

## Run on Windows

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Train LSTM + Random Forest
python train_models.py

# Start FastAPI
python -m uvicorn main:app --reload --port 8000
```

Backend:
http://localhost:8000

Swagger:
http://localhost:8000/docs

### Frontend

Open another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend:
http://localhost:5173

## Optional environment variables

Create `backend/.env` to enable live weather data:

```env
DATABASE_URL=sqlite:///./krishimitra.db
CORS_ORIGINS=http://localhost:5173
NEWS_API_KEY=
```

The weather module is integrated with the Open-Meteo API. Open-Meteo needs no API key for non-commercial use, so live current weather and a five-day forecast work as soon as the backend can reach the internet. Any place name typed into the Weather page is geocoded by Open-Meteo.

## Important

### ML training data

The project now has a real training pipeline. Put your real dataset at:

`backend/data/historical_weather.csv`

Required columns:

```text
date,rainfall_mm,temperature_c,humidity,pressure_hpa,river_level,soil_moisture,slope,flood_risk
```

`flood_risk` must come from real historical flood/event records and contain `LOW`, `MEDIUM`, or `HIGH`.

A clearly labelled `historical_weather_demo.csv` is included only so the application can be tested immediately. **It is synthetic and must not be used as real evidence or reported model performance in the final project.**

The trained models are saved under `backend/models/`.

### How the new AI flow works

```text
Historical weather + environmental + flood records
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
      LSTM             Random Forest
        │                   │
        ▼                   │
 Future rainfall ───────────┤
                            ▼
                    Flood risk class
                    LOW / MEDIUM / HIGH
```

The Weather page can fetch recent historical observations from Open-Meteo, send them to the trained LSTM, and use the predicted next-24-hour rainfall together with recent rainfall, soil moisture, river level and slope for the Random Forest flood-risk prediction.


## Frontend scripts

```powershell
npm run dev        # start Vite
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + production build
```

Shared API response types live in `frontend/src/types/index.ts` and mirror the FastAPI responses in `backend/main.py`.
