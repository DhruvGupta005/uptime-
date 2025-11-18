import { prisma } from "@/src/server/db";
import { getServerSession } from "next-auth";
import { monitorInputSchema } from "@/src/lib/validation";
import { NextRequest, NextResponse } from "next/server";

async function getUserId() {
  const session = await getServerSession();
  if (!session?.user?.email) return null;
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  return user?.id ?? null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const monitor = await prisma.monitor.findFirst({ where: { id: params.id, userId } });
  if (!monitor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(monitor);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await req.json();
  const parsed = monitorInputSchema.partial().safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const updated = await prisma.monitor.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.monitor.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}



