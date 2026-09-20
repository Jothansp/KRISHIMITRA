import React,{useEffect,useState} from "react";
import {Newspaper} from "lucide-react";
import {api} from "../services/api";
import {PageHeader, Card, Pill, Empty} from "../components/UI";

export default function News() {
 const [items,setItems]=useState([]);
 useEffect(()=>{api.get("/news").then(setItems)},[]);
 return <>
  <PageHeader eyebrow="AGRICULTURAL INFORMATION" title="News & Alerts"
   description="Agricultural updates and plantation-related information."/>
  {items.length===0 ? <Empty/> :
   <div className="cards-grid">{items.map(n=><Card key={n.id}>
     <Pill>{n.category}</Pill><h2>{n.title}</h2><p>{n.summary}</p><small>{n.source} • {new Date(n.published_at).toLocaleDateString()}</small>
   </Card>)}</div>}
 </>;
}
