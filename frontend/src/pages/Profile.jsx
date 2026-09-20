import React,{useEffect,useState} from "react";
import {UserRound, Save, Sprout} from "lucide-react";
import {api} from "../services/api";
import {PageHeader, Card} from "../components/UI";

export default function Profile() {
 const [profile,setProfile]=useState(null),[farm,setFarm]=useState(null),[message,setMessage]=useState("");
 useEffect(()=>{Promise.all([api.get("/profile"),api.get("/farm")]).then(([p,f])=>{setProfile(p);setFarm(f)})},[]);

 if(!profile||!farm) return <div className="loading">Loading profile...</div>;

 async function save(e){
   e.preventDefault();
   await api.put("/profile",profile);
   await api.put("/farm",{crop:farm.crop,area:+farm.area,soil_moisture:+farm.soil_moisture,health_score:+farm.health_score});
   setMessage("Profile and farm details saved.");
 }

 return <>
  <PageHeader eyebrow="FARMER PROFILE" title="My Farm" description="Maintain the farmer and plantation information used by KrishiMitra."/>
  {message&&<div className="success-box">✓ {message}</div>}
  <div className="two-column">
   <Card title="Farmer Details" icon={<UserRound/>}>
    <form className="form-grid" onSubmit={save}>
      {["name","phone","email","district","location","crops","farm_size","preferred_language"].map(k=>
       <label key={k}>{k.replaceAll("_"," ")}<input value={profile[k]??""} onChange={e=>setProfile({...profile,[k]:e.target.value})}/></label>
      )}
      <button className="primary-button"><Save size={16}/> Save Changes</button>
    </form>
   </Card>
   <Card title="Plantation Details" icon={<Sprout/>}>
    <div className="form-grid">
      <label>Primary crop<input value={farm.crop} onChange={e=>setFarm({...farm,crop:e.target.value})}/></label>
      <label>Area (acres)<input type="number" value={farm.area} onChange={e=>setFarm({...farm,area:e.target.value})}/></label>
      <label>Soil moisture (%)<input type="number" value={farm.soil_moisture} onChange={e=>setFarm({...farm,soil_moisture:e.target.value})}/></label>
      <label>Health score<input type="number" value={farm.health_score} onChange={e=>setFarm({...farm,health_score:e.target.value})}/></label>
      <p className="muted">These values feed the advisory and farm-risk modules.</p>
    </div>
   </Card>
  </div>
 </>;
}
