import axios from "axios";
import { prisma } from "@/src/server/db";

export async function runCheckForMonitor(monitorId: string) {
  try {
    const monitor = await prisma.monitor.findUnique({ where: { id: monitorId } });
    if (!monitor || monitor.isPaused) {
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), monitor.timeoutMs);
    let ok = false;
    let statusCode: number | null = null;
    let latencyMs: number | null = null;
    let error: string | null = null;
    const started = Date.now();

    try {
      const headers = monitor.headersJson ? JSON.parse(monitor.headersJson) : undefined;
      const resp = await axios.request({
        url: monitor.url,
        method: monitor.method as any,
        data: monitor.body,
        headers,
        signal: controller.signal as any,
        validateStatus: () => true,
        timeout: monitor.timeoutMs,
      });
      latencyMs = Date.now() - started;
      statusCode = resp.status;
      ok = statusCode >= 200 && statusCode < 300;
    } catch (e: any) {
      latencyMs = Date.now() - started;
      if (e.code === "ECONNABORTED" || e.message?.includes("timeout")) {
        error = "Request timeout";
      } else if (e.code === "ENOTFOUND" || e.code === "ECONNREFUSED") {
        error = `Connection failed: ${e.message}`;
      } else {
        error = e?.message ?? "Request failed";
      }
    } finally {
      clearTimeout(timeout);
    }

    const check = await prisma.check.create({
      data: {
        monitorId: monitor.id,
        ok,
        statusCode: statusCode ?? undefined,
        latencyMs: latencyMs ?? undefined,
        error: error ?? undefined,
      },
    });

    await prisma.monitor.update({
      where: { id: monitor.id },
      data: { lastChecked: new Date() },
    });

    // Incident handling
    const lastIncident = await prisma.incident.findFirst({
      where: { monitorId: monitor.id },
      orderBy: { startedAt: "desc" },
    });

    if (!ok) {
      if (!lastIncident || lastIncident.resolvedAt) {
        // New incident - create and send alert
        const newIncident = await prisma.incident.create({
          data: {
            monitorId: monitor.id,
            reason: error ?? `HTTP ${statusCode}`,
          },
        });

        // Send webhook alert if configured
        if (monitor.webhookUrl) {
          const { sendWebhookAlert } = await import("./webhook");
          sendWebhookAlert(monitor.webhookUrl, {
            monitorName: monitor.name,
            monitorUrl: monitor.url,
            monitorId: monitor.id,
            status: "down",
            reason: error ?? `HTTP ${statusCode}`,
            timestamp: new Date(),
            incidentId: newIncident.id,
          }).catch((err) => console.error("[Uptime] Webhook alert failed:", err));
        } else {
          // Log alert to database even without webhook
          await prisma.alert.create({
            data: {
              monitorId: monitor.id,
              incidentId: newIncident.id,
              type: "down",
              status: "sent",
              message: `Monitor "${monitor.name}" is DOWN - ${error ?? `HTTP ${statusCode}`}`,
              sentAt: new Date(),
            },
          }).catch((err) => console.error("[Uptime] Failed to log alert:", err));
        }
      }
    } else {
      if (lastIncident && !lastIncident.resolvedAt) {
        const resolvedAt = new Date();
        const incidentDuration = Math.floor(
          (resolvedAt.getTime() - new Date(lastIncident.startedAt).getTime()) / 1000 / 60
        );

        await prisma.incident.update({
          where: { id: lastIncident.id },
          data: { resolvedAt },
        });

        // Send recovery alert if webhook configured
        if (monitor.webhookUrl) {
          const { sendWebhookAlert } = await import("./webhook");
          sendWebhookAlert(monitor.webhookUrl, {
            monitorName: monitor.name,
            monitorUrl: monitor.url,
            monitorId: monitor.id,
            status: "up",
            timestamp: resolvedAt,
            incidentId: lastIncident.id,
            duration: incidentDuration,
          }).catch((err) => console.error("[Uptime] Recovery webhook alert failed:", err));
        } else {
          // Log recovery alert to database even without webhook
          await prisma.alert.create({
            data: {
              monitorId: monitor.id,
              incidentId: lastIncident.id,
              type: "recovery",
              status: "sent",
              message: `Monitor "${monitor.name}" is UP - Downtime: ${incidentDuration} minutes`,
              sentAt: resolvedAt,
            },
          }).catch((err) => console.error("[Uptime] Failed to log recovery alert:", err));
        }
      }
    }

    return check;
  } catch (error) {
    console.error(`[Uptime] Error checking monitor ${monitorId}:`, error);
    // Don't throw - return null so scheduler continues with other monitors
    return null;
  }
}

export async function runDueChecks() {
  try {
    const now = new Date();
    const monitors = await prisma.monitor.findMany({ where: { isPaused: false } });
    const due = monitors.filter((m) => !m.lastChecked || (now.getTime() - new Date(m.lastChecked).getTime()) / 1000 >= m.intervalSec);
    
    if (due.length === 0) {
      return { ran: 0 };
    }

    // Run checks in parallel, but handle errors individually
    const results = await Promise.allSettled(
      due.map((m) => runCheckForMonitor(m.id))
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (failed > 0) {
      console.error(`[Uptime] ${failed} monitor check(s) failed`);
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          console.error(`[Uptime] Monitor ${due[i].id} failed:`, r.reason);
        }
      });
    }

    return { ran: successful, failed };
  } catch (error) {
    console.error("[Uptime] Error in runDueChecks:", error);
    return { ran: 0, error: error instanceof Error ? error.message : "Unknown error" };
  }
}



