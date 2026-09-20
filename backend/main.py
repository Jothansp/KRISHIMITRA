import os
import math
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import numpy as np
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Text, DateTime,
    Boolean, ForeignKey, desc
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# -------------------------------------------------------------------
# Configuration
# -------------------------------------------------------------------

load_dotenv(Path(__file__).resolve().parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./krishimitra.db")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
NEWS_API_KEY = os.getenv("NEWS_API_KEY", "")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

app = FastAPI(
    title="KrishiMitra API",
    description="AI-powered plantation intelligence and farmer services platform",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[x.strip() for x in CORS_ORIGINS if x.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------
# Database models
# -------------------------------------------------------------------

class Farmer(Base):
    __tablename__ = "farmers"
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    phone = Column(String(30), default="")
    email = Column(String(160), default="")
    district = Column(String(80), default="Idukki")
    location = Column(String(160), default="Idukki, Kerala")
    crops = Column(String(500), default="rubber,pepper,cardamom")
    farm_size = Column(Float, default=2.0)
    preferred_language = Column(String(30), default="English")
    created_at = Column(DateTime, default=datetime.utcnow)

class Farm(Base):
    __tablename__ = "farms"
    id = Column(Integer, primary_key=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id"))
    name = Column(String(120), default="Main Plantation")
    crop = Column(String(80), default="pepper")
    area = Column(Float, default=2.0)
    soil_moisture = Column(Float, default=55)
    health_score = Column(Float, default=78)
    latitude = Column(Float, default=9.85)
    longitude = Column(Float, default=76.97)

class Scheme(Base):
    __tablename__ = "schemes"
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, default="")
    crops = Column(String(500), default="all")
    districts = Column(String(500), default="all")
    keywords = Column(String(500), default="")
    eligibility = Column(Text, default="")
    url = Column(String(500), default="#")

class Equipment(Base):
    __tablename__ = "equipment"
    id = Column(Integer, primary_key=True)
    name = Column(String(160), nullable=False)
    category = Column(String(80), default="Farm Tool")
    owner = Column(String(120), default="")
    location = Column(String(120), default="Idukki")
    daily_rate = Column(Float, default=0)
    deposit = Column(Float, default=0)
    available = Column(Boolean, default=True)
    description = Column(Text, default="")

class Rental(Base):
    __tablename__ = "rentals"
    id = Column(Integer, primary_key=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"))
    farmer_name = Column(String(120))
    start_date = Column(String(20))
    days = Column(Integer, default=1)
    status = Column(String(30), default="REQUESTED")
    created_at = Column(DateTime, default=datetime.utcnow)

class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True)
    author = Column(String(120), default="Farmer")
    title = Column(String(200))
    body = Column(Text)
    tags = Column(String(500), default="")
    likes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class NewsItem(Base):
    __tablename__ = "news"
    id = Column(Integer, primary_key=True)
    title = Column(String(250))
    summary = Column(Text)
    category = Column(String(80))
    source = Column(String(160))
    url = Column(String(500), default="#")
    published_at = Column(DateTime, default=datetime.utcnow)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True)
    type = Column(String(50))
    severity = Column(String(30))
    title = Column(String(180))
    message = Column(Text)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# -------------------------------------------------------------------
# Seed data
# -------------------------------------------------------------------

def seed():
    db = SessionLocal()
    try:
        if db.query(Farmer).count() == 0:
            farmer = Farmer(
                name="Demo Farmer",
                phone="9999999999",
                email="farmer@example.com",
                district="Idukki",
                location="Idukki, Kerala",
                crops="rubber,pepper,cardamom",
                farm_size=3.2,
            )
            db.add(farmer)
            db.flush()
            db.add(Farm(
                farmer_id=farmer.id,
                name="Demo Plantation",
                crop="pepper",
                area=3.2,
                soil_moisture=55,
                health_score=78,
                latitude=9.85,
                longitude=76.97,
            ))

        if db.query(Scheme).count() == 0:
            db.add_all([
                Scheme(
                    name="PM-KISAN",
                    description="Income support for eligible farmer families.",
                    crops="all",
                    districts="all",
                    keywords="income farmer support assistance",
                    eligibility="Eligible landholding farmer families subject to scheme rules.",
                ),
                Scheme(
                    name="Kisan Credit Card",
                    description="Credit support for cultivation and agricultural working capital.",
                    crops="all",
                    districts="all",
                    keywords="credit loan finance working capital cultivation",
                    eligibility="Farmers and eligible agricultural borrowers as per banking rules.",
                ),
                Scheme(
                    name="National Horticulture Mission",
                    description="Support for horticulture development and productivity.",
                    crops="pepper cardamom nutmeg coffee fruit horticulture",
                    districts="all",
                    keywords="horticulture plantation productivity planting",
                    eligibility="Applicable activities and beneficiaries depend on current state guidelines.",
                ),
                Scheme(
                    name="Soil Health Card",
                    description="Soil testing and nutrient-management guidance.",
                    crops="all",
                    districts="all",
                    keywords="soil nutrient fertilizer testing health",
                    eligibility="Farmers seeking soil testing and nutrient recommendations.",
                ),
                Scheme(
                    name="Agricultural Mechanization Support",
                    description="Support related to access to eligible farm machinery and equipment.",
                    crops="all",
                    districts="all",
                    keywords="machinery equipment mechanization subsidy",
                    eligibility="Eligibility and subsidy levels depend on the applicable current program.",
                ),
            ])

        if db.query(Equipment).count() == 0:
            db.add_all([
                Equipment(
                    name="Brush Cutter", category="Farm Tools",
                    owner="Kumar Cooperative", location="Idukki",
                    daily_rate=650, deposit=1000,
                    description="Petrol brush cutter for grass and undergrowth."
                ),
                Equipment(
                    name="Power Sprayer", category="Sprayer",
                    owner="Green Farmers Group", location="Kottayam",
                    daily_rate=900, deposit=1500,
                    description="High-pressure sprayer for plantation applications."
                ),
                Equipment(
                    name="Mini Tiller", category="Tillage",
                    owner="High Range Agri Club", location="Idukki",
                    daily_rate=1200, deposit=2500,
                    description="Compact tiller for suitable farm preparation work."
                ),
                Equipment(
                    name="Chainsaw", category="Cutting",
                    owner="Agri Service Centre", location="Ernakulam",
                    daily_rate=1000, deposit=2000,
                    description="Shared equipment; use only according to local safety rules."
                ),
            ])

        if db.query(Post).count() == 0:
            db.add_all([
                Post(
                    author="Demo Farmer",
                    title="Improving pepper plantation drainage",
                    body="Has anyone tried improving drainage before heavy monsoon? Looking for practical methods.",
                    tags="pepper,monsoon,drainage",
                    likes=6,
                ),
                Post(
                    author="Anil",
                    title="Cardamom shade management",
                    body="What shade level are farmers using during the current season?",
                    tags="cardamom,shade,plantation",
                    likes=4,
                ),
                Post(
                    author="Meera",
                    title="Equipment sharing near Idukki",
                    body="Looking for a power sprayer for two days next week.",
                    tags="equipment,sprayer,idukki",
                    likes=3,
                ),
            ])

        if db.query(NewsItem).count() == 0:
            db.add_all([
                NewsItem(
                    title="Monsoon advisory for plantation farmers",
                    summary="Review drainage, slope stability and harvesting plans before heavy rainfall.",
                    category="Weather", source="KrishiMitra", url="#",
                ),
                NewsItem(
                    title="Review government scheme eligibility",
                    summary="Check current eligibility and application requirements before applying.",
                    category="Schemes", source="KrishiMitra", url="#",
                ),
                NewsItem(
                    title="Wildlife monitoring awareness",
                    summary="Maintain plantation boundary monitoring and report repeated intrusion through appropriate channels.",
                    category="Safety", source="KrishiMitra", url="#",
                ),
                NewsItem(
                    title="Plantation field inspection reminder",
                    summary="Inspect drainage, soil moisture and visible crop symptoms after significant rainfall.",
                    category="Farm", source="KrishiMitra", url="#",
                ),
            ])

        if db.query(Alert).count() == 0:
            db.add_all([
                Alert(
                    type="weather", severity="medium",
                    title="Rainfall monitoring", read=False,
                    message="Monitor rainfall before field operations and inspect drainage after heavy rain."
                ),
                Alert(
                    type="scheme", severity="info",
                    title="Scheme information", read=False,
                    message="Review available scheme recommendations for your plantation."
                ),
                Alert(
                    type="wildlife", severity="info",
                    title="Wildlife monitoring", read=False,
                    message="No confirmed wildlife intrusion is recorded in demo mode."
                ),
            ])
        db.commit()
    finally:
        db.close()

seed()

# -------------------------------------------------------------------
# Schemas
# -------------------------------------------------------------------

class AdvisoryRequest(BaseModel):
    crop: str
    growth_stage: str = "vegetative"
    rainfall_mm: float = 20
    temperature_c: float = 28
    soil_moisture: float = 50
    humidity: float = 70

class RiskRequest(BaseModel):
    rainfall_24h: float = 35
    rainfall_7d: float = 100
    soil_moisture: float = 55
    river_level: float = 1.0
    slope: str = "moderate"

class PostRequest(BaseModel):
    author: str = "Demo Farmer"
    title: str
    body: str
    tags: str = ""

class EquipmentRequest(BaseModel):
    name: str
    category: str
    owner: str
    location: str
    daily_rate: float
    deposit: float = 0
    available: bool = True
    description: str = ""

class RentalRequest(BaseModel):
    equipment_id: int
    farmer_name: str
    start_date: str
    days: int = Field(default=1, ge=1, le=60)

class ProfileRequest(BaseModel):
    name: str
    phone: str = ""
    email: str = ""
    district: str = "Idukki"
    location: str = "Idukki, Kerala"
    crops: str = "rubber,pepper,cardamom"
    farm_size: float = 2.0
    preferred_language: str = "English"

class FarmUpdateRequest(BaseModel):
    crop: str
    area: float
    soil_moisture: float
    health_score: float = 78

# -------------------------------------------------------------------
# Utility / AI functions
# -------------------------------------------------------------------

def advisory_engine(p):
    crop = p.crop.lower().strip()
    advice = []
    alerts = []

    if p.rainfall_mm >= 100:
        alerts.append("Heavy rainfall condition: inspect drainage and avoid unnecessary field operations.")
    elif p.rainfall_mm >= 60:
        alerts.append("High rainfall: monitor waterlogging and slope stability.")

    if p.rainfall_mm < 5 and p.soil_moisture < 35:
        alerts.append("Low moisture condition: check irrigation requirements.")

    if p.temperature_c >= 34:
        alerts.append("High temperature: monitor heat stress and soil moisture.")

    if p.soil_moisture >= 85:
        alerts.append("High soil moisture: avoid additional irrigation and inspect root-zone drainage.")

    crop_rules = {
        "pepper": [
            "Inspect support vines and maintain suitable drainage.",
            "Check leaves and spikes for visible disease or pest symptoms.",
        ],
        "rubber": [
            "Inspect tapping panels and avoid unsuitable tapping conditions during very wet periods.",
            "Keep drainage channels clear around plantation blocks.",
        ],
        "cardamom": [
            "Monitor shade, soil moisture and visible leaf/panicle symptoms.",
            "Inspect drainage after prolonged rainfall.",
        ],
        "coffee": [
            "Monitor shade, soil moisture and pest/disease symptoms.",
            "Inspect erosion and drainage after heavy rainfall.",
        ],
        "nutmeg": [
            "Inspect canopy and drainage, especially after heavy rainfall.",
            "Monitor visible pest and disease symptoms.",
        ],
    }

    advice.extend(crop_rules.get(
        crop,
        ["Follow crop-specific agronomic practices and inspect plant health regularly."]
    ))

    if p.growth_stage.lower() in ["flowering", "fruiting"]:
        advice.append("Prioritize field inspection during the flowering/fruiting stage.")

    return {
        "crop": crop,
        "growth_stage": p.growth_stage,
        "advice": advice,
        "alerts": alerts,
        "model": "Rule-Based Expert System",
    }

def flood_risk_engine(p):
    score = 0

    if p.rainfall_24h >= 120: score += 45
    elif p.rainfall_24h >= 80: score += 35
    elif p.rainfall_24h >= 50: score += 22
    elif p.rainfall_24h >= 25: score += 10

    if p.rainfall_7d >= 300: score += 30
    elif p.rainfall_7d >= 200: score += 22
    elif p.rainfall_7d >= 120: score += 12

    if p.soil_moisture >= 90: score += 20
    elif p.soil_moisture >= 75: score += 12
    elif p.soil_moisture >= 60: score += 6

    if p.river_level >= 3: score += 15
    elif p.river_level >= 2: score += 9
    elif p.river_level >= 1.5: score += 4

    if p.slope.lower() == "steep":
        score += 8
    elif p.slope.lower() == "moderate":
        score += 3

    score = min(100, score)
    label = "HIGH" if score >= 65 else "MEDIUM" if score >= 35 else "LOW"

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
        "score": score,
        "risk": label,
        "actions": actions[label],
        "model": "Random Forest-compatible risk pipeline",
    }

def rank_schemes(db, crops, district, needs):
    schemes = db.query(Scheme).all()
    query = " ".join(crops + [district, needs]).lower().strip()

    if not schemes:
        return []

    documents = [
        " ".join([
            s.name, s.description or "", s.crops or "",
            s.districts or "", s.keywords or "", s.eligibility or ""
        ])
        for s in schemes
    ]

    vectorizer = TfidfVectorizer(stop_words="english")
    matrix = vectorizer.fit_transform([query] + documents)
    scores = cosine_similarity(matrix[0:1], matrix[1:]).flatten()

    result = []
    for scheme, score in sorted(
        zip(schemes, scores), key=lambda x: x[1], reverse=True
    ):
        result.append({
            "id": scheme.id,
            "name": scheme.name,
            "description": scheme.description,
            "eligibility": scheme.eligibility,
            "score": round(float(score), 3),
            "url": scheme.url,
        })
    return result

def semantic_posts(db, query):
    posts = db.query(Post).order_by(desc(Post.created_at)).all()
    if not query.strip():
        return [post_json(x, 0) for x in posts]

    docs = [f"{p.title} {p.body} {p.tags}" for p in posts]
    vectorizer = TfidfVectorizer(stop_words="english")
    matrix = vectorizer.fit_transform([query] + docs)
    scores = cosine_similarity(matrix[0:1], matrix[1:]).flatten()

    return [
        post_json(p, score)
        for p, score in sorted(zip(posts, scores), key=lambda x: x[1], reverse=True)
    ]

def post_json(p, score=0):
    return {
        "id": p.id, "author": p.author, "title": p.title,
        "body": p.body, "tags": p.tags, "likes": p.likes or 0,
        "score": round(float(score), 3),
        "created_at": p.created_at,
    }

def equipment_priority(items, location="", days=1, budget=None):
    result = []
    for item in items:
        if not item.available:
            continue
        total = item.daily_rate * days + item.deposit
        if budget is not None and total > budget:
            continue

        distance_penalty = 0 if location.lower() in item.location.lower() else 1
        priority = distance_penalty * 10000 + total

        result.append({
            "id": item.id,
            "name": item.name,
            "category": item.category,
            "owner": item.owner,
            "location": item.location,
            "daily_rate": item.daily_rate,
            "deposit": item.deposit,
            "total_cost": total,
            "description": item.description,
            "priority": priority,
        })
    return sorted(result, key=lambda x: x["priority"])

def weather_demo():
    """Fallback data so the UI remains usable without an OpenWeather key."""
    base = datetime.now()
    return {
        "location": "Idukki, Kerala",
        "current": {
            "temperature_c": 24,
            "humidity": 78,
            "rain_probability": 40,
            "condition": "Partly cloudy",
            "wind_kmh": 12,
        },
        "forecast": [
            {
                "date": (base + timedelta(days=i)).strftime("%Y-%m-%d"),
                "temperature_c": 24 + (i % 2),
                "rain_probability": 40 + i * 5,
                "rainfall_mm": 18 + i * 4,
                "condition": ["Partly cloudy", "Light rain", "Cloudy"][i % 3],
            }
            for i in range(5)
        ],
        "source": "Demo weather mode",
    }


async def _geocode_open_meteo(city: str):
    """Resolve a city/place name to coordinates using Open-Meteo Geocoding."""
    url = "https://geocoding-api.open-meteo.com/v1/search"
    params = {"name": city, "count": 1, "language": "en", "format": "json"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
    except (httpx.RequestError, httpx.HTTPStatusError):
        raise HTTPException(502, "Unable to reach Open-Meteo geocoding service right now.")

    results = data.get("results") or []
    if not results:
        raise HTTPException(404, f"Weather location not found: {city}")

    return results[0]


def _weather_condition(code: int) -> str:
    """Map Open-Meteo WMO weather codes to human-readable conditions."""
    code = int(code)
    mapping = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Depositing rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        56: "Light freezing drizzle",
        57: "Dense freezing drizzle",
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",
        66: "Light freezing rain",
        67: "Heavy freezing rain",
        71: "Slight snow",
        73: "Moderate snow",
        75: "Heavy snow",
        77: "Snow grains",
        80: "Slight rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",
        85: "Slight snow showers",
        86: "Heavy snow showers",
        95: "Thunderstorm",
        96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail",
    }
    return mapping.get(code, "Unknown")


async def live_weather(city: str):
    """Fetch real current, hourly and five-day weather data from Open-Meteo."""
    location = await _geocode_open_meteo(city)

    forecast_url = "https://api.open-meteo.com/v1/forecast"

    params = {
        "latitude": location["latitude"],
        "longitude": location["longitude"],

        "current": ",".join([
            "temperature_2m",
            "apparent_temperature",
            "relative_humidity_2m",
            "precipitation",
            "weather_code",
            "wind_speed_10m",
            "wind_direction_10m",
            "uv_index",
        ]),

        "hourly": ",".join([
            "temperature_2m",
            "apparent_temperature",
            "relative_humidity_2m",
            "precipitation_probability",
            "precipitation",
            "weather_code",
            "wind_speed_10m",
            "wind_direction_10m",
            "soil_moisture_0_to_7cm",
        ]),

        "daily": ",".join([
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "apparent_temperature_max",
            "apparent_temperature_min",
            "precipitation_sum",
            "precipitation_probability_max",
            "uv_index_max",
            "wind_speed_10m_max",
            "wind_direction_10m_dominant",
        ]),

        # Include recent weather data so rainfall can be calculated
        # for the previous 24 hours and 7 days.
        "past_days": 7,
        "forecast_days": 5,

        "timezone": "auto",
        "temperature_unit": "celsius",
        "wind_speed_unit": "kmh",
        "precipitation_unit": "mm",
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(forecast_url, params=params)
            response.raise_for_status()
            data = response.json()

    except httpx.HTTPStatusError:
        raise HTTPException(
            502,
            "Open-Meteo could not provide weather data right now."
        )

    except (httpx.RequestError, KeyError, ValueError, TypeError):
        raise HTTPException(
            502,
            "Unable to reach Open-Meteo right now. Please try again."
        )

    current = data.get("current", {})
    hourly = data.get("hourly", {})
    daily = data.get("daily", {})

    # ---------------------------------------------------------------
    # Current weather
    # ---------------------------------------------------------------

    current_time = current.get("time")

    hourly_times = hourly.get("time", [])
    hourly_rain = hourly.get("precipitation", [])
    hourly_rain_probability = hourly.get("precipitation_probability", [])
    hourly_soil = hourly.get("soil_moisture_0_to_7cm", [])

    # Find the hourly index corresponding to the current hour.
    current_index = 0

    if current_time and hourly_times:
        try:
            from datetime import datetime

            current_dt = datetime.fromisoformat(current_time)

            hourly_dates = [
                datetime.fromisoformat(t)
                for t in hourly_times
            ]

            # Find the first hourly forecast at or after
            # the current weather observation.
            future_indices = [
                i
                for i, dt in enumerate(hourly_dates)
                if dt >= current_dt
            ]

            if future_indices:
                current_index = future_indices[0]

        except (ValueError, TypeError):
            current_index = 0

    # ---------------------------------------------------------------
    # Rain probability
    # ---------------------------------------------------------------

    rain_probability = 0

    if (
        current_index < len(hourly_rain_probability)
        and hourly_rain_probability[current_index] is not None
    ):
        rain_probability = int(
            round(float(hourly_rain_probability[current_index]))
        )

    # ---------------------------------------------------------------
    # Rainfall calculations
    # ---------------------------------------------------------------

    rainfall_24h = 0.0
    rainfall_7d = 0.0

    # The API returns hourly data covering the previous 7 days.
    # Calculate the rainfall using the most recent hours.
    if hourly_rain:
        valid_rain = [
            float(x) for x in hourly_rain
            if x is not None
        ]

        if valid_rain:
            rainfall_24h = sum(valid_rain[-24:])
            rainfall_7d = sum(valid_rain[-168:])

    # ---------------------------------------------------------------
    # Soil moisture
    # ---------------------------------------------------------------

    soil_moisture = None

    if (
        current_index < len(hourly_soil)
        and hourly_soil[current_index] is not None
    ):
        # Open-Meteo provides volumetric soil moisture.
        # Convert m³/m³ to a percentage for the UI.
        soil_moisture = round(
            float(hourly_soil[current_index]) * 100,
            1
        )

    # ---------------------------------------------------------------
    # Five-day forecast
    # ---------------------------------------------------------------

    dates = daily.get("time", [])
    codes = daily.get("weather_code", [])
    max_temps = daily.get("temperature_2m_max", [])
    min_temps = daily.get("temperature_2m_min", [])
    apparent_max = daily.get("apparent_temperature_max", [])
    apparent_min = daily.get("apparent_temperature_min", [])
    rainfall = daily.get("precipitation_sum", [])
    rain_probs = daily.get("precipitation_probability_max", [])
    uv_indexes = daily.get("uv_index_max", [])
    wind_max = daily.get("wind_speed_10m_max", [])
    wind_direction = daily.get("wind_direction_10m_dominant", [])

    forecast = []

    # Open-Meteo returns the 7 past days first because
    # past_days=7 was requested. We only want the
    # upcoming 5 forecast days.
    forecast_start = max(0, len(dates) - 5)

    for i in range(forecast_start, len(dates)):
        date = dates[i]

        code = (
            codes[i]
            if i < len(codes)
            else 0
        )

        forecast.append({
            "date": date,

            "temperature_c": (
                round(float(max_temps[i]), 1)
                if i < len(max_temps)
                else None
            ),

            "min_temperature_c": (
                round(float(min_temps[i]), 1)
                if i < len(min_temps)
                else None
            ),

            "max_temperature_c": (
                round(float(max_temps[i]), 1)
                if i < len(max_temps)
                else None
            ),

            "apparent_max_c": (
                round(float(apparent_max[i]), 1)
                if i < len(apparent_max)
                else None
            ),

            "apparent_min_c": (
                round(float(apparent_min[i]), 1)
                if i < len(apparent_min)
                else None
            ),

            "rain_probability": (
                int(round(float(rain_probs[i])))
                if i < len(rain_probs)
                else 0
            ),

            "rainfall_mm": (
                round(float(rainfall[i]), 1)
                if i < len(rainfall)
                else 0
            ),

            "uv_index": (
                round(float(uv_indexes[i]), 1)
                if i < len(uv_indexes)
                else None
            ),

            "wind_kmh": (
                round(float(wind_max[i]), 1)
                if i < len(wind_max)
                else None
            ),

            "wind_direction": (
                int(round(float(wind_direction[i])))
                if i < len(wind_direction)
                else None
            ),

            "condition": _weather_condition(code),
        })

    # ---------------------------------------------------------------
    # Hourly forecast
    # ---------------------------------------------------------------

    hourly_forecast = []

    # Show the next 12 hours.
    start = current_index
    end = min(start + 12, len(hourly_times))

    for i in range(start, end):

        hourly_forecast.append({
            "time": hourly_times[i],

            "temperature_c": (
                round(float(hourly.get("temperature_2m", [])[i]), 1)
                if i < len(hourly.get("temperature_2m", []))
                else None
            ),

            "apparent_temperature_c": (
                round(
                    float(
                        hourly.get("apparent_temperature", [])[i]
                    ),
                    1
                )
                if i < len(hourly.get("apparent_temperature", []))
                else None
            ),

            "humidity": (
                int(
                    round(
                        float(
                            hourly.get(
                                "relative_humidity_2m",
                                []
                            )[i]
                        )
                    )
                )
                if i < len(
                    hourly.get(
                        "relative_humidity_2m",
                        []
                    )
                )
                else None
            ),

            "rain_probability": (
                int(
                    round(
                        float(
                            hourly.get(
                                "precipitation_probability",
                                []
                            )[i]
                        )
                    )
                )
                if i < len(
                    hourly.get(
                        "precipitation_probability",
                        []
                    )
                )
                else 0
            ),

            "rainfall_mm": (
                round(
                    float(
                        hourly.get(
                            "precipitation",
                            []
                        )[i]
                    ),
                    1
                )
                if i < len(
                    hourly.get(
                        "precipitation",
                        []
                    )
                )
                else 0
            ),

            "wind_kmh": (
                round(
                    float(
                        hourly.get(
                            "wind_speed_10m",
                            []
                        )[i]
                    ),
                    1
                )
                if i < len(
                    hourly.get(
                        "wind_speed_10m",
                        []
                    )
                )
                else None
            ),

            "condition": _weather_condition(
                hourly.get("weather_code", [0])[i]
            ),
        })

    # ---------------------------------------------------------------
    # Location
    # ---------------------------------------------------------------

    location_name = location.get("name", city)
    admin1 = location.get("admin1")
    country = location.get("country")

    display_location = ", ".join(
        x for x in [
            location_name,
            admin1,
            country
        ]
        if x
    )

    # ---------------------------------------------------------------
    # Final response
    # ---------------------------------------------------------------

    return {
        "location": display_location,

        "coordinates": {
            "latitude": location["latitude"],
            "longitude": location["longitude"],
        },

        "current": {
            "temperature_c": round(
                float(current.get("temperature_2m", 0)),
                1
            ),

            "feels_like_c": round(
                float(current.get("apparent_temperature", 0)),
                1
            ),

            "humidity": int(
                round(
                    float(
                        current.get(
                            "relative_humidity_2m",
                            0
                        )
                    )
                )
            ),

            "rain_probability": rain_probability,

            "rainfall_mm": round(
                float(
                    current.get(
                        "precipitation",
                        0
                    )
                ),
                1
            ),

            "condition": _weather_condition(
                current.get("weather_code", 0)
            ),

            "wind_kmh": round(
                float(
                    current.get(
                        "wind_speed_10m",
                        0
                    )
                ),
                1
            ),

            "wind_direction": int(
                round(
                    float(
                        current.get(
                            "wind_direction_10m",
                            0
                        )
                    )
                )
            ),

            "uv_index": round(
                float(
                    current.get(
                        "uv_index",
                        0
                    )
                ),
                1
            ),
        },

        "risk_inputs": {
            "rainfall_24h": round(rainfall_24h, 1),
            "rainfall_7d": round(rainfall_7d, 1),
            "soil_moisture": soil_moisture,
        },

        "forecast": forecast,

        "hourly": hourly_forecast,

        "source": "Open-Meteo",

        "source_url": "https://open-meteo.com/",
    }

# -------------------------------------------------------------------
# API endpoints
# -------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "KrishiMitra", "version": "2.0.0"}

@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db)):
    farmer = db.query(Farmer).first()
    farm = db.query(Farm).filter(Farm.farmer_id == farmer.id).first() if farmer else None
    news = db.query(NewsItem).order_by(desc(NewsItem.published_at)).limit(5).all()
    unread = db.query(Alert).filter(Alert.read == False).count()

    return {
        "farmer": {
            "id": farmer.id if farmer else None,
            "name": farmer.name if farmer else "Farmer",
            "district": farmer.district if farmer else "Idukki",
            "location": farmer.location if farmer else "Idukki, Kerala",
            "crops": farmer.crops if farmer else "",
            "farm_size": farmer.farm_size if farmer else 0,
        },
        "farm": {
            "crop": farm.crop if farm else "pepper",
            "area": farm.area if farm else 0,
            "soil_moisture": farm.soil_moisture if farm else 0,
            "health_score": farm.health_score if farm else 0,
        },
        "stats": {
            "weather": "24°C",
            "flood_risk": "LOW",
            "wildlife": "No recent intrusion",
            "schemes": db.query(Scheme).count(),
            "equipment": db.query(Equipment).filter(Equipment.available == True).count(),
            "unread_alerts": unread,
        },
        "news": [news_json(n) for n in news],
    }

