import { useEffect, useState, type ChangeEvent } from "react";
import { PawPrint, UploadCloud, Camera, BellRing } from "lucide-react";
import { api, errorMessage } from "../services/api";
import { PageHeader, Card, Pill, ErrorNote } from "../components/UI";
import type { WildlifeResult } from "../types";

export default function Wildlife() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState<WildlifeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Release the object URL when the image changes or the page unmounts.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function choose(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f); setResult(null);
    setPreview(f ? URL.createObjectURL(f) : "");
  }

  async function analyze() {
    if (!file) return;
    setBusy(true); setError("");
    try { setResult(await api.upload<WildlifeResult>("/wildlife/detect", file)); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader eyebrow="SMART MONITORING & PROTECTION" title="Wildlife Detection"
        description="Analyze plantation images through the YOLOv8 wildlife detection pipeline." />
      <div className="two-column">
        <Card title="Camera / Image Input" icon={<Camera />}>
          <div className="upload-zone">
            {preview
              ? <img src={preview} className="image-preview" alt="Selected plantation upload" />
              : <><UploadCloud size={42} /><b>Upload a plantation image</b><span>JPG, PNG or JPEG</span></>}
            <input type="file" accept="image/*" onChange={choose} />
            <button className="primary-button" disabled={!file || busy} onClick={analyze}>
              {busy ? "Analyzing..." : "Analyze with YOLOv8"}
            </button>
          </div>
        </Card>

        <Card title="Detection Results" icon={<PawPrint />}>
          <ErrorNote message={error} />
          {!result ? <div className="empty">Upload an image to see detection results.</div> : (
            <div className="detection-result">
              <Pill>{result.mode}</Pill>
              <h3>{result.message}</h3>
              {result.detections?.length
                ? result.detections.map((d, i) => (
                  <div className="detection" key={i}><b>{d.class}</b><span>{Math.round(d.confidence * 100)}% confidence</span></div>
                ))
                : <div className="success-box"><BellRing /> No animal detections were returned for this image.</div>}
            </div>
          )}
        </Card>
      </div>

      <div className="feature-row">
        <div><Camera /><b>CCTV / IP Camera</b><span>Use camera frames as model input.</span></div>
        <div><PawPrint /><b>YOLOv8</b><span>Object-detection integration.</span></div>
        <div><BellRing /><b>Farmer Alerts</b><span>Connect detections to notifications.</span></div>
      </div>
    </>
  );
}
