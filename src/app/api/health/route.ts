import { NextResponse } from "next/server";
import { fetchCount } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const projectCount = await fetchCount("project_pipeline");
    return NextResponse.json({
      ok: true,
      db: "connected",
      via: "frontend_dashboard_data",
      project_pipeline_count: projectCount,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e) },
      { status: 503 },
    );
  }
}
