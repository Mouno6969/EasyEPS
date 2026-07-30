"use client";
import { useState, useRef } from "react";
import Webcam from "react-webcam";
import { getUploadUrls, putToS3, submitKyc } from "@/lib/api";

type Step = "form" | "nid" | "selfie" | "video" | "submitting" | "done";

export default function KycPage() {
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({ full_name: "", nid_number: "", dob: "" });
  const [nid, setNid] = useState<Blob | null>(null);
  const [selfie, setSelfie] = useState<Blob | null>(null);

  async function handleAll(nidBlob: Blob, selfieBlob: Blob, videoBlob: Blob) {
    setStep("submitting");
    try {
      const exts = { nid: "jpg", face: "jpg", video: "webm" };
      const urls = await getUploadUrls(exts);
      
      // For local storage, the upload_url will be a file path. We need to send the blob to the backend.
      await Promise.all([
        putToS3(urls.nid.upload_url, nidBlob),
        putToS3(urls.face.upload_url, selfieBlob),
        putToS3(urls.video.upload_url, videoBlob),
      ]);
      
      await submitKyc({
        nid_key: urls.nid.key, 
        face_key: urls.face.key, 
        video_key: urls.video.key,
        ...form,
      });
      setStep("done");
    } catch (e) {
      alert("Submission failed. Check console.");
      console.error(e);
      setStep("video");
    }
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Verify Your Identity</h1>

      {step === "form" && (
        <div className="space-y-3">
          {(["full_name","nid_number","dob"] as const).map(k => (
            <input key={k} placeholder={k.replace("_"," ")}
              value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})}
              className="w-full border p-2 rounded" />
          ))}
          <button className="bg-blue-600 text-white px-4 py-2 rounded"
                  onClick={() => setStep("nid")}>Continue</button>
        </div>
      )}

      {step === "nid" && (
        <div className="space-y-3">
          <p>Upload a clear photo of your National ID.</p>
          <input type="file" accept="image/*" capture="environment"
            onChange={e => { 
              if (e.target.files?.[0]) {
                setNid(e.target.files[0]); 
                setStep("selfie"); 
              }
            }}/>
        </div>
      )}

      {step === "selfie" && (
        <SelfieCapture onCapture={(b)=>{ setSelfie(b); setStep("video"); }} />
      )}

      {step === "video" && (
        <VideoRecorder 
          onRecorded={(b)=>{
            if (nid && selfie) {
              handleAll(nid, selfie, b); 
            } else {
              alert("Missing NID or Selfie. Please restart.");
              setStep("form");
            }
          }}
        />
      )}

      {step === "submitting" && <p>Uploading & analyzing…</p>}
      {step === "done" && (
        <div>
          <h2 className="text-xl font-semibold text-green-600">Submitted!</h2>
          <p>Your KYC is under review. You&apos;ll be notified by email.</p>
        </div>
      )}
    </main>
  );
}

function SelfieCapture({onCapture}:{onCapture:(b:Blob)=>void}) {
  const ref = useRef<Webcam>(null);
  
  const capture = async () => {
    const screenshot = ref.current?.getScreenshot();
    if (screenshot) {
      const blob = await fetch(screenshot).then(r => r.blob());
      onCapture(blob);
    }
  };

  return (
    <div className="space-y-3">
      <Webcam ref={ref} screenshotFormat="image/jpeg" className="rounded w-full"/>
      <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={capture}>
        Capture Selfie
      </button>
    </div>
  );
}

function VideoRecorder({onRecorded}:{onRecorded:(b:Blob)=>void}) {
  const camRef = useRef<Webcam>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  function start() {
    const stream = camRef.current?.stream as MediaStream | undefined;
    if (!stream) return alert("Camera not ready");

    recRef.current = new MediaRecorder(stream, { mimeType: "video/webm" });
    chunks.current = [];
    
    recRef.current.ondataavailable = e => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };
    
    recRef.current.onstop = () => {
      onRecorded(new Blob(chunks.current, {type:"video/webm"}));
    };
    
    recRef.current.start();
    setTimeout(() => recRef.current?.stop(), 7000); 
  }

  return (
    <div className="space-y-3">
      <p>Look at the camera and <b>blink twice</b>. Recording is 7 seconds.</p>
      <Webcam ref={camRef} audio muted className="rounded w-full"/>
      <button className="bg-red-600 text-white px-4 py-2 rounded" onClick={start}>
        Record 7s
      </button>
    </div>
  );
}
