"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 15000);
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
        signal: controller.signal,
      });
      clearTimeout(t);
      if (res.ok) {
        toast.success("Account created. Please login.");
        router.push("/login");
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = data?.error ? (typeof data.error === "string" ? data.error : "Validation error") : `Failed (${res.status})`;
        toast.error(msg);
      }
    } catch (err: any) {
      toast.error(err?.name === "AbortError" ? "Request timed out" : "Network error");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="mx-auto mt-20 max-w-md">
      <h1 className="mb-6 text-2xl font-semibold">Register</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input className="rounded-md border px-3 py-2" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="rounded-md border px-3 py-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="rounded-md border px-3 py-2" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button disabled={loading} className="rounded-md bg-black px-4 py-2 text-white dark:bg-white dark:text-black">{loading ? "Loading..." : "Create Account"}</button>
      </form>
    </div>
  );
}


