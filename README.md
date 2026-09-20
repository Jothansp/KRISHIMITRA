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
- React
- Vite
- React Router
- Lucide React

Backend:
- FastAPI
- SQLAlchemy
- SQLite by default
- PostgreSQL supported with DATABASE_URL
- scikit-learn for similarity/risk baseline

AI integration points:
- Rule-based plantation expert system
- Random Forest-compatible flood-risk pipeline
- LSTM-compatible weather forecast pipeline
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
(no API key required for Open-Meteo non-commercial use)=
NEWS_API_KEY=
```

The weather module is integrated with the Open-Meteo API. Set `(no API key required for Open-Meteo non-commercial use)` in `backend/.env` to enable real-time current weather and a five-day forecast. If the key is not configured, the UI falls back to demo weather data so the rest of the application can still be developed locally.

## Important

The project document specifies YOLOv8, LSTM and Random Forest, but does not provide trained weights or datasets. Therefore the code contains working baseline logic plus clear integration hooks for the trained models. Add your trained files under `backend/models/` when available.
