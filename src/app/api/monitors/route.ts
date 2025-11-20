import { prisma } from "@/src/server/db";
import { getServerSession } from "next-auth";
import { monitorInputSchema } from "@/src/lib/validation";
import { NextRequest, NextResponse } from "next/server";
// Initialize scheduler when monitors API is called (ensures it starts when app loads)
import "@/src/server/scheduler";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const url = new URL(req.url);
    const page = Number(url.searchParams.get("page") || 1);
    const pageSize = Number(url.searchParams.get("pageSize") || 10);
    const skip = (page - 1) * pageSize;
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const [items, total] = await Promise.all([
      prisma.monitor.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, skip, take: pageSize }),
      prisma.monitor.count({ where: { userId: user.id } }),
    ]);
    return NextResponse.json({ items, total, page, pageSize });
  } catch (error: any) {
    console.error("[API] Get monitors error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized - Please log in" }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized - User not found" }, { status: 401 });
    }
    
    const json = await req.json();
    const parsed = monitorInputSchema.safeParse(json);
    
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const errorMessages = Object.entries(errors)
        .map(([field, messages]) => `${field}: ${messages?.join(", ")}`)
        .join("; ");
      return NextResponse.json(
        { error: `Validation error: ${errorMessages}` },
        { status: 400 }
      );
    }
    
    const createData = {
      name: parsed.data.name,
      url: parsed.data.url,
      method: parsed.data.method,
      intervalSec: parsed.data.intervalSec,
      timeoutMs: parsed.data.timeoutMs,
      headersJson: parsed.data.headersJson || null,
      body: parsed.data.body || null,
      isPaused: parsed.data.isPaused || false,
      webhookUrl: parsed.data.webhookUrl || null,
      userId: user.id,
    };
    
    const created = await prisma.monitor.create({ data: createData });
    
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("[API] Create monitor error:", error);
    
    // Handle Prisma unique constraint errors
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A monitor with this URL already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: error?.message || "Failed to create monitor" },
      { status: 500 }
    );
  }
}



