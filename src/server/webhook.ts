import axios from "axios";
import { prisma } from "./db";

interface WebhookNotification {
  monitorName: string;
  monitorUrl: string;
  status: "down" | "up";
  reason?: string;
  timestamp: Date;
  incidentId?: string;
  monitorId?: string;
  duration?: number; // Duration in minutes
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  const hrs = hours % 24;
  return `${days}d ${hrs}h`;
}

export async function sendWebhookAlert(
  webhookUrl: string,
  notification: WebhookNotification,
  retries = 3
): Promise<boolean> {
  const message = notification.status === "down"
    ? `🚨 Monitor "${notification.monitorName}" is DOWN\nURL: ${notification.monitorUrl}\nTime: ${notification.timestamp.toLocaleString()}\nReason: ${notification.reason || "Service unreachable"}`
    : `✅ Monitor "${notification.monitorName}" is UP\nURL: ${notification.monitorUrl}\nTime: ${notification.timestamp.toLocaleString()}${notification.duration ? `\nDowntime: ${formatDuration(notification.duration)}` : ""}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const payload = {
        text: message,
        monitor: {
          name: notification.monitorName,
          url: notification.monitorUrl,
          status: notification.status,
          timestamp: notification.timestamp.toISOString(),
        },
        ...(notification.reason && { reason: notification.reason }),
        ...(notification.duration && { duration: `${notification.duration} minutes` }),
      };

      const response = await axios.post(webhookUrl, payload, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      if (response.status >= 200 && response.status < 300) {
        // Log successful alert to database
        if (notification.monitorId) {
          try {
            await prisma.alert.create({
              data: {
                monitorId: notification.monitorId,
                incidentId: notification.incidentId,
                type: notification.status === "down" ? "down" : "recovery",
                status: "sent",
                message,
                sentAt: notification.timestamp,
              },
            });
          } catch (dbError) {
            console.error("[Webhook] Failed to log alert to database:", dbError);
          }
        }
        return true;
      }
    } catch (error: any) {
      if (attempt === retries) {
        console.error(`[Webhook] Failed to send notification after ${retries} attempts:`, error?.message);
        // Log failed alert to database
        if (notification.monitorId) {
          try {
            await prisma.alert.create({
              data: {
                monitorId: notification.monitorId,
                incidentId: notification.incidentId,
                type: notification.status === "down" ? "down" : "recovery",
                status: "failed",
                message,
                sentAt: notification.timestamp,
                error: error?.message || "Unknown error",
              },
            });
          } catch (dbError) {
            console.error("[Webhook] Failed to log failed alert to database:", dbError);
          }
        }
        return false;
      }
      // Wait before retry (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  return false;
}

