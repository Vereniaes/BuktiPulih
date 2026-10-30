// Todo:
// -> Trigger BNPB sync; check the bearer token when CRON_SECRET is configured.

// --- BNPB cron ---
import { NextResponse } from "next/server";
import { syncBnpbData } from "@/lib/bnpbSync";

export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Without CRON_SECRET this route accepts unauthenticated requests.
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await syncBnpbData();

  return NextResponse.json({
    status: result.success ? "success" : result.data.status,
    timestamp: result.data.sync_timestamp,
    fetched_at: result.data.fetched_at,
    checked_at: result.data.checked_at,
    provinces_count: result.data.provinces.length,
    error: result.error || null,
  }, { status: result.success ? 200 : 502, headers: { "Cache-Control": "no-store" } });
}
// --- end of BNPB cron ---