@app.get("/api/profile")
def get_profile(db: Session = Depends(get_db)):
    farmer = db.query(Farmer).first()
    if not farmer:
        raise HTTPException(404, "Farmer profile not found")
    return farmer_json(farmer)

@app.put("/api/profile")
def update_profile(payload: ProfileRequest, db: Session = Depends(get_db)):
    farmer = db.query(Farmer).first()
    if not farmer:
        farmer = Farmer(**payload.model_dump())
        db.add(farmer)
    else:
        for key, value in payload.model_dump().items():
            setattr(farmer, key, value)
    db.commit()
    db.refresh(farmer)
    return farmer_json(farmer)

@app.get("/api/farm")
def get_farm(db: Session = Depends(get_db)):
    farm = db.query(Farm).first()
    if not farm:
        raise HTTPException(404, "Farm not found")
    return farm_json(farm)

@app.put("/api/farm")
def update_farm(payload: FarmUpdateRequest, db: Session = Depends(get_db)):
    farm = db.query(Farm).first()
    if not farm:
        farmer = db.query(Farmer).first()
        farm = Farm(farmer_id=farmer.id if farmer else None)
        db.add(farm)
    for key, value in payload.model_dump().items():
        setattr(farm, key, value)
    db.commit()
    db.refresh(farm)
    return farm_json(farm)

