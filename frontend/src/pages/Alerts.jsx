import React,{useEffect,useState} from "react";
import {Bell, CheckCheck, AlertTriangle} from "lucide-react";
import {api} from "../services/api";
import {PageHeader, Card, Pill, Empty} from "../components/UI";

export default function Alerts() {
 const [items,setItems]=useState([]);
 const load=()=>api.get("/alerts").then(setItems);
 useEffect(load,[]);
 async function read(id){await api.post(`/alerts/${id}/read`,{});load()}
 async function readAll(){await api.post("/alerts/read-all",{});load()}
 return <>
  <PageHeader eyebrow="NOTIFICATION CENTER" title="Alerts"
   description="Weather, wildlife, scheme and farm-risk notifications."
   action={<button className="secondary-button" onClick={readAll}><CheckCheck size={16}/> Mark all read</button>}/>
  {items.length===0?<Empty/>:items.map(a=><Card key={a.id}>
   <div className="alert-row"><div className={`alert-icon ${a.severity}`}><AlertTriangle size={18}/></div><div className="grow"><div className="alert-head"><Pill>{a.type}</Pill>{!a.read&&<b>NEW</b>}</div><h2>{a.title}</h2><p>{a.message}</p><small>{new Date(a.created_at).toLocaleString()}</small></div>{!a.read&&<button className="secondary-button" onClick={()=>read(a.id)}>Mark read</button>}</div>
  </Card>)}
 </>;
}
