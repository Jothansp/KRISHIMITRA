import React, {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {CloudRain, ShieldCheck, PawPrint, FileText, ArrowRight, Leaf, Droplets, AlertTriangle} from "lucide-react";
import {api} from "../services/api";
import {PageHeader, Card, Metric, Loading, Pill} from "../components/UI";

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard").then(setData).catch(console.error);
  }, []);

  if (!data) return <Loading/>;

  const metrics = [
    ["Weather", data.stats.weather, "Current condition", <CloudRain/>],
    ["Flood Risk", data.stats.flood_risk, "Monsoon assessment", <ShieldCheck/>],
    ["Wildlife", data.stats.wildlife, "Latest monitoring", <PawPrint/>],
    ["Schemes", data.stats.schemes, "Available matches", <FileText/>]
  ];

  return (
    <>
      <PageHeader
        eyebrow="SMART PLANTATION MANAGEMENT"
        title={`Hello, ${data.farmer.name}! 👋`}
        description={`${data.farmer.location} • ${data.farmer.farm_size} acres registered`}
        action={<Link className="icon-button" to="/alerts"><AlertTriangle size={18}/>{data.stats.unread_alerts}</Link>}
      />

      <section className="hero">
        <div>
          <Pill>KRISHIMITRA AI</Pill>
          <h2>Healthy plantations.<br/>Safer farms. Better decisions.</h2>
          <p>AI-powered plantation intelligence, risk management and farmer services in one place.</p>
          <Link className="primary-button light" to="/advisory">Get today's advisory <ArrowRight size={16}/></Link>
        </div>
        <div className="hero-plant">🌿</div>
      </section>

      <div className="metrics">
        {metrics.map(([label,value,sub,icon]) =>
          <Metric key={label} label={label} value={value} sub={sub} icon={icon}/>
        )}
      </div>

      <div className="dashboard-grid">
        <Card title="Plantation Health" icon={<Leaf size={18}/>}>
          <div className="health-panel">
            <div className="health-ring"><span>{data.farm.health_score}%</span></div>
            <div>
              <h3>{data.farm.health_score >= 70 ? "Good condition" : "Needs attention"}</h3>
              <p>Crop: <b>{data.farm.crop}</b> • Soil moisture: <b>{data.farm.soil_moisture}%</b></p>
              <Link to="/risk">View farm risk →</Link>
            </div>
          </div>
        </Card>

        <Card title="Quick Actions">
          <div className="quick-actions">
            <Link to="/weather">🌦️ Weather & Flood Risk</Link>
            <Link to="/wildlife">🐘 Check Wildlife</Link>
            <Link to="/schemes">📋 Find Schemes</Link>
            <Link to="/equipment">🚜 Rent Equipment</Link>
            <Link to="/community">👨‍🌾 Ask Farmers</Link>
            <Link to="/news">📰 Latest Updates</Link>
          </div>
        </Card>
      </div>

      <Card title="Latest Updates">
        <div className="feed">
          {data.news.map(item => (
            <div className="feed-row" key={item.id}>
              <Pill>{item.category}</Pill>
              <div><b>{item.title}</b><p>{item.summary}</p></div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
