"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { adminList } from "@/lib/api";

export default function AdminQueue() {
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState("pending_admin");

  useEffect(() => { adminList(status).then(setItems); }, [status]);

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">KYC Review Queue</h1>
      <select value={status} onChange={e=>setStatus(e.target.value)} className="border p-2 mb-4">
        {["pending_admin","approved","rejected","auto_rejected"].map(s=>
          <option key={s} value={s}>{s}</option>)}
      </select>
      <table className="w-full border">
        <thead><tr className="bg-gray-100 text-left">
          <th className="p-2">User</th><th className="p-2">NID #</th>
          <th className="p-2">Face</th><th className="p-2">Liveness</th>
          <th className="p-2">Submitted</th><th className="p-2">Actions</th>
        </tr></thead>
        <tbody>
        {items.map(it => (
          <tr key={it.id} className="border-b">
            <td className="p-2">{it.user_email}</td>
            <td className="p-2">{it.nid_number}</td>
            <td className="p-2">
              <span className={it.face_match_passed?"text-green-600":"text-red-600"}>
                {it.face_match_passed?"PASS":"FAIL"}
              </span>
            </td>
            <td className="p-2">
              <span className={it.liveness_passed?"text-green-600":"text-red-600"}>
                {it.liveness_passed?"PASS":"FAIL"}
              </span>
            </td>
            <td className="p-2">{new Date(it.created_at).toLocaleString()}</td>
            <td className="p-2"><Link href={`/admin/${it.id}`} className="text-blue-600">Review</Link></td>
          </tr>
        ))}
        </tbody>
      </table>
    </main>
  );
}
