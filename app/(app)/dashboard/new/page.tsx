"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function NewMonitorPage() {
  const [form, setForm] = useState({ name: "", url: "", method: "GET", intervalSec: 60, timeoutMs: 10000 });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Basic validation
    if (!form.name.trim()) {
      toast.error("Please enter a monitor name");
      return;
    }
    if (!form.url.trim()) {
      toast.error("Please enter a URL");
      return;
    }
    if (!form.url.startsWith("http://") && !form.url.startsWith("https://")) {
      toast.error("URL must start with http:// or https://");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      
      if (res.ok) {
        toast.success("Monitor created successfully!");
        router.push("/dashboard");
      } else {
        const data = await res.json().catch(() => ({}));
        const errorMsg = data.error
          ? typeof data.error === "string"
            ? data.error
            : JSON.stringify(data.error)
          : `Failed to create monitor (${res.status})`;
        toast.error(errorMsg);
      }
    } catch (error: any) {
      toast.error(error?.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-2xl font-semibold">Add Monitor</h1>
      <form onSubmit={onSubmit} className="grid gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Monitor Name *</label>
          <input
            required
            className="w-full rounded-md border px-3 py-2"
            placeholder="My Website"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">URL *</label>
          <input
            required
            className="w-full rounded-md border px-3 py-2"
            placeholder="https://example.com"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
          <div className="mt-1 text-xs text-zinc-500">Must start with http:// or https://</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Method</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
            >
              {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Interval (seconds)</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              type="number"
              min={15}
              max={3600}
              placeholder="60"
              value={form.intervalSec}
              onChange={(e) => setForm({ ...form, intervalSec: Number(e.target.value) || 60 })}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Timeout (milliseconds)</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            type="number"
            min={1000}
            max={60000}
            placeholder="10000"
            value={form.timeoutMs}
            onChange={(e) => setForm({ ...form, timeoutMs: Number(e.target.value) || 10000 })}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-black px-4 py-2 text-white dark:bg-white dark:text-black disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Monitor"}
        </button>
      </form>
    </div>
  );
}



