import { useEffect, useState } from "react";
import { CloudRain, Wind, Droplets, MapPin, ShieldAlert, RefreshCw, Umbrella } from "lucide-react";
import { api, errorMessage } from "../services/api";
import { PageHeader, Card, Metric, Pill, ErrorNote } from "../components/UI";
import type { FloodRequest, FloodResult, WeatherData, AIRainForecast } from "../types";

type RiskForm = {
  rainfall_24h: string;
  rainfall_7d: string;
  predicted_rainfall_24h: string;
  soil_moisture: string;
  river_level: string;
  slope: string;
};

const DEFAULT_SITE = { soil_moisture: "55", river_level: "1", slope: "moderate" };

export default function Weather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [city, setCity] = useState("Idukki, Kerala");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [risk, setRisk] = useState<FloodResult | null>(null);
  const [riskError, setRiskError] = useState("");
  const [rainForecast, setRainForecast] = useState<AIRainForecast | null>(null);
  const [rainLoading, setRainLoading] = useState(false);
  const [form, setForm] = useState<RiskForm>({
    rainfall_24h: "0",
    rainfall_7d: "0",
    predicted_rainfall_24h: "0",
    ...DEFAULT_SITE,
  });

  async function assessRisk(values: RiskForm) {
    setRiskError("");
    const body: FloodRequest = {
      rainfall_24h: Number(values.rainfall_24h),
      rainfall_7d: Number(values.rainfall_7d),
      predicted_rainfall_24h: Number(values.predicted_rainfall_24h),
      soil_moisture: Number(values.soil_moisture),
      river_level: Number(values.river_level),
      slope: values.slope,
    };
    try {
      setRisk(await api.post<FloodResult>("/risk/flood", body));
    } catch (err) {
      setRiskError(errorMessage(err, "Unable to calculate flood risk."));
    }
  }

  async function loadRainForecast(target: string, currentWeather: WeatherData) {
    setRainLoading(true);
    try {
      const result = await api.get<AIRainForecast>(
        `/weather/ai-forecast?city=${encodeURIComponent(target)}`
      );
      setRainForecast(result);

      const next = result.forecast[0]?.rainfall_mm ?? currentWeather.forecast[0]?.rainfall_mm ?? 0;
      const values: RiskForm = {
        rainfall_24h: String(result.recent_rainfall_24h),
        rainfall_7d: String(result.recent_rainfall_7d),
        predicted_rainfall_24h: String(next),
        ...DEFAULT_SITE,
      };
      setForm(values);
      await assessRisk(values);
    } catch (err) {
      // The weather API forecast is still useful if the historical forecast service is unavailable.
      setRainForecast(null);
      const forecastRain = currentWeather.forecast[0]?.rainfall_mm ?? 0;
      const values: RiskForm = {
        rainfall_24h: String(currentWeather.current.rainfall_mm ?? 0),
        rainfall_7d: String(currentWeather.forecast.reduce((sum, day) => sum + day.rainfall_mm, 0).toFixed(1)),
        predicted_rainfall_24h: String(forecastRain),
        ...DEFAULT_SITE,
      };
      setForm(values);
      await assessRisk(values);
      setRiskError(`Rainfall outlook could not be refreshed. ${errorMessage(err, "Using the available weather forecast instead.")}`);
    } finally {
      setRainLoading(false);
    }
  }

  async function loadWeather(target: string = city) {
    setLoading(true);
    setError("");
    setRisk(null);
    try {
      const result = await api.get<WeatherData>(`/weather?city=${encodeURIComponent(target)}`);
      setWeather(result);
      // Weather, rainfall outlook and flood risk are refreshed together.
      await loadRainForecast(target, result);
    } catch (err) {
      setError(errorMessage(err, "Unable to load weather data."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWeather();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="WEATHER INTELLIGENCE"
        title="Weather & Flood Risk"
        description="Live weather, rainfall outlook and plantation flood-risk assessment."
      />

      <div className="two-column">
        <Card title="Current Weather" icon={<CloudRain />}>
          <form
            className="form-grid"
            style={{ gridTemplateColumns: "1fr auto", marginBottom: 16 }}
            onSubmit={(e) => { e.preventDefault(); void loadWeather(); }}
          >
            <label>Location
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City, State" />
            </label>
            <button className="primary-button" disabled={loading} style={{ alignSelf: "end" }}>
              <RefreshCw size={15} /> {loading ? "Updating..." : "Refresh"}
            </button>
          </form>

          <ErrorNote message={error} />

          {weather && <>
            <div className="weather-hero">
              <div className="weather-symbol">🌦️</div>
              <div>
                <strong>{weather.current.temperature_c}°C</strong>
                <span>{weather.current.condition}</span>
                <small><MapPin size={13} /> {weather.location}</small>
              </div>
            </div>

            <div className="mini-metrics">
              <Metric label="Humidity" value={`${weather.current.humidity}%`} icon={<Droplets size={16} />} />
              <Metric label="Rain probability" value={`${weather.current.rain_probability}%`} icon={<CloudRain size={16} />} />
              <Metric label="Wind" value={`${weather.current.wind_kmh} km/h`} icon={<Wind size={16} />} />
            </div>

            <small>Data source: {weather.source}</small>

            <div className="forecast-list">
              {weather.forecast.map((day) => (
                <div key={day.date}>
                  <span>{day.date}</span>
                  <b>{day.temperature_c ?? "–"}°</b>
                  <small>{day.condition} • {day.rainfall_mm} mm</small>
                </div>
              ))}
            </div>

            <div className="rain-outlook">
              <div className="card-heading" style={{ marginBottom: 10 }}>
                <Umbrella size={18} className="heading-icon" />
                <h2>Rainfall Outlook</h2>
              </div>
              {rainLoading ? (
                <p className="muted">Updating rainfall outlook...</p>
              ) : rainForecast ? (
                <>
                  <div className="mini-metrics" style={{ margin: "8px 0 12px" }}>
                    <Metric label="Recent 24h rainfall" value={`${rainForecast.recent_rainfall_24h} mm`} />
                    <Metric label="Recent 7-day rainfall" value={`${rainForecast.recent_rainfall_7d} mm`} />
                    <Metric label="Next 24h outlook" value={`${rainForecast.forecast[0]?.rainfall_mm ?? 0} mm`} />
                  </div>
                  <div className="forecast-list">
                    {rainForecast.forecast.map((x) => (
                      <div key={x.day}>
                        <span>Day {x.day}</span>
                        <b>{x.rainfall_mm} mm</b>
                        <small>Expected rainfall</small>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="muted">Using the live weather forecast for rainfall assessment.</p>
              )}
            </div>
          </>}
        </Card>

        <Card title="Flood / Monsoon Risk" icon={<ShieldAlert />}>
          <p className="muted">
            Risk is assessed automatically using recent rainfall, the rainfall outlook and farm conditions.
          </p>

          <div className="risk-input-summary">
            <div><span>Recent 24h rain</span><b>{form.rainfall_24h} mm</b></div>
            <div><span>Recent 7-day rain</span><b>{form.rainfall_7d} mm</b></div>
            <div><span>Next 24h rain</span><b>{form.predicted_rainfall_24h} mm</b></div>
            <div><span>Soil moisture</span><b>{form.soil_moisture}%</b></div>
            <div><span>River level</span><b>{form.river_level}</b></div>
            <div><span>Slope</span><b>{form.slope}</b></div>
          </div>

          {risk && (
            <div className={`risk-card ${risk.risk.toLowerCase()}`}>
              <Pill>{risk.risk} RISK</Pill>
              <strong>{risk.score}/100</strong>
              <p>Flood risk score</p>
              {risk.actions.map((a, i) => <p key={i}>• {a}</p>)}
              {risk.confidence != null && <small>Prediction confidence: {risk.confidence}%</small>}
            </div>
          )}

          {!risk && !riskError && <p className="muted">Risk assessment will appear automatically with the weather update.</p>}
          <ErrorNote message={riskError} />
        </Card>
      </div>
    </>
  );
}