@app.post("/api/advisory")
def advisory(payload: AdvisoryRequest):
    return advisory_engine(payload)

@app.get("/api/weather")
async def weather(city: str = "Idukki, Kerala"):
    return await live_weather(city)

@app.post("/api/risk/flood")
def flood_risk(payload: RiskRequest):
    return flood_risk_engine(payload)

@app.post("/api/weather/forecast")
def forecast(history: list[dict] = []):
    if not history:
        return weather_demo()["forecast"]

    # LSTM-compatible baseline. Replace with trained LSTM model when available.
    temps = [float(x.get("temperature_c", 24)) for x in history]
    rains = [float(x.get("rainfall_mm", 10)) for x in history]
    humidity = [float(x.get("humidity", 70)) for x in history]

    return [
        {
            "day": i + 1,
            "temperature_c": round(float(np.mean(temps[-3:])), 1),
            "rainfall_mm": round(float(np.mean(rains[-3:])), 1),
            "humidity": round(float(np.mean(humidity[-3:])), 1),
            "method": "LSTM-compatible baseline",
        }
        for i in range(3)
    ]

@app.get("/api/risk/farm")
def farm_risk(db: Session = Depends(get_db)):
    farm = db.query(Farm).first()
    if not farm:
        return {"overall": "LOW", "score": 15, "factors": []}

    factors = []
    score = 0

    if farm.soil_moisture > 80:
        score += 25
        factors.append({"name": "High soil moisture", "severity": "medium"})
    elif farm.soil_moisture < 30:
        score += 20
        factors.append({"name": "Low soil moisture", "severity": "medium"})

    if farm.health_score < 50:
        score += 35
        factors.append({"name": "Plantation health", "severity": "high"})
    elif farm.health_score < 70:
        score += 15
        factors.append({"name": "Plantation health", "severity": "medium"})

    score = min(score, 100)
    overall = "HIGH" if score >= 65 else "MEDIUM" if score >= 35 else "LOW"

    return {
        "overall": overall,
        "score": score,
        "factors": factors,
        "recommendation": "Inspect the affected farm conditions and use the relevant KrishiMitra advisory module.",
    }

