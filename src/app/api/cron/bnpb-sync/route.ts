// this file handles scheduled cron trigger from vercel cron
// Todo:
// -> verify authorization header against CRON_SECRET if present
// -> trigger bnpb sync
// -> return json execution result

import { NextResponse } from "next/server";
import { syncBnpbData } from "@/lib/bnpbSync";

// # route handler get untuk pemicu vercel cron ------------------------------------
// # function buat tangani trigger cron berkala dari vercel
// # input param : request HTTP
// # output : payload json hasil sinkronisasi
export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // validasi bearer token jika CRON_SECRET dikonfigurasi di environment
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await syncBnpbData();

  return NextResponse.json({
    status: result.success ? "success" : "fallback",
    timestamp: result.data.sync_timestamp,
    provinces_count: result.data.provinces.length,
    error: result.error || null,
  });
}
// # end of helper ------------------------------------------------------------------
