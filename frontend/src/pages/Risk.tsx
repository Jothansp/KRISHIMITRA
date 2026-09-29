import { useEffect, useState } from "react";
import { ShieldAlert, CheckCircle2 } from "lucide-react";
import { api, errorMessage } from "../services/api";
import { PageHeader, Card, Pill, Loading, ErrorNote } from "../components/UI";
import type { FarmRisk } from "../types";

export default function Risk() {
  const [risk, setRisk] = useState<FarmRisk | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<FarmRisk>("/risk/farm").then(setRisk).catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <ErrorNote message={error} />;
  if (!risk) return <Loading />;

  return (
    <>
      <PageHeader eyebrow="FARM PROTECTION" title="Farm Risk Management"
        description="A combined view of plantation-health and field-condition risk factors." />
      <div className="risk-overview">
        <Card>
          <div className="risk-score">
            <div className={`big-score ${risk.overall.toLowerCase()}`}>{risk.score}</div>
            <div><Pill>{risk.overall} OVERALL RISK</Pill><h2>Farm risk score</h2><p>{risk.recommendation}</p></div>
          </div>
        </Card>
      </div>
      <div className="two-column">
        <Card title="Risk Factors" icon={<ShieldAlert />}>
          {risk.factors.length === 0
            ? <div className="success-box"><CheckCircle2 /> No elevated factors in the current demo profile.</div>
            : risk.factors.map((x, i) => (
              <div className="factor" key={i}>
                <span>{x.severity === "high" ? "🔴" : "🟠"}</span><b>{x.name}</b><Pill>{x.severity}</Pill>
              </div>
            ))}
        </Card>
        <Card title="Recommended Actions">
          <div className="recommendation"><span>1</span>Inspect drainage and vulnerable field areas after significant rainfall.</div>
          <div className="recommendation"><span>2</span>Monitor soil moisture and visible crop symptoms.</div>
          <div className="recommendation"><span>3</span>Use Weather & Risk for current rainfall-based assessment.</div>
          <div className="recommendation"><span>4</span>Use Wildlife Detection for boundary monitoring.</div>
        </Card>
      </div>
    </>
  );
}
