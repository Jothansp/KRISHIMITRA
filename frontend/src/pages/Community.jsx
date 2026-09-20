import React,{useEffect,useState} from "react";
import {Users, Search, Send, Heart} from "lucide-react";
import {api} from "../services/api";
import {PageHeader, Card, Empty} from "../components/UI";

export default function Community() {
 const [query,setQuery]=useState(""),[posts,setPosts]=useState([]),[form,setForm]=useState({author:"Demo Farmer",title:"",body:"",tags:""});

 const load=()=>api.get(`/community?q=${encodeURIComponent(query)}`).then(setPosts);
 useEffect(load,[]);

 async function submit(e) {
   e.preventDefault();
   if(!form.title||!form.body) return;
   await api.post("/community",form);
   setForm({...form,title:"",body:"",tags:""});
   load();
 }

 async function like(id) {
   await api.post(`/community/${id}/like`,{});
   load();
 }

 return <>
  <PageHeader eyebrow="FARMER COLLABORATION" title="Community Forum"
   description="Ask questions, share practical knowledge and search farmer discussions."/>
  <div className="search-row community-search"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search pepper, drainage, equipment..."/><button className="primary-button" onClick={load}><Search/> Search</button></div>

  <div className="two-column">
   <Card title="Start a discussion" icon={<Users/>}>
    <form className="form-grid" onSubmit={submit}>
      <input placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
      <textarea placeholder="Write your question or experience..." value={form.body} onChange={e=>setForm({...form,body:e.target.value})}/>
      <input placeholder="Tags: pepper,monsoon" value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})}/>
      <button className="primary-button"><Send size={16}/> Post</button>
    </form>
   </Card>

   <div>
    {posts.length===0 ? <Empty>No discussions found.</Empty> : posts.map(p=>
      <Card key={p.id}>
       <div className="post-author"><div className="avatar-small">{p.author?.[0]||"F"}</div><div><b>{p.author}</b><small>{p.score ? ` • relevance ${p.score}`:""}</small></div></div>
       <h2>{p.title}</h2><p>{p.body}</p><div className="tag-list">{p.tags?.split(",").filter(Boolean).map(t=><span key={t}>#{t.trim()}</span>)}</div>
       <button className="like-button" onClick={()=>like(p.id)}><Heart size={15}/> {p.likes}</button>
      </Card>
    )}
   </div>
  </div>
 </>;
}
