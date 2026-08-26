import { NextRequest, NextResponse } from "next/server";
import { searchApartments } from "@/lib/queries";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const results = await searchApartments(q);
  return NextResponse.json({ results });
}
