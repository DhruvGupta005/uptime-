"use client";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function IncidentsPage() {
  const { data } = useSWR<{ items: any[] }>("/api/incidents?pageSize=50", fetcher);
  const items = data?.items ?? [];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Incidents</h1>
      <ul className="space-y-2 text-sm">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between rounded border px-3 py-2">
            <span className="truncate">{i.monitor?.name}</span>
            <span>{new Date(i.startedAt).toLocaleString()}</span>
            <span>{i.resolvedAt ? "Resolved" : "Ongoing"}</span>
            <span className="truncate">{i.reason ?? "Unreachable"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}



