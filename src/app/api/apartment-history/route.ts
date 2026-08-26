import { NextRequest, NextResponse } from "next/server";
import { getApartmentHistory } from "@/lib/queries";

export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get("region");
  const dong = req.nextUrl.searchParams.get("dong");
  const aptName = req.nextUrl.searchParams.get("aptName");

  if (!region || !dong || !aptName) {
    return NextResponse.json(
      { error: "region, dong, aptName이 모두 필요합니다." },
      { status: 400 }
    );
  }

  const history = await getApartmentHistory(region, dong, aptName);
  return NextResponse.json(history);
}
