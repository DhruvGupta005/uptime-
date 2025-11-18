"use client";
import useSWR from "swr";
import Link from "next/link";
import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DashboardPage() {
  const { data } = useSWR<{ items: any[] }>("/api/monitors", fetcher);
  const monitors = data?.items ?? [];
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link className="rounded-md bg-black px-3 py-2 text-white dark:bg-white dark:text-black" href="/dashboard/new">Add Monitor</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {monitors.map((m) => (
          <MonitorCard key={m.id} monitor={m} />
        ))}
      </div>
    </div>
  );
}

function MonitorCard({ monitor }: { monitor: any }) {
  const { data: checksData } = useSWR<{ items: any[] }>(`/api/checks?monitorId=${monitor.id}&pageSize=1`, fetcher);
  const latestCheck = checksData?.items?.[0];
  const status = latestCheck?.ok ? "up" : latestCheck ? "down" : "unknown";
  const statusColor = status === "up" ? "bg-green-500" : status === "down" ? "bg-red-500" : "bg-gray-500";

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${statusColor}`} />
            <div className="font-medium">{monitor.name}</div>
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate">{monitor.url}</div>
          {latestCheck && (
            <div className="mt-1 text-xs text-zinc-500">
              Last checked: {new Date(latestCheck.createdAt).toLocaleString()}
            </div>
          )}
        </div>
        <Link className="text-sm underline whitespace-nowrap ml-2" href={`/dashboard/${monitor.id}`}>Manage</Link>
      </div>
      <LatencyChart monitorId={monitor.id} />
      <div className="mt-2 text-xs text-zinc-500 space-y-1">
        <div><strong>X-axis:</strong> Time - Shows when each check was performed (HH:MM format)</div>
        <div><strong>Y-axis:</strong> Latency (ms) - Response time in milliseconds (lower is faster)</div>
      </div>
    </div>
  );
}

function LatencyChart({ monitorId }: { monitorId: string }) {
  const { data } = useSWR<{ items: any[] }>(`/api/checks?monitorId=${monitorId}&pageSize=20`, fetcher);
  const chartData = useMemo(() => {
    const items = data?.items ?? [];
    return items
      .map((c) => ({
        time: new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        latency: c.latencyMs ?? 0,
        timestamp: new Date(c.createdAt).getTime(),
      }))
      .sort((a, b) => a.timestamp - b.timestamp); // Sort by time
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="h-28 w-full flex items-center justify-center text-xs text-zinc-500">
        No data yet
      </div>
    );
  }

  return (
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ left: 5, right: 5, top: 5, bottom: 20 }}>
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: 'currentColor' }}
            interval="preserveStartEnd"
            label={{ value: 'Time', position: 'insideBottom', offset: -5, style: { fontSize: 10 } }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'currentColor' }}
            domain={[0, (dataMax: number) => Math.max(dataMax * 1.2, 100)]}
            label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
            width={50}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white dark:bg-zinc-800 border rounded p-2 shadow-lg">
                    <p className="text-xs font-medium">{payload[0].payload.time}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      {payload[0].value} ms
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="latency"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}



