import React, {useState} from "react";
import {Sprout, Sparkles, Thermometer, Droplets} from "lucide-react";
import {api} from "../services/api";
import {PageHeader, Card, Pill} from "../components/UI";

const crops = ["pepper","rubber","cardamom","coffee","nutmeg"];
const stages = ["vegetative","flowering","fruiting","harvest"];

export default function Advisory() {
  const [form, setForm] = useState({
    crop:"pepper", growth_stage:"vegetative", rainfall_mm:20,
    temperature_c:28, soil_moisture:50, humidity:70
  });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const change = (key, value) => setForm({...form, [key]: value});

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try { setResult(await api.post("/advisory", {...form,
      rainfall_mm:+form.rainfall_mm, temperature_c:+form.temperature_c,
      soil_moisture:+form.soil_moisture, humidity:+form.humidity
    })); }
    finally { setBusy(false); }
  }

  return <>
    <PageHeader eyebrow="AI DECISION SUPPORT" title="Plantation Advisory"
      description="Get crop-specific recommendations based on field and weather conditions."/>

    <div className="two-column">
      <Card title="Farm Conditions" icon={<Sprout/>}>
        <form className="form-grid" onSubmit={submit}>
          <label>Crop
            <select value={form.crop} onChange={e=>change("crop",e.target.value)}>
              {crops.map(x=><option key={x}>{x}</option>)}
            </select>
          </label>
          <label>Growth stage
            <select value={form.growth_stage} onChange={e=>change("growth_stage",e.target.value)}>
              {stages.map(x=><option key={x}>{x}</option>)}
            </select>
          </label>
          <label>Rainfall (mm)<input type="number" value={form.rainfall_mm} onChange={e=>change("rainfall_mm",e.target.value)}/></label>
          <label>Temperature (°C)<input type="number" value={form.temperature_c} onChange={e=>change("temperature_c",e.target.value)}/></label>
          <label>Soil moisture (%)<input type="number" value={form.soil_moisture} onChange={e=>change("soil_moisture",e.target.value)}/></label>
          <label>Humidity (%)<input type="number" value={form.humidity} onChange={e=>change("humidity",e.target.value)}/></label>
          <button className="primary-button" disabled={busy}>{busy ? "Generating..." : <><Sparkles size={16}/> Generate Advisory</>}</button>
        </form>
      </Card>

      <Card title="AI Recommendations">
        {!result ? <div className="empty">Enter your conditions and generate an advisory.</div> :
          <div className="recommendations">
            <div className="model-note"><Sparkles size={16}/> {result.model}</div>
            {result.alerts.length === 0 ? <div className="success-box">No immediate condition alerts.</div> :
              result.alerts.map((x,i)=><div className="warning-box" key={i}>⚠️ {x}</div>)}
            {result.advice.map((x,i)=><div className="recommendation" key={i}><span>✓</span>{x}</div>)}
          </div>}
      </Card>
    </div>
  </>;
}
