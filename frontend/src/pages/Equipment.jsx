import React,{useEffect,useState} from "react";
import {Tractor, MapPin, CalendarDays, IndianRupee} from "lucide-react";
import {api} from "../services/api";
import {PageHeader, Card, Pill, Empty} from "../components/UI";

export default function Equipment() {
 const [items,setItems]=useState([]),[days,setDays]=useState(1),[location,setLocation]=useState("Idukki"),[selected,setSelected]=useState(null),[rental,setRental]=useState(null);

 const load=()=>api.get(`/equipment?location=${encodeURIComponent(location)}&days=${days}`).then(setItems);
 useEffect(load,[]);

 async function rent() {
   if(!selected) return;
   const r=await api.post("/equipment/rent",{equipment_id:selected.id,farmer_name:"Demo Farmer",start_date:new Date().toISOString().slice(0,10),days:+days});
   setRental(r);
   load();
 }

 return <>
  <PageHeader eyebrow="RESOURCE SHARING" title="Equipment Rental"
   description="Find shared farm equipment and request a rental."/>
  <Card title="Search equipment" icon={<Tractor/>}>
   <div className="search-row">
    <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Location"/>
    <input type="number" min="1" value={days} onChange={e=>setDays(e.target.value)} placeholder="Days"/>
    <button className="primary-button" onClick={load}>Find Equipment</button>
   </div>
  </Card>

  {rental && <div className="success-box">✓ {rental.message}. Request ID: {rental.rental_id}</div>}

  <div className="cards-grid">
   {items.map(e=><Card key={e.id}>
    <div className="equipment-row">
      <div className="equipment-icon"><Tractor/></div>
      <div className="grow"><Pill>{e.category}</Pill><h2>{e.name}</h2><p><MapPin size={14}/> {e.location} • {e.owner}</p><small>{e.description}</small></div>
      <div className="equipment-price"><b>₹{e.daily_rate}</b><span>/day</span><button className="secondary-button" onClick={()=>setSelected(e)}>Rent</button></div>
    </div>
   </Card>)}
  </div>

  {selected && <div className="modal-backdrop" onClick={()=>setSelected(null)}>
    <div className="modal" onClick={e=>e.stopPropagation()}>
      <h2>Rent {selected.name}</h2>
      <p><CalendarDays size={15}/> {days} day(s)</p>
      <p><IndianRupee size={15}/> Estimated rental: ₹{selected.daily_rate*days + selected.deposit}</p>
      <div className="modal-actions"><button className="secondary-button" onClick={()=>setSelected(null)}>Cancel</button><button className="primary-button" onClick={rent}>Submit Request</button></div>
    </div>
  </div>}
 </>;
}
