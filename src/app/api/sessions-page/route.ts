import { NextResponse } from "next/server";
import { fetchTable } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const offset = parseInt(u.searchParams.get("offset") || "0", 10);
  const limit = Math.min(200, parseInt(u.searchParams.get("limit") || "50", 10));
  try {
    const data = await fetchTable("zpm_sessions", { offset, limit });
    return NextResponse.json({ rows: data.rows, has_more: data.has_more, total_count: data.total_count });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
