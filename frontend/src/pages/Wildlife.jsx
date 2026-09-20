import React,{useState} from "react";
import {PawPrint, UploadCloud, Camera, BellRing} from "lucide-react";
import {api} from "../services/api";
import {PageHeader, Card, Pill} from "../components/UI";

export default function Wildlife() {
 const [file,setFile]=useState(null),[preview,setPreview]=useState(""),[result,setResult]=useState(null),[busy,setBusy]=useState(false);

 function choose(e) {
   const f=e.target.files?.[0];
   setFile(f||null);
   if(f) setPreview(URL.createObjectURL(f));
 }

 async function analyze() {
   if(!file) return;
   setBusy(true);
   try { setResult(await api.upload("/wildlife/detect",file)); }
   finally { setBusy(false); }
 }

 return <>
  <PageHeader eyebrow="SMART MONITORING & PROTECTION" title="Wildlife Detection"
   description="Analyze plantation images through the YOLOv8 wildlife detection pipeline."/>

  <div className="two-column">
   <Card title="Camera / Image Input" icon={<Camera/>}>
    <div className="upload-zone">
      {preview ? <img src={preview} className="image-preview"/> : <><UploadCloud size={42}/><b>Upload a plantation image</b><span>JPG, PNG or JPEG</span></>}
      <input type="file" accept="image/*" onChange={choose}/>
      <button className="primary-button" disabled={!file||busy} onClick={analyze}>{busy?"Analyzing...":"Analyze with YOLOv8"}</button>
    </div>
   </Card>

   <Card title="Detection Results" icon={<PawPrint/>}>
     {!result ? <div className="empty">Upload an image to see detection results.</div> :
       <div className="detection-result">
         <Pill>{result.mode}</Pill>
         <h3>{result.message}</h3>
         {result.detections?.length ? result.detections.map((d,i)=>
           <div className="detection" key={i}><b>{d.class}</b><span>{Math.round(d.confidence*100)}% confidence</span></div>
         ) : <div className="success-box"><BellRing/> No animal detections were returned for this image.</div>}
       </div>}
   </Card>
  </div>

  <div className="feature-row">
   <div><Camera/><b>CCTV / IP Camera</b><span>Use camera frames as model input.</span></div>
   <div><PawPrint/><b>YOLOv8</b><span>Object-detection integration.</span></div>
   <div><BellRing/><b>Farmer Alerts</b><span>Connect detections to notifications.</span></div>
  </div>
 </>;
}
