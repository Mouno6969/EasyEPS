const API = process.env.NEXT_PUBLIC_API_URL!;

export const setToken = (t: string | null) =>
  t ? localStorage.setItem("k", t) : localStorage.removeItem("k");
  
const hdr = () => ({ 
  Authorization: `Bearer ${localStorage.getItem("k")}`,
  "Content-Type": "application/json" 
});

export async function login(email: string, password: string) {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);
  const r = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form
  });
  if (!r.ok) throw new Error("Login failed");
  const data = await r.json();
  setToken(data.access_token);
  return data;
}

export async function getUploadUrls(exts: {nid:string;face:string;video:string}) {
  const r = await fetch(`${API}/kyc/upload-urls`, {
    method: "POST", headers: hdr(), body: JSON.stringify(exts) });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{nid:{key:string;upload_url:string};
                              face:{key:string;upload_url:string};
                              video:{key:string;upload_url:string}}>;
}

export async function putToS3(url: string, blob: Blob) {
  // For local file system, the 'upload_url' will be a file path.
  // We need to send the blob to the backend to save it.
  const r = await fetch(`${API}/upload-file`, {
    method: "POST",
    headers: { 'Content-Type': 'application/octet-stream', 'X-File-Key': url.replace('file://', '') },
    body: blob
  });
  if (!r.ok) throw new Error("Local file upload failed");
}

export async function submitKyc(p: {nid_key:string;face_key:string;video_key:string;
                                    full_name:string;nid_number:string;dob:string}) {
  const r = await fetch(`${API}/kyc/submit`, {
    method: "POST", headers: hdr(), body: JSON.stringify(p) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function adminList(status = "pending_admin") {
  const r = await fetch(`${API}/admin/kyc?status=${status}`, { headers: hdr() });
  return r.json();
}

export async function adminGet(id: string) {
  const r = await fetch(`${API}/admin/kyc/${id}`, { headers: hdr() });
  return r.json();
}

export async function adminDecide(id: string, decision: "approved"|"rejected", note?: string) {
  const r = await fetch(`${API}/admin/kyc/${id}/decision`, {
    method: "POST", headers: hdr(), body: JSON.stringify({ decision, note }) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
