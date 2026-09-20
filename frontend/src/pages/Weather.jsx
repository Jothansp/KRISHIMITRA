import React, { useEffect, useState } from "react";
import {
  CloudRain,
  Wind,
  Droplets,
  MapPin,
  ShieldAlert,
  RefreshCw,
  Thermometer,
  Sun,
} from "lucide-react";

import { api } from "../services/api";
import { PageHeader, Card, Metric, Pill } from "../components/UI";

export default function Weather() {
  const [weather, setWeather] = useState(null);
  const [city, setCity] = useState("Kochi, Kerala");

  const [loading, setLoading] = useState(false);
  const [riskLoading, setRiskLoading] = useState(false);

  const [error, setError] = useState("");
  const [risk, setRisk] = useState(null);

  const [form, setForm] = useState({
    rainfall_24h: 0,
    rainfall_7d: 0,
    soil_moisture: 0,
    river_level: 1,
    slope: "moderate",
  });

  // ------------------------------------------------------------
  // LOAD WEATHER + AUTOMATICALLY CALCULATE RISK
  // ------------------------------------------------------------

  async function loadWeather(targetCity = city) {
    setLoading(true);
    setError("");

    try {
      // --------------------------------------------------------
      // 1. Get real weather data from Open-Meteo
      // --------------------------------------------------------

      const data = await api.get(
        `/weather?city=${encodeURIComponent(targetCity)}`
      );

      setWeather(data);

      // --------------------------------------------------------
      // 2. Get risk values from Open-Meteo
      // --------------------------------------------------------

      const updatedForm = {
        ...form,

        rainfall_24h:
          data.risk_inputs?.rainfall_24h ?? 0,

        rainfall_7d:
          data.risk_inputs?.rainfall_7d ?? 0,

        soil_moisture:
          data.risk_inputs?.soil_moisture ??
          form.soil_moisture ??
          0,
      };

      setForm(updatedForm);

      // --------------------------------------------------------
      // 3. Automatically calculate flood / monsoon risk
      // --------------------------------------------------------

      setRiskLoading(true);

      const riskResult = await api.post(
        "/risk/flood",
        {
          rainfall_24h: Number(
            updatedForm.rainfall_24h
          ),

          rainfall_7d: Number(
            updatedForm.rainfall_7d
          ),

          soil_moisture: Number(
            updatedForm.soil_moisture
          ),

          river_level: Number(
            updatedForm.river_level
          ),

          slope: updatedForm.slope,
        }
      );

      setRisk(riskResult);

    } catch (err) {
      console.error(
        "Weather/Risk error:",
        err
      );

      setError(
        err.message ||
          "Unable to load weather or risk data."
      );
    } finally {
      setLoading(false);
      setRiskLoading(false);
    }
  }

  // ------------------------------------------------------------
  // INITIAL WEATHER LOAD
  // ------------------------------------------------------------

  useEffect(() => {
    loadWeather();
  }, []);

  // ------------------------------------------------------------
  // MANUAL RISK RECALCULATION
  // ------------------------------------------------------------

  async function assess(e) {
    e.preventDefault();

    setRiskLoading(true);
    setError("");

    try {
      const result = await api.post(
        "/risk/flood",
        {
          ...form,

          rainfall_24h:
            Number(form.rainfall_24h),

          rainfall_7d:
            Number(form.rainfall_7d),

          soil_moisture:
            Number(form.soil_moisture),

          river_level:
            Number(form.river_level),

          slope: form.slope,
        }
      );

      setRisk(result);
    } catch (err) {
      console.error(
        "Risk calculation error:",
        err
      );

      setError(
        err.message ||
          "Unable to calculate flood risk."
      );
    } finally {
      setRiskLoading(false);
    }
  }

  // ------------------------------------------------------------
  // FORM FIELD UPDATE
  // ------------------------------------------------------------

  function updateField(key, value) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  // ------------------------------------------------------------
  // PAGE
  // ------------------------------------------------------------

  return (
    <>
      <PageHeader
        eyebrow="WEATHER INTELLIGENCE"
        title="Weather & Flood Risk"
        description="Monitor plantation weather and assess monsoon-related risk."
      />

      <div className="two-column">

        {/* ====================================================== */}
        {/* CURRENT WEATHER                                        */}
        {/* ====================================================== */}

        <Card
          title="Current Weather"
          icon={<CloudRain />}
        >

          {/* LOCATION */}
          <div
            className="form-grid"
            style={{
              gridTemplateColumns:
                "1fr auto",
              marginBottom: 16,
            }}
          >

            <label>
              Location

              <input
                value={city}
                onChange={(e) =>
                  setCity(e.target.value)
                }
                placeholder="City, State"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    loadWeather();
                  }
                }}
              />
            </label>

            <button
              type="button"
              className="primary-button"
              onClick={() =>
                loadWeather()
              }
              disabled={loading}
            >
              <RefreshCw size={15} />

              {loading
                ? "Loading..."
                : "Refresh"}
            </button>

          </div>

          {/* ERROR */}
          {error && (
            <p className="error-text">
              {error}
            </p>
          )}

          {weather && (
            <>
              {/* ================================================= */}
              {/* MAIN WEATHER DISPLAY                              */}
              {/* ================================================= */}

              <div className="weather-hero">

                <div className="weather-symbol">
                  🌦️
                </div>

                <div>

                  <strong>
                    {weather.current.temperature_c}°C
                  </strong>

                  <span>
                    {weather.current.condition}
                  </span>

                  <small>
                    <MapPin size={13} />

                    {weather.location}
                  </small>

                </div>

              </div>

              {/* ================================================= */}
              {/* WEATHER METRICS                                   */}
              {/* ================================================= */}

              <div className="mini-metrics">

                <Metric
                  label="Feels like"
                  value={`${weather.current.feels_like_c}°C`}
                  icon={
                    <Thermometer size={16} />
                  }
                />

                <Metric
                  label="Humidity"
                  value={`${weather.current.humidity}%`}
                  icon={
                    <Droplets size={16} />
                  }
                />

                <Metric
                  label="Rain probability"
                  value={`${weather.current.rain_probability}%`}
                  icon={
                    <CloudRain size={16} />
                  }
                />

                <Metric
                  label="Wind"
                  value={`${weather.current.wind_kmh} km/h`}
                  icon={
                    <Wind size={16} />
                  }
                />

                <Metric
                  label="UV Index"
                  value={weather.current.uv_index}
                  icon={
                    <Sun size={16} />
                  }
                />

              </div>

              {/* ================================================= */}
              {/* DATA SOURCE                                       */}
              {/* ================================================= */}

              <small>

                Data source:{" "}

                <strong>
                  Open-Meteo
                </strong>

                {" • "}

                Coordinates:{" "}

                {weather.coordinates.latitude.toFixed(
                  4
                )}

                ,{" "}

                {weather.coordinates.longitude.toFixed(
                  4
                )}

              </small>

              {/* ================================================= */}
              {/* HOURLY FORECAST                                   */}
              {/* ================================================= */}

              <h4
                style={{
                  marginTop: 22,
                  marginBottom: 10,
                }}
              >
                Next 12 Hours
              </h4>

              <div className="forecast-list">

                {weather.hourly?.map(
                  (hour) => (

                    <div
                      key={hour.time}
                    >

                      <span>
                        {hour.time
                          .split("T")[1]
                          ?.slice(0, 5)}
                      </span>

                      <b>
                        {hour.temperature_c}°
                      </b>

                      <small>
                        {hour.condition}
                        {" • "}
                        {hour.rain_probability}%
                        {" rain"}
                      </small>

                    </div>

                  )
                )}

              </div>

              {/* ================================================= */}
              {/* FIVE DAY FORECAST                                 */}
              {/* ================================================= */}

              <h4
                style={{
                  marginTop: 22,
                  marginBottom: 10,
                }}
              >
                5-Day Forecast
              </h4>

              <div className="forecast-list">

                {weather.forecast?.map(
                  (day) => (

                    <div
                      key={day.date}
                    >

                      <span>
                        {day.date}
                      </span>

                      <b>
                        {day.max_temperature_c}°
                      </b>

                      <small>
                        {day.min_temperature_c}
                        {" – "}
                        {day.max_temperature_c}
                        {" • "}
                        {day.condition}
                        {" • "}
                        {day.rainfall_mm} mm
                      </small>

                    </div>

                  )
                )}

              </div>

            </>
          )}

        </Card>


        {/* ====================================================== */}
        {/* FLOOD / MONSOON RISK                                  */}
        {/* ====================================================== */}

        <Card
          title="Flood / Monsoon Risk"
          icon={<ShieldAlert />}
        >

          <form
            className="form-grid"
            onSubmit={assess}
          >

            {/* ================================================= */}
            {/* RAINFALL 24H                                      */}
            {/* ================================================= */}

            <label>
              Rainfall 24h (mm)

              <input
                type="number"
                value={form.rainfall_24h}
                onChange={(e) =>
                  updateField(
                    "rainfall_24h",
                    e.target.value
                  )
                }
              />
            </label>


            {/* ================================================= */}
            {/* RAINFALL 7D                                       */}
            {/* ================================================= */}

            <label>
              Rainfall 7d (mm)

              <input
                type="number"
                value={form.rainfall_7d}
                onChange={(e) =>
                  updateField(
                    "rainfall_7d",
                    e.target.value
                  )
                }
              />
            </label>


            {/* ================================================= */}
            {/* SOIL MOISTURE                                     */}
            {/* ================================================= */}

            <label>
              Soil Moisture (%)

              <input
                type="number"
                value={form.soil_moisture}
                onChange={(e) =>
                  updateField(
                    "soil_moisture",
                    e.target.value
                  )
                }
              />
            </label>


            {/* ================================================= */}
            {/* RIVER LEVEL                                       */}
            {/* ================================================= */}

            <label>
              River Level

              <input
                type="number"
                value={form.river_level}
                onChange={(e) =>
                  updateField(
                    "river_level",
                    e.target.value
                  )
                }
              />
            </label>


            {/* ================================================= */}
            {/* SLOPE                                             */}
            {/* ================================================= */}

            <label>
              Slope

              <select
                value={form.slope}
                onChange={(e) =>
                  updateField(
                    "slope",
                    e.target.value
                  )
                }
              >

                <option value="flat">
                  Flat
                </option>

                <option value="moderate">
                  Moderate
                </option>

                <option value="steep">
                  Steep
                </option>

              </select>

            </label>


            {/* ================================================= */}
            {/* RECALCULATE BUTTON                                */}
            {/* ================================================= */}

            <button
              className="primary-button"
              type="submit"
              disabled={riskLoading}
            >

              {riskLoading
                ? "Calculating..."
                : "Recalculate Risk"}

            </button>

          </form>


          {/* ==================================================== */}
          {/* AUTOMATIC DATA NOTE                                 */}
          {/* ==================================================== */}

          <small
            style={{
              display: "block",
              marginTop: 10,
              opacity: 0.7,
            }}
          >
            Rainfall and soil-moisture values
            are automatically populated from
            Open-Meteo. River level and slope
            remain manual farm-risk inputs.
            Risk is automatically calculated
            whenever weather data is refreshed.
          </small>


          {/* ==================================================== */}
          {/* RISK RESULT                                         */}
          {/* ==================================================== */}

          {risk && (
            <div
              className={`risk-card ${risk.risk.toLowerCase()}`}
              style={{
                marginTop: 18,
                padding: 18,
              }}
            >

              {/* RISK LEVEL */}

              <Pill>
                {risk.risk} RISK
              </Pill>


              {/* SCORE */}

              <strong
                style={{
                  display: "block",
                  fontSize: 34,
                  marginTop: 8,
                }}
              >
                {risk.score}/100
              </strong>


              {/* DESCRIPTION */}

              <p
                style={{
                  marginTop: 4,
                  marginBottom: 16,
                }}
              >
                Current flood / monsoon risk
                assessment based on available
                weather and farm conditions.
              </p>


              {/* ================================================= */}
              {/* RISK FACTORS                                      */}
              {/* ================================================= */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3, 1fr)",
                  gap: 10,
                  marginBottom: 16,
                }}
              >

                <div>
                  <small>
                    Rainfall 24h
                  </small>

                  <strong
                    style={{
                      display: "block",
                      marginTop: 3,
                    }}
                  >
                    {form.rainfall_24h} mm
                  </strong>
                </div>


                <div>
                  <small>
                    Rainfall 7d
                  </small>

                  <strong
                    style={{
                      display: "block",
                      marginTop: 3,
                    }}
                  >
                    {form.rainfall_7d} mm
                  </strong>
                </div>


                <div>
                  <small>
                    Soil moisture
                  </small>

                  <strong
                    style={{
                      display: "block",
                      marginTop: 3,
                    }}
                  >
                    {form.soil_moisture}%
                  </strong>
                </div>

              </div>


              {/* ================================================= */}
              {/* RECOMMENDED ACTIONS                              */}
              {/* ================================================= */}

              <div>

                {risk.actions?.map(
                  (action, index) => (

                    <p key={index}>
                      • {action}
                    </p>

                  )
                )}

              </div>


              {/* MODEL */}

              <small>
                {risk.model}
              </small>

            </div>
          )}

        </Card>

      </div>
    </>
  );
}