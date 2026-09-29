import { useEffect, useState } from "react";
import { CloudRain, Wind, Droplets, MapPin, RefreshCw, Umbrella } from "lucide-react";
import { api, errorMessage } from "../services/api";
import { PageHeader, Card, Metric, ErrorNote } from "../components/UI";
import type { WeatherData, AIRainForecast } from "../types";

export default function Weather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [city, setCity] = useState("Idukki, Kerala");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rainForecast, setRainForecast] = useState<AIRainForecast | null>(null);
  const [rainLoading, setRainLoading] = useState(false);
  const [rainError, setRainError] = useState("");

  async function loadRainForecast(target: string) {
    setRainLoading(true);
    setRainError("");

    try {
      const result = await api.get<AIRainForecast>(
        `/weather/ai-forecast?city=${encodeURIComponent(target)}`
      );
      setRainForecast(result);
    } catch (err) {
      // Current weather remains useful even if the historical/AI rainfall service is unavailable.
      setRainForecast(null);
      setRainError(
        errorMessage(err, "Rainfall outlook is temporarily unavailable. Showing the live weather forecast instead.")
      );
    } finally {
      setRainLoading(false);
    }
  }

  async function loadWeather(target: string = city) {
    setLoading(true);
    setError("");

    try {
      const result = await api.get<WeatherData>(
        `/weather?city=${encodeURIComponent(target)}`
      );
      setWeather(result);
      await loadRainForecast(target);
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
        title="Weather Intelligence"
        description="Live weather conditions and AI-assisted rainfall outlook for plantation planning."
      />

      <div className="two-column">
        <Card title="Current Weather" icon={<CloudRain />}>
          <form
            className="form-grid"
            style={{ gridTemplateColumns: "1fr auto", marginBottom: 16 }}
            onSubmit={(e) => {
              e.preventDefault();
              void loadWeather();
            }}
          >
            <label>
              Location
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City, State"
              />
            </label>
            <button
              className="primary-button"
              disabled={loading}
              style={{ alignSelf: "end" }}
            >
              <RefreshCw size={15} /> {loading ? "Updating..." : "Refresh"}
            </button>
          </form>

          <ErrorNote message={error} />

          {weather && (
            <>
              <div className="weather-hero">
                <div className="weather-symbol">🌦️</div>
                <div>
                  <strong>{weather.current.temperature_c}°C</strong>
                  <span>{weather.current.condition}</span>
                  <small>
                    <MapPin size={13} /> {weather.location}
                  </small>
                </div>
              </div>

              <div className="mini-metrics">
                <Metric
                  label="Humidity"
                  value={`${weather.current.humidity}%`}
                  icon={<Droplets size={16} />}
                />
                <Metric
                  label="Rain probability"
                  value={`${weather.current.rain_probability}%`}
                  icon={<CloudRain size={16} />}
                />
                <Metric
                  label="Wind"
                  value={`${weather.current.wind_kmh} km/h`}
                  icon={<Wind size={16} />}
                />
              </div>

              <small>Data source: {weather.source}</small>

              <div className="forecast-list">
                {weather.forecast.map((day) => (
                  <div key={day.date}>
                    <span>{day.date}</span>
                    <b>{day.temperature_c ?? "–"}°</b>
                    <small>
                      {day.condition} • {day.rainfall_mm} mm
                    </small>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card title="Rainfall Outlook" icon={<Umbrella />}>
          <p className="muted">
            Recent rainfall and short-term rainfall predictions generated from
            historical weather observations.
          </p>

          {rainLoading ? (
            <p className="muted">Updating rainfall outlook...</p>
          ) : rainForecast ? (
            <>
              <div className="mini-metrics" style={{ margin: "8px 0 12px" }}>
                <Metric
                  label="Recent 24h rainfall"
                  value={`${rainForecast.recent_rainfall_24h} mm`}
                />
                <Metric
                  label="Recent 7-day rainfall"
                  value={`${rainForecast.recent_rainfall_7d} mm`}
                />
                <Metric
                  label="Next 24h outlook"
                  value={`${rainForecast.forecast[0]?.rainfall_mm ?? 0} mm`}
                />
              </div>

              <div className="forecast-list">
                {rainForecast.forecast.map((item) => (
                  <div key={item.day}>
                    <span>Day {item.day}</span>
                    <b>{item.rainfall_mm} mm</b>
                    <small>Expected rainfall</small>
                  </div>
                ))}
              </div>

              <small>Data source: {rainForecast.source}</small>
            </>
          ) : (
            <>
              <p className="muted">
                Historical rainfall data is temporarily unavailable. The live
                weather forecast above is still available for rainfall monitoring.
              </p>
              <ErrorNote message={rainError} />
            </>
          )}
        </Card>
      </div>
    </>
  );
}
