"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { adminGet, adminDecide } from "@/lib/api";

export default function AdminReview() {
  const { id } = useParams<{id:string}>();
  const [rec, setRec] = useState<any>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => { adminGet(id).then(setRec); }, [id]);
  if (!rec) return <div className="p-6">Loading…</div>;

  async function decide(d: "approved"|"rejected") {
    setBusy(true);
    try { await adminDecide(id, d, d==="rejected"?note:undefined); router.push("/admin"); }
    finally { setBusy(false); }
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Review: {rec.full_name}</h1>
      <p className="text-gray-600">{rec.user_email} · NID: {rec.nid_number} · DOB: {rec.dob}</p>

      <div className="grid grid-cols-2 gap-4">
        <figure>
          <figcaption className="font-semibold mb-1">NID Photo</figcaption>
          <img src={rec.nid_url} className="w-full border rounded"/>
        </figure>
        <figure>
          <figcaption className="font-semibold mb-1">Live Selfie</figcaption>
          <img src={rec.face_url} className="w-full border rounded"/>
        </figure>
      </div>

      <div>
        <h2 className="font-semibold mb-1">Liveness Video</h2>
        <video src={rec.video_url} controls className="w-full border rounded"/>
      </div>

      <div className="bg-gray-50 p-4 rounded border">
        <p>Face match score: <b>{rec.face_match_score?.toFixed(4)}</b> (pass ≤ 0.40) →
           <b className={rec.face_match_passed?"text-green-600":"text-red-600"}>
           {rec.face_match_passed?" PASS":" FAIL"}</b></p>
        <p>Liveness score: <b>{rec.liveness_score?.toFixed(3)}</b> →
           <b className={rec.liveness_passed?"text-green-600":"text-red-600"}>
           {rec.liveness_passed?" PASS":" FAIL"}</b></p>
      </div>

      <textarea placeholder="Rejection reason (required if rejecting)…"
        value={note} onChange={e=>setNote(e.target.value)}
        className="w-full border p-2 rounded" rows={3}/>

      <div className="flex gap-3">
        <button disabled={busy} onClick={()=>decide("approved")}
          className="bg-green-600 text-white px-4 py-2 rounded">Approve</button>
        <button disabled={busy || !note} onClick={()=>decide("rejected")}
          className="bg-red-600 text-white px-4 py-2 rounded">Reject</button>
      </div>
    </main>
  );
}