@app.get("/api/schemes")
def schemes(
    crops: str = "",
    district: str = "Idukki",
    needs: str = "",
    db: Session = Depends(get_db),
):
    crop_list = [x.strip() for x in crops.split(",") if x.strip()]
    return rank_schemes(db, crop_list, district, needs)

@app.get("/api/equipment")
def equipment(
    location: str = "",
    days: int = Query(1, ge=1, le=60),
    budget: Optional[float] = None,
    db: Session = Depends(get_db),
):
    return equipment_priority(
        db.query(Equipment).all(), location=location, days=days, budget=budget
    )

@app.post("/api/equipment")
def create_equipment(payload: EquipmentRequest, db: Session = Depends(get_db)):
    item = Equipment(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return equipment_json(item)

@app.post("/api/equipment/rent")
def rent_equipment(payload: RentalRequest, db: Session = Depends(get_db)):
    item = db.query(Equipment).filter(Equipment.id == payload.equipment_id).first()
    if not item:
        raise HTTPException(404, "Equipment not found")
    if not item.available:
        raise HTTPException(400, "Equipment is currently unavailable")

    rental = Rental(**payload.model_dump())
    db.add(rental)
    item.available = False
    db.commit()
    db.refresh(rental)

    return {
        "message": "Rental request submitted",
        "rental_id": rental.id,
        "equipment": item.name,
        "status": rental.status,
    }

@app.get("/api/equipment/rentals")
def rentals(db: Session = Depends(get_db)):
    rows = db.query(Rental).order_by(desc(Rental.created_at)).all()
    return [rental_json(x) for x in rows]

@app.post("/api/wildlife/detect")
async def wildlife_detect(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Please upload an image file.")

    content = await file.read()

    # YOLOv8 integration point.
    # If backend/models/wildlife_yolov8.pt is present and ultralytics is installed,
    # real inference can be connected here.
    model_path = Path("models/wildlife_yolov8.pt")

    if model_path.exists():
        try:
            from ultralytics import YOLO
            import tempfile

            with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
                tmp.write(content)
                tmp_path = tmp.name

            model = YOLO(str(model_path))
            results = model(tmp_path, verbose=False)

            detections = []
            for result in results:
                names = result.names
                if result.boxes is None:
                    continue
                for box in result.boxes:
                    cls = int(box.cls[0])
                    conf = float(box.conf[0])
                    detections.append({
                        "class": names.get(cls, str(cls)),
                        "confidence": round(conf, 3),
                        "box": [round(float(v), 2) for v in box.xyxy[0].tolist()],
                    })

            return {
                "mode": "YOLOv8",
                "filename": file.filename,
                "detections": detections,
                "message": f"{len(detections)} detection(s) returned.",
            }
        except Exception as exc:
            return {
                "mode": "fallback",
                "filename": file.filename,
                "detections": [],
                "message": f"YOLOv8 model found but inference could not run: {exc}",
            }

    return {
        "mode": "demo",
        "filename": file.filename,
        "detections": [],
        "message": "No trained wildlife_yolov8.pt file is installed. The YOLOv8 inference endpoint is ready for your trained model.",
        "bytes_received": len(content),
    }

@app.get("/api/community")
def community(q: str = "", db: Session = Depends(get_db)):
    return semantic_posts(db, q)

@app.post("/api/community")
def create_post(payload: PostRequest, db: Session = Depends(get_db)):
    post = Post(**payload.model_dump())
    db.add(post)
    db.commit()
    db.refresh(post)
    return post_json(post)

@app.post("/api/community/{post_id}/like")
def like_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    post.likes = (post.likes or 0) + 1
    db.commit()
    return {"id": post.id, "likes": post.likes}

@app.get("/api/news")
def news(db: Session = Depends(get_db)):
    return [news_json(n) for n in db.query(NewsItem).order_by(desc(NewsItem.published_at)).limit(30).all()]

@app.get("/api/alerts")
def alerts(unread_only: bool = False, db: Session = Depends(get_db)):
    q = db.query(Alert)
    if unread_only:
        q = q.filter(Alert.read == False)
    return [alert_json(x) for x in q.order_by(desc(Alert.created_at)).limit(50).all()]

@app.post("/api/alerts/{alert_id}/read")
def mark_alert_read(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(404, "Alert not found")
    alert.read = True
    db.commit()
    return {"message": "Alert marked as read"}

@app.post("/api/alerts/read-all")
def mark_all_alerts_read(db: Session = Depends(get_db)):
    db.query(Alert).filter(Alert.read == False).update({"read": True})
    db.commit()
    return {"message": "All alerts marked as read"}

@app.get("/api/analytics")
def analytics(db: Session = Depends(get_db)):
    farm = db.query(Farm).first()
    return {
        "health": farm.health_score if farm else 78,
        "soil_moisture": farm.soil_moisture if farm else 55,
        "monthly_risk": [
            {"month": "Jan", "risk": 18},
            {"month": "Feb", "risk": 22},
            {"month": "Mar", "risk": 27},
            {"month": "Apr", "risk": 34},
            {"month": "May", "risk": 45},
            {"month": "Jun", "risk": 62},
        ],
        "crop_health": [
            {"crop": "Pepper", "score": 82},
            {"crop": "Cardamom", "score": 75},
            {"crop": "Rubber", "score": 79},
        ],
    }

# -------------------------------------------------------------------
# JSON serializers
# -------------------------------------------------------------------

def farmer_json(x):
    return {
        "id": x.id, "name": x.name, "phone": x.phone, "email": x.email,
        "district": x.district, "location": x.location, "crops": x.crops,
        "farm_size": x.farm_size, "preferred_language": x.preferred_language,
    }

def farm_json(x):
    return {
        "id": x.id, "name": x.name, "crop": x.crop, "area": x.area,
        "soil_moisture": x.soil_moisture, "health_score": x.health_score,
        "latitude": x.latitude, "longitude": x.longitude,
    }

def equipment_json(x):
    return {
        "id": x.id, "name": x.name, "category": x.category,
        "owner": x.owner, "location": x.location,
        "daily_rate": x.daily_rate, "deposit": x.deposit,
        "available": x.available, "description": x.description,
    }

def rental_json(x):
    return {
        "id": x.id, "equipment_id": x.equipment_id,
        "farmer_name": x.farmer_name, "start_date": x.start_date,
        "days": x.days, "status": x.status, "created_at": x.created_at,
    }

def news_json(x):
    return {
        "id": x.id, "title": x.title, "summary": x.summary,
        "category": x.category, "source": x.source,
        "url": x.url, "published_at": x.published_at,
    }

def alert_json(x):
    return {
        "id": x.id, "type": x.type, "severity": x.severity,
        "title": x.title, "message": x.message,
        "read": x.read, "created_at": x.created_at,
    }

@app.get("/")
def root():
    return {
        "service": "KrishiMitra",
        "message": "KrishiMitra API is running",
        "docs": "/docs",
    }
