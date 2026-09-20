import React,{useState} from "react";
import {Landmark, Search, ExternalLink} from "lucide-react";
import {api} from "../services/api";
import {PageHeader, Card, Pill, Empty} from "../components/UI";

export default function Schemes() {
 const [crops,setCrops]=useState("pepper,cardamom"),[needs,setNeeds]=useState("horticulture"),[items,setItems]=useState([]);
 const search=()=>api.get(`/schemes?crops=${encodeURIComponent(crops)}&needs=${encodeURIComponent(needs)}&district=Idukki`).then(setItems);

 return <>
  <PageHeader eyebrow="FARMER SUPPORT" title="Government Schemes"
   description="Discover schemes using farmer needs, crops and location."/>
  <Card title="Find relevant schemes" icon={<Landmark/>}>
   <div className="search-row">
    <input value={crops} onChange={e=>setCrops(e.target.value)} placeholder="Crops: pepper, cardamom"/>
    <input value={needs} onChange={e=>setNeeds(e.target.value)} placeholder="Need: credit, soil, horticulture"/>
    <button className="primary-button" onClick={search}><Search size={16}/> Search</button>
   </div>
  </Card>
  {items.length===0 ? <Empty>Search to get personalized scheme recommendations.</Empty> :
   <div className="cards-grid">{items.map(s=>
    <Card key={s.id}>
     <div className="scheme-top"><Pill>{Math.round(s.score*100)}% match</Pill><ExternalLink size={16}/></div>
     <h2>{s.name}</h2><p>{s.description}</p>
     <h4>Eligibility</h4><p>{s.eligibility}</p>
    </Card>)}</div>}
 </>;
}
