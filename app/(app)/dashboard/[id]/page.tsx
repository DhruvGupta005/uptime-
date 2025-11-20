"use client";
import useSWR from "swr";
import { useRouter, useParams } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MonitorDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data, mutate } = useSWR(`/api/monitors/${id}`, fetcher);
  const router = useRouter();
  const [running, setRunning] = useState(false);

  async function onDelete() {
    const res = await fetch(`/api/monitors/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Monitor deleted");
      router.push("/dashboard");
    } else toast.error("Failed to delete");
  }

  if (!data) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{data.name}</h1>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">{data.url}</div>
        </div>
        <div className="flex gap-2">
          <button className="rounded-md border px-3 py-2" onClick={async () => {
            try {
              setRunning(true);
              await fetch(`/api/monitors/${id}/run`, { method: "POST" });
              await Promise.all([
                mutate(),
                // revalidate the checks and incidents SWR keys by triggering a refetch
                fetch(`/api/checks?monitorId=${id}&pageSize=10`).then(() => {}),
                fetch(`/api/incidents?pageSize=20`).then(() => {}),
              ]);
            } finally {
              setRunning(false);
            }
          }}>{running ? "Running..." : "Run check now"}</button>
          <button className="rounded-md border px-3 py-2" onClick={onDelete}>Delete</button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <section className="rounded-lg border p-4">
          <h2 className="mb-2 font-medium">Recent Checks</h2>
          <Checks monitorId={id} />
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="mb-2 font-medium">Incidents</h2>
          <Incidents monitorId={id} />
        </section>
      </div>
      <section className="rounded-lg border p-4">
        <h2 className="mb-4 font-medium">Uptime/Downtime History</h2>
        <UptimeHistoryTable monitorId={id} />
      </section>
      <section className="rounded-lg border p-4">
        <h2 className="mb-4 font-medium">Alert Configuration</h2>
        <AlertConfig monitorId={id} monitor={data} onUpdate={mutate} />
      </section>
      <section className="rounded-lg border p-4">
        <h2 className="mb-4 font-medium">Alert History</h2>
        <AlertHistory monitorId={id} />
      </section>
    </div>
  );
}

function Checks({ monitorId }: { monitorId: string }) {
  const { data } = useSWR<{ items: any[] }>(`/api/checks?monitorId=${monitorId}&pageSize=10`, fetcher);
  if (!data) return <div>Loading...</div>;
  return (
    <ul className="space-y-2 text-sm">
      {data.items.map((c) => (
        <li key={c.id} className="flex items-center justify-between rounded border px-3 py-2">
          <span>{new Date(c.createdAt).toLocaleString()}</span>
          <span>{c.ok ? "OK" : "DOWN"}</span>
          <span>{c.statusCode ?? "-"}</span>
          <span>{c.latencyMs ?? "-"} ms</span>
        </li>
      ))}
    </ul>
  );
}

function Incidents({ monitorId }: { monitorId: string }) {
  const { data } = useSWR<{ items: any[] }>(`/api/incidents?pageSize=20`, fetcher);
  if (!data) return <div>Loading...</div>;
  const items = data.items.filter((i) => i.monitorId === monitorId);
  return (
    <ul className="space-y-2 text-sm">
      {items.map((i) => (
        <li key={i.id} className="flex items-center justify-between rounded border px-3 py-2">
          <span>{new Date(i.startedAt).toLocaleString()}</span>
          <span>{i.resolvedAt ? "Resolved" : "Ongoing"}</span>
          <span className="truncate">{i.reason ?? "Unreachable"}</span>
        </li>
      ))}
    </ul>
  );
}

function UptimeHistoryTable({ monitorId }: { monitorId: string }) {
  const [filter, setFilter] = useState<"week" | "month">("week");
  const { data: checksData } = useSWR<{ items: any[] }>(`/api/checks?monitorId=${monitorId}&pageSize=1000`, fetcher);
  const { data: incidentsData } = useSWR<{ items: any[] }>(`/api/incidents?pageSize=1000`, fetcher);

  const historyData = useMemo(() => {
    if (!checksData || !incidentsData) return [];

    const now = new Date();
    const filterDate = new Date();
    if (filter === "week") {
      filterDate.setDate(now.getDate() - 7);
    } else {
      filterDate.setMonth(now.getMonth() - 1);
    }

    // Get incidents for this monitor within the filter period
    const incidents = incidentsData.items
      .filter((i) => i.monitorId === monitorId && new Date(i.startedAt) >= filterDate)
      .map((i) => ({
        type: "incident" as const,
        id: i.id,
        status: "down" as const,
        startTime: new Date(i.startedAt),
        endTime: i.resolvedAt ? new Date(i.resolvedAt) : null,
        reason: i.reason ?? "Service unreachable",
        duration: i.resolvedAt
          ? Math.round((new Date(i.resolvedAt).getTime() - new Date(i.startedAt).getTime()) / 1000 / 60)
          : null,
      }));

    // Get checks within the filter period and identify status changes
    const checks = checksData.items
      .filter((c) => new Date(c.createdAt) >= filterDate)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Build uptime periods between incidents
    const uptimePeriods: Array<{
      type: "uptime";
      id: string;
      status: "up";
      startTime: Date;
      endTime: Date | null;
      reason: string;
      duration: number | null;
    }> = [];

    let lastUptimeStart: Date | null = null;
    let lastCheckTime: Date | null = null;

    for (const check of checks) {
      const checkTime = new Date(check.createdAt);
      if (check.ok) {
        if (lastUptimeStart === null) {
          lastUptimeStart = checkTime;
        }
        lastCheckTime = checkTime;
      } else {
        if (lastUptimeStart && lastCheckTime) {
          uptimePeriods.push({
            type: "uptime",
            id: `uptime-${lastUptimeStart.getTime()}`,
            status: "up",
            startTime: lastUptimeStart,
            endTime: checkTime,
            reason: "Service operational",
            duration: Math.round((checkTime.getTime() - lastUptimeStart.getTime()) / 1000 / 60),
          });
        }
        lastUptimeStart = null;
        lastCheckTime = checkTime;
      }
    }

    // Add current uptime if service is up
    if (lastUptimeStart && lastCheckTime) {
      uptimePeriods.push({
        type: "uptime",
        id: `uptime-current-${lastUptimeStart.getTime()}`,
        status: "up",
        startTime: lastUptimeStart,
        endTime: null,
        reason: "Service operational",
        duration: Math.round((now.getTime() - lastUptimeStart.getTime()) / 1000 / 60),
      });
    }

    // Combine and sort all periods
    const allPeriods = [...incidents, ...uptimePeriods].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );

    return allPeriods;
  }, [checksData, incidentsData, monitorId, filter]);

  const formatDuration = (minutes: number | null) => {
    if (minutes === null) return "Ongoing";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return `${hours}h ${mins}m`;
    const days = Math.floor(hours / 24);
    const hrs = hours % 24;
    return `${days}d ${hrs}h`;
  };

  if (!checksData || !incidentsData) {
    return <div className="text-sm text-zinc-500">Loading history...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            className={`rounded-md border px-3 py-1 text-sm ${
              filter === "week"
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "bg-transparent"
            }`}
            onClick={() => setFilter("week")}
          >
            Last Week
          </button>
          <button
            className={`rounded-md border px-3 py-1 text-sm ${
              filter === "month"
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "bg-transparent"
            }`}
            onClick={() => setFilter("month")}
          >
            Last Month
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2 font-medium">Status</th>
              <th className="text-left p-2 font-medium">Start Time</th>
              <th className="text-left p-2 font-medium">End Time</th>
              <th className="text-left p-2 font-medium">Duration</th>
              <th className="text-left p-2 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody>
            {historyData.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-zinc-500">
                  No data available for the selected period
                </td>
              </tr>
            ) : (
              historyData.map((item) => (
                <tr key={item.id} className="border-b hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <td className="p-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                        item.status === "up"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${item.status === "up" ? "bg-green-500" : "bg-red-500"}`} />
                      {item.status === "up" ? "UP" : "DOWN"}
                    </span>
                  </td>
                  <td className="p-2">{item.startTime.toLocaleString()}</td>
                  <td className="p-2">{item.endTime ? item.endTime.toLocaleString() : "Ongoing"}</td>
                  <td className="p-2">{formatDuration(item.duration)}</td>
                  <td className="p-2">{item.reason}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {historyData.length > 0 && (
        <div className="text-xs text-zinc-500 mt-2">
          Showing {historyData.length} period(s) from the last {filter === "week" ? "7 days" : "30 days"}
        </div>
      )}
    </div>
  );
}

