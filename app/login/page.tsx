"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn("credentials", { email, password, callbackUrl: "/dashboard" });
    setLoading(false);
  }
  return (
    <div className="mx-auto mt-20 max-w-md">
      <h1 className="mb-6 text-2xl font-semibold">Login</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input className="rounded-md border px-3 py-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="rounded-md border px-3 py-2" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button disabled={loading} className="rounded-md bg-black px-4 py-2 text-white dark:bg-white dark:text-black">{loading ? "Loading..." : "Login"}</button>
      </form>
      <p className="mt-3 text-sm text-zinc-600">No account? <Link className="underline" href="/register">Register</Link></p>
    </div>
  );
}



