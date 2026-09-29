import { useState, type FormEvent } from "react";
import { Sprout, Sparkles } from "lucide-react";
import { api, errorMessage } from "../services/api";
import { PageHeader, Card, ErrorNote } from "../components/UI";
import type { AdvisoryRequest, AdvisoryResult } from "../types";

const crops = ["pepper", "rubber", "cardamom", "coffee", "nutmeg"];
const stages = ["vegetative", "flowering", "fruiting", "harvest"];

// Number inputs are held as strings while typing, then converted on submit.
type Form = { crop: string; growth_stage: string; rainfall_mm: string; temperature_c: string; soil_moisture: string; humidity: string };
const numberFields: [keyof Form, string][] = [
  ["rainfall_mm", "Rainfall (mm)"], ["temperature_c", "Temperature (°C)"],
  ["soil_moisture", "Soil moisture (%)"], ["humidity", "Humidity (%)"],
];

export default function Advisory() {
  const [form, setForm] = useState<Form>({
    crop: "pepper", growth_stage: "vegetative", rainfall_mm: "20",
    temperature_c: "28", soil_moisture: "50", humidity: "70",
  });
  const [result, setResult] = useState<AdvisoryResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const change = (key: keyof Form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const body: AdvisoryRequest = {
      crop: form.crop, growth_stage: form.growth_stage,
      rainfall_mm: Number(form.rainfall_mm), temperature_c: Number(form.temperature_c),
      soil_moisture: Number(form.soil_moisture), humidity: Number(form.humidity),
    };
    try { setResult(await api.post<AdvisoryResult>("/advisory", body)); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader eyebrow="AI DECISION SUPPORT" title="Plantation Advisory"
        description="Get crop-specific recommendations based on field and weather conditions." />

      <div className="two-column">
        <Card title="Farm Conditions" icon={<Sprout />}>
          <form className="form-grid" onSubmit={submit}>
            <label>Crop
              <select value={form.crop} onChange={(e) => change("crop", e.target.value)}>
                {crops.map((x) => <option key={x}>{x}</option>)}
              </select>
            </label>
            <label>Growth stage
              <select value={form.growth_stage} onChange={(e) => change("growth_stage", e.target.value)}>
                {stages.map((x) => <option key={x}>{x}</option>)}
              </select>
            </label>
            {numberFields.map(([key, label]) => (
              <label key={key}>{label}
                <input type="number" value={form[key]} onChange={(e) => change(key, e.target.value)} />
              </label>
            ))}
            <button className="primary-button" disabled={busy}>
              {busy ? "Generating..." : <><Sparkles size={16} /> Generate Advisory</>}
            </button>
          </form>
        </Card>

        <Card title="AI Recommendations">
          <ErrorNote message={error} />
          {!result ? <div className="empty">Enter your conditions and generate an advisory.</div> : (
            <div className="recommendations">
              <div className="model-note"><Sparkles size={16} /> {result.model}</div>
              {result.alerts.length === 0
                ? <div className="success-box">No immediate condition alerts.</div>
                : result.alerts.map((x, i) => <div className="warning-box" key={i}>⚠️ {x}</div>)}
              {result.advice.map((x, i) => <div className="recommendation" key={i}><span>✓</span>{x}</div>)}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
