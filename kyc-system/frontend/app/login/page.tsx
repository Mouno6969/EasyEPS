"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    try {
      await login(email, pw);
      router.push("/admin");
    } catch (e) {
      alert("Login failed");
    }
  };

  return (
    <main className="max-w-md mx-auto p-8 space-y-4">
      <h1 className="text-2xl font-bold">Admin Login</h1>
      <input className="w-full border p-2 rounded" placeholder="Email" 
             value={email} onChange={e => setEmail(e.target.value)} />
      <input className="w-full border p-2 rounded" type="password" placeholder="Password" 
             value={pw} onChange={e => setPw(e.target.value)} />
      <button className="w-full bg-blue-600 text-white p-2 rounded" onClick={handleLogin}>
        Login
      </button>
    </main>
  );
}
