import { prisma } from "@/src/server/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const monitorId = url.searchParams.get("monitorId");
  const page = Number(url.searchParams.get("page") || 1);
  const pageSize = Number(url.searchParams.get("pageSize") || 20);
  const skip = (page - 1) * pageSize;
  const where = monitorId ? { monitorId } : {};
  const [items, total] = await Promise.all([
    prisma.check.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: pageSize }),
    prisma.check.count({ where }),
  ]);
  return NextResponse.json({ items, total, page, pageSize });
}



