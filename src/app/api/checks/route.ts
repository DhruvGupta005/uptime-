import { prisma } from "@/src/server/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const url = new URL(req.url);
    const monitorId = url.searchParams.get("monitorId");
    const page = Number(url.searchParams.get("page") || 1);
    const pageSize = Number(url.searchParams.get("pageSize") || 20);
    const skip = (page - 1) * pageSize;
    
    // Security: Only show checks for monitors owned by the user
    const where = monitorId 
      ? { 
          monitorId,
          monitor: { userId: user.id } // Ensure user owns the monitor
        }
      : { 
          monitor: { userId: user.id } // Only show checks for user's monitors
        };
    
    const [items, total] = await Promise.all([
      prisma.check.findMany({ 
        where, 
        orderBy: { createdAt: "desc" }, 
        skip, 
        take: pageSize,
        include: {
          monitor: {
            select: {
              id: true,
              name: true,
              url: true,
            },
          },
        },
      }),
      prisma.check.count({ where }),
    ]);
    return NextResponse.json({ items, total, page, pageSize });
  } catch (error: any) {
    if (error?.code === "P1001") {
      console.error("[API] Database connection error:", error?.meta ?? error);
      return NextResponse.json(
        { error: "Database is unreachable. Please check DATABASE_URL or DB availability." },
        { status: 503 }
      );
    }
    console.error("[API] Get checks error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}



