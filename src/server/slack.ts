import axios from "axios";
import { prisma } from "./db";

interface SlackNotification {
  monitorName: string;
  monitorUrl: string;
  status: "down" | "up";
  reason?: string;
  timestamp: Date;
  incidentId?: string;
  monitorId?: string;
  duration?: number; // Duration in minutes for ongoing incidents
  isRecurring?: boolean; // True if this is a periodic alert for ongoing incident
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

export async function sendSlackAlert(webhookUrl: string, notification: SlackNotification, retries = 3): Promise<boolean> {
  // Create user-friendly message
  const userMessage = notification.status === "down"
    ? notification.isRecurring
      ? `Your website ${notification.monitorName} is still down. It has been down for ${formatDuration(notification.duration || 0)}.`
      : `⚠️ Your website ${notification.monitorName} is down at ${notification.timestamp.toLocaleString()}.`
    : `✅ Your website ${notification.monitorName} is back online at ${notification.timestamp.toLocaleString()}.`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const title = notification.isRecurring 
        ? `🚨 Website Still Down (${notification.duration} min)` 
        : notification.status === "down" 
        ? "🚨 Website Down Alert" 
        : "✅ Website Recovered";

    const fields: any[] = [
      {
        type: "mrkdwn",
        text: `*Monitor:*\n${notification.monitorName}`,
      },
      {
        type: "mrkdwn",
        text: `*URL:*\n<${notification.monitorUrl}|${notification.monitorUrl}>`,
      },
      {
        type: "mrkdwn",
        text: `*Status:*\n${notification.status === "down" ? "❌ DOWN" : "✅ UP"}`,
      },
      {
        type: "mrkdwn",
        text: `*Time:*\n${notification.timestamp.toLocaleString()}`,
      },
    ];

    if (notification.duration && notification.status === "down") {
      fields.push({
        type: "mrkdwn",
        text: `*Duration:*\n${formatDuration(notification.duration)}`,
      });
    }

    const payload: any = {
      text: userMessage,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: title,
            emoji: true,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${userMessage}*`,
          },
        },
        {
          type: "section",
          fields,
        },
      ],
    };

    if (notification.reason) {
      payload.blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Reason:*\n\`\`\`${notification.reason}\`\`\``,
        },
      });
    }

    if (notification.status === "down") {
      payload.blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Check your monitor at ${new URL(notification.monitorUrl).origin}`,
          },
        ],
      });
    }

    const response = await axios.post(webhookUrl, payload, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

      if (response.status === 200) {
        // Log successful alert to database
        if (notification.monitorId) {
          try {
            await prisma.alert.create({
              data: {
                monitorId: notification.monitorId,
                incidentId: notification.incidentId,
                type: notification.isRecurring ? "periodic" : notification.status === "down" ? "down" : "recovery",
                status: "sent",
                message: userMessage,
                sentAt: notification.timestamp,
              },
            });
          } catch (dbError) {
            console.error("[Slack] Failed to log alert to database:", dbError);
          }
        }
        return true;
      }
    } catch (error: any) {
      if (attempt === retries) {
        console.error(`[Slack] Failed to send notification after ${retries} attempts:`, error?.message);
        // Log failed alert to database
        if (notification.monitorId) {
          try {
            await prisma.alert.create({
              data: {
                monitorId: notification.monitorId,
                incidentId: notification.incidentId,
                type: notification.isRecurring ? "periodic" : notification.status === "down" ? "down" : "recovery",
                status: "failed",
                message: userMessage,
                sentAt: notification.timestamp,
                error: error?.message || "Unknown error",
              },
            });
          } catch (dbError) {
            console.error("[Slack] Failed to log failed alert to database:", dbError);
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

