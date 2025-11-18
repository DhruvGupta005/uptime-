import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/src/server/db";
import { sendSlackAlert } from "@/src/server/slack";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const monitor = await prisma.monitor.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!monitor) {
      return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
    }

    const { webhookUrl, alertType } = await req.json();
    if (!webhookUrl) {
      return NextResponse.json({ error: "Webhook URL is required" }, { status: 400 });
    }

    const now = new Date();
    let notification;

    // Create different test messages based on type
    switch (alertType) {
      case "down":
        notification = {
          monitorName: monitor.name,
          monitorUrl: monitor.url,
          monitorId: monitor.id,
          status: "down" as const,
          reason: "This is a test notification - Website Down Alert",
          timestamp: now,
        };
        break;
      case "recovery":
        notification = {
          monitorName: monitor.name,
          monitorUrl: monitor.url,
          monitorId: monitor.id,
          status: "up" as const,
          timestamp: now,
          duration: 45, // 45 minutes of downtime
        };
        break;
      case "periodic":
        notification = {
          monitorName: monitor.name,
          monitorUrl: monitor.url,
          monitorId: monitor.id,
          status: "down" as const,
          reason: "This is a test notification - Periodic Alert",
          timestamp: now,
          duration: 60, // 60 minutes down
          isRecurring: true,
        };
        break;
      default:
        notification = {
          monitorName: monitor.name,
          monitorUrl: monitor.url,
          monitorId: monitor.id,
          status: "down" as const,
          reason: "This is a test notification from your uptime monitor",
          timestamp: now,
        };
    }

    // Send test notification
    const success = await sendSlackAlert(webhookUrl, notification);

    if (success) {
      return NextResponse.json({ success: true, message: "Test notification sent successfully" });
    } else {
      return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
    }
  } catch (error: any) {
    console.error("[API] Test Slack error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

