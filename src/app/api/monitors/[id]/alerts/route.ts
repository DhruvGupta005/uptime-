import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/src/server/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const monitor = await prisma.monitor.findFirst({
      where: { id, userId: user.id },
    });

    if (!monitor) {
      return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
    }

    const url = new URL(req.url);
    const page = Number(url.searchParams.get("page") || 1);
    const pageSize = Number(url.searchParams.get("pageSize") || 20);
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.alert.findMany({
        where: { monitorId: id },
        orderBy: { sentAt: "desc" },
        skip,
        take: pageSize,
        include: {
          incident: {
            select: {
              id: true,
              startedAt: true,
              resolvedAt: true,
            },
          },
        },
      }),
      prisma.alert.count({ where: { monitorId: id } }),
    ]);

    return NextResponse.json({ items, total, page, pageSize });
  } catch (error: any) {
    console.error("[API] Get alerts error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}