function AlertConfig({ monitorId, monitor, onUpdate }: { monitorId: string; monitor: any; onUpdate: () => void }) {
  const [webhookUrl, setWebhookUrl] = useState(monitor.webhookUrl || "");
  const [saving, setSaving] = useState(false);

  async function onSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/monitors/${monitorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: webhookUrl || null }),
      });
      if (res.ok) {
        toast.success("Webhook URL saved");
        onUpdate();
      } else {
        toast.error("Failed to save webhook URL");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        Configure a webhook URL to receive notifications when this monitor goes down or recovers.
        The webhook will receive a JSON payload with monitor details.
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">
            Webhook URL (optional)
          </label>
          <input
            type="url"
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="https://example.com/webhook"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
          <div className="mt-1 text-xs text-zinc-500">
            Leave empty to only log alerts in the database without sending webhooks.
          </div>
        </div>

        <button
          className="rounded-md bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Webhook URL"}
        </button>
      </div>
    </div>
  );
}

function AlertHistory({ monitorId }: { monitorId: string }) {
  const { data, mutate } = useSWR<{ items: any[] }>(`/api/monitors/${monitorId}/alerts?pageSize=50`, fetcher);
  
  useEffect(() => {
    const handleFocus = () => mutate();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [mutate]);

  if (!data) {
    return <div className="text-sm text-zinc-500">Loading alert history...</div>;
  }

  const alerts = data.items || [];

  if (alerts.length === 0) {
    return (
      <div className="text-sm text-zinc-500 text-center py-8">
        No alerts yet. Alerts will appear here when your monitor goes down or recovers.
      </div>
    );
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "down":
        return "Down Alert";
      case "recovery":
        return "Recovery Alert";
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "down":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "recovery":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
        View all alerts for this monitor. Alerts are automatically created when your monitor goes down or recovers.
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2 font-medium">Sent At</th>
              <th className="text-left p-2 font-medium">Type</th>
              <th className="text-left p-2 font-medium">Status</th>
              <th className="text-left p-2 font-medium">Message</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => (
              <tr key={alert.id} className="border-b hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <td className="p-2">{new Date(alert.sentAt).toLocaleString()}</td>
                <td className="p-2">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getTypeColor(alert.type)}`}
                  >
                    {getTypeLabel(alert.type)}
                  </span>
                </td>
                <td className="p-2">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      alert.status === "sent"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }`}
                  >
                    {alert.status === "sent" ? "✓ Sent" : "✗ Failed"}
                  </span>
                </td>
                <td className="p-2">
                  <div className="max-w-md">
                    <div className="font-medium">{alert.message || "No message"}</div>
                    {alert.error && (
                      <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Error: {alert.error}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {alerts.length > 0 && (
        <div className="text-xs text-zinc-500 mt-2">
          Showing {alerts.length} alert(s)
        </div>
      )}
    </div>
  );
}
