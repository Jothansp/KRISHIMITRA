import { useEffect, useState, type FormEvent } from "react";
import { UserRound, Save, Sprout } from "lucide-react";
import { api, errorMessage } from "../services/api";
import { PageHeader, Card, Loading, ErrorNote } from "../components/UI";
import type { Farm, Farmer } from "../types";

const profileFields = ["name", "phone", "email", "district", "location", "crops", "farm_size", "preferred_language"] as const;

export default function Profile() {
  const [profile, setProfile] = useState<Farmer | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get<Farmer>("/profile"), api.get<Farm>("/farm")])
      .then(([p, f]) => { setProfile(p); setFarm(f); })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  if (error && (!profile || !farm)) return <ErrorNote message={error} />;
  if (!profile || !farm) return <Loading />;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!profile || !farm) return;
    setError(""); setMessage("");
    try {
      await api.put("/profile", { ...profile, farm_size: Number(profile.farm_size) });
      await api.put("/farm", {
        crop: farm.crop, area: Number(farm.area),
        soil_moisture: Number(farm.soil_moisture), health_score: Number(farm.health_score),
      });
      setMessage("Profile and farm details saved.");
    } catch (err) { setError(errorMessage(err)); }
  }

  // Inputs hold text while typing; numeric fields are converted on save.
  const setFarmField = (key: keyof Farm, value: string) => setFarm({ ...farm, [key]: value } as unknown as Farm);

  return (
    <>
      <PageHeader eyebrow="FARMER PROFILE" title="My Farm"
        description="Maintain the farmer and plantation information used by KrishiMitra." />
      {message && <div className="success-box">✓ {message}</div>}
      <ErrorNote message={error} />
      <div className="two-column">
        <Card title="Farmer Details" icon={<UserRound />}>
          <form className="form-grid" onSubmit={save}>
            {profileFields.map((k) => (
              <label key={k}>{k.replaceAll("_", " ")}
                <input value={profile[k] ?? ""} onChange={(e) => setProfile({ ...profile, [k]: e.target.value } as unknown as Farmer)} />
              </label>
            ))}
            <button className="primary-button"><Save size={16} /> Save Changes</button>
          </form>
        </Card>
        <Card title="Plantation Details" icon={<Sprout />}>
          <div className="form-grid">
            <label>Primary crop<input value={farm.crop} onChange={(e) => setFarmField("crop", e.target.value)} /></label>
            <label>Area (acres)<input type="number" value={farm.area} onChange={(e) => setFarmField("area", e.target.value)} /></label>
            <label>Soil moisture (%)<input type="number" value={farm.soil_moisture} onChange={(e) => setFarmField("soil_moisture", e.target.value)} /></label>
            <label>Health score<input type="number" value={farm.health_score} onChange={(e) => setFarmField("health_score", e.target.value)} /></label>
            <p className="muted">These values feed the advisory and farm-risk modules.</p>
          </div>
        </Card>
      </div>
    </>
  );
}
