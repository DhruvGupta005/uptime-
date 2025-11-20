"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/dashboard",
      });
      
      if (result?.error) {
        toast.error("Invalid email or password");
      } else if (result?.ok) {
        toast.success("Logged in successfully");
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
      console.error("[Login] Error:", error);
    } finally {
      setLoading(false);
    }
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



