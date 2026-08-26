import { NextRequest, NextResponse } from "next/server";
import { addFavorite, getFavoritesWithLatest } from "@/lib/queries";

export async function GET() {
  const favorites = await getFavoritesWithLatest();
  return NextResponse.json({ favorites });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { regionCode, city, district, dong, aptName } = body ?? {};

  if (!regionCode || !city || !district || !dong || !aptName) {
    return NextResponse.json(
      { error: "regionCode, city, district, dong, aptName이 모두 필요합니다." },
      { status: 400 }
    );
  }

  await addFavorite({ regionCode, city, district, dong, aptName });
  return NextResponse.json({ ok: true });
}
