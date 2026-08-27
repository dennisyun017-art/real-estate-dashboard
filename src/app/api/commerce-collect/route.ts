import { NextRequest, NextResponse } from "next/server";
import { REGIONS } from "@/lib/regions";
import { fetchCommerceCategoryCounts } from "@/lib/commerce";
import { getSupabaseAdmin } from "@/lib/supabase";

// 밀집 지역(강남구 등)은 상가업소가 수만 건이라 페이지네이션에 시간이 걸릴 수 있어 여유를 둠.
// 지역 하나씩만 처리하므로(클라이언트에서 지역별로 순차 호출) 300초 안에 충분히 끝납니다.
export const maxDuration = 300;

const RADIUS_M = 3000;

// 로그인 세션이 있어야 호출 가능 (proxy.ts가 /api/collect* 외의 모든 API를 세션 체크함)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const regionCode = typeof body?.regionCode === "string" ? body.regionCode : undefined;
  const region = REGIONS.find((r) => r.code === regionCode);
  if (!region) {
    return NextResponse.json({ error: "알 수 없는 지역 코드입니다." }, { status: 400 });
  }

  try {
    const items = await fetchCommerceCategoryCounts(region.lat, region.lng, RADIUS_M);
    const supabase = getSupabaseAdmin();

    if (items.length > 0) {
      const { error } = await supabase.from("region_commerce_summary").upsert(
        items.map((it) => ({
          region_code: region.code,
          category: it.category,
          cnt: it.count,
          radius_m: RADIUS_M,
          collected_at: new Date().toISOString(),
        })),
        { onConflict: "region_code,category" }
      );
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({
      regionCode: region.code,
      city: region.city,
      district: region.district,
      items,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
