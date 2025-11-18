import { NextResponse } from "next/server";
import { runDueChecks } from "@/src/server/uptime";
// Import scheduler to ensure it initializes
import "@/src/server/scheduler";

export async function GET() {
  const res = await runDueChecks();
  return NextResponse.json(res);
}


