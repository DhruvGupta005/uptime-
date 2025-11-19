import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/src/server/db";
import { runCheckForMonitor } from "@/src/server/uptime";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const monitor = await prisma.monitor.findFirst({ where: { id, userId: user.id } });
    if (!monitor) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const check = await runCheckForMonitor(monitor.id);
    return NextResponse.json({ ok: true, check });
  } catch (error: any) {
    console.error("[API] Run monitor check error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}



