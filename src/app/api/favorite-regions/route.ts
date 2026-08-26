import { NextRequest, NextResponse } from "next/server";
import { addFavoriteRegion, getFavoriteRegions } from "@/lib/queries";

export async function GET() {
  const regions = await getFavoriteRegions();
  return NextResponse.json({ regions });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { regionCode, city, district } = body ?? {};

  if (!regionCode || !city || !district) {
    return NextResponse.json(
      { error: "regionCode, city, district가 모두 필요합니다." },
      { status: 400 }
    );
  }

  await addFavoriteRegion({ regionCode, city, district });
  return NextResponse.json({ ok: true });
}
