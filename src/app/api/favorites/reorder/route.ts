import { NextRequest, NextResponse } from "next/server";
import { reorderFavorites } from "@/lib/queries";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const orderedIds = body?.orderedIds;

  if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "number")) {
    return NextResponse.json({ error: "orderedIds는 숫자 배열이어야 합니다." }, { status: 400 });
  }

  await reorderFavorites(orderedIds);
  return NextResponse.json({ ok: true });
}
