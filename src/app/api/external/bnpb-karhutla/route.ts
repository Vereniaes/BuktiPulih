// Todo:
// -> Read or refresh the frontend BNPB cache.

// --- BNPB response ---
import { NextResponse } from "next/server";
import { getCachedBnpbData, syncBnpbData } from "@/lib/bnpbSync";

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const shouldRefresh = searchParams.get("refresh") === "true";

  if (shouldRefresh) {
    const result = await syncBnpbData();
    return NextResponse.json(result.data);
  }

  return NextResponse.json(getCachedBnpbData());
}
// --- end of BNPB response ---
