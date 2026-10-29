// this file serves current synced bnpb karhutla data
// Todo:
// -> return cached bnpb sync data
// -> support manual refresh if needed

import { NextResponse } from "next/server";
import { getCachedBnpbData, syncBnpbData } from "@/lib/bnpbSync";

// # route handler get data bnpb karhutla -------------------------------------------
// # function buat kembalikan data bnpb karhutla tersinkronisasi
// # input param : request HTTP
// # output : payload json BnpbSyncData
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const shouldRefresh = searchParams.get("refresh") === "true";

  if (shouldRefresh) {
    const result = await syncBnpbData();
    return NextResponse.json(result.data);
  }

  return NextResponse.json(getCachedBnpbData());
}
// # end of helper ------------------------------------------------------------------
