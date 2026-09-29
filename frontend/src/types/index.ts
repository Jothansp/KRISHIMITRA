export type Severity = "info" | "low" | "medium" | "high";
export type RiskLabel = "LOW" | "MEDIUM" | "HIGH";

export interface Farmer {
  id: number | null; name: string; phone: string; email: string;
  district: string; location: string; crops: string;
  farm_size: number; preferred_language: string;
}
export interface Farm {
  id: number; name: string; crop: string; area: number;
  soil_moisture: number; health_score: number; latitude: number; longitude: number;
}
export interface NewsItem {
  id: number; title: string; summary: string; category: string;
  source: string; url: string; published_at: string;
}
export interface Dashboard {
  farmer: Pick<Farmer, "id" | "name" | "district" | "location" | "crops" | "farm_size">;
  farm: Pick<Farm, "crop" | "area" | "soil_moisture" | "health_score">;
  stats: {
    weather: string; flood_risk: string; wildlife: string;
    schemes: number; equipment: number; unread_alerts: number;
  };
  news: NewsItem[];
}

export interface AdvisoryRequest {
  crop: string; growth_stage: string; rainfall_mm: number;
  temperature_c: number; soil_moisture: number; humidity: number;
}
export interface AdvisoryResult {
  crop: string; growth_stage: string; advice: string[]; alerts: string[]; model: string;
}

export interface WeatherCurrent {
  temperature_c: number; humidity: number; rain_probability: number;
  rainfall_mm?: number; condition: string; wind_kmh: number;
}
export interface WeatherDay {
  date: string; temperature_c: number | null;
  min_temperature_c?: number | null; max_temperature_c?: number | null;
  rain_probability: number; rainfall_mm: number; condition: string;
}
export interface WeatherData {
  location: string;
  coordinates?: { latitude: number; longitude: number };
  current: WeatherCurrent; forecast: WeatherDay[];
  source: string; source_url?: string;
}

export interface FloodRequest {
  rainfall_24h: number; rainfall_7d: number; predicted_rainfall_24h: number;
  soil_moisture: number; river_level: number; slope: string;
}
export interface FloodResult {
  score: number; risk: RiskLabel; actions: string[]; model?: string;
  confidence?: number | null; probabilities?: Record<string, number>;
  features?: Record<string, number>;
}
export interface AIRainForecast {
  location: string;
  recent_rainfall_24h: number;
  recent_rainfall_7d: number;
  history_days_used: number;
  forecast: { day: number; rainfall_mm: number; method?: string }[];
  source: string;
}

export interface RiskFactor { name: string; severity: "medium" | "high" }
export interface FarmRisk {
  overall: RiskLabel; score: number; factors: RiskFactor[]; recommendation: string;
}

export interface Detection { class: string; confidence: number; box: number[] }
export interface WildlifeResult {
  mode: string; filename: string; detections: Detection[]; message: string; bytes_received?: number;
}

export interface Scheme {
  id: number; name: string; description: string; eligibility: string; score: number; url: string;
}
export interface Equipment {
  id: number; name: string; category: string; owner: string; location: string;
  daily_rate: number; deposit: number; total_cost: number; description: string; priority: number;
}
export interface RentalResponse { message: string; rental_id: number; equipment: string; status: string }

export interface Post {
  id: number; author: string; title: string; body: string;
  tags: string; likes: number; score: number; created_at: string;
}
export interface Alert {
  id: number; type: string; severity: Severity; title: string;
  message: string; read: boolean; created_at: string;
}
