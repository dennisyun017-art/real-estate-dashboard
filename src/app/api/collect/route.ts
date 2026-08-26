import { NextRequest, NextResponse } from "next/server";
import { REGIONS } from "@/lib/regions";
import { fetchAptTrades, recentDealYm } from "@/lib/molit";
import { getSupabaseAdmin } from "@/lib/supabase";

export const maxDuration = 300; // Vercel Cron이 오래 걸릴 수 있어 여유를 둠

// 실거래 신고는 계약 후 최대 30일 이내 소급 신고될 수 있으므로
// 최근 2개월치를 매번 다시 조회해서 upsert 합니다.
const MONTHS_BACK = 2;

function toDealDate(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export async function GET(req: NextRequest) {
  // Vercel Cron 또는 수동 트리거 시 CRON_SECRET으로 보호
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const supabase = getSupabaseAdmin();
  const { data: run } = await supabase
    .from("collect_runs")
    .insert({ status: "running" })
    .select()
    .single();

  let regionsProcessed = 0;
  let rowsUpserted = 0;
  const errors: string[] = [];

  const dealYms = recentDealYm(MONTHS_BACK);

  for (const region of REGIONS) {
    for (const ym of dealYms) {
      try {
        const trades = await fetchAptTrades(region.code, ym);
        if (trades.length === 0) continue;

        const rows = trades.map((t) => ({
          region_code: region.code,
          city: region.city,
          district: region.district,
          dong: t.dong,
          jibun: t.jibun,
          apt_name: t.aptName,
          build_year: t.buildYear,
          exclusive_area: t.exclusiveArea,
          floor: t.floor,
          deal_date: toDealDate(t.dealYear, t.dealMonth, t.dealDay),
          deal_amount: t.dealAmount,
          updated_at: new Date().toISOString(),
        }));

        const { error } = await supabase
          .from("apt_trades")
          .upsert(rows, {
            onConflict:
              "region_code,dong,jibun,apt_name,exclusive_area,floor,deal_date,deal_amount",
            ignoreDuplicates: false,
          });

        if (error) {
          errors.push(`${region.city} ${region.district} ${ym}: ${error.message}`);
        } else {
          rowsUpserted += rows.length;
        }
      } catch (e) {
        errors.push(
          `${region.city} ${region.district} ${ym}: ${
            e instanceof Error ? e.message : String(e)
          }`
        );
      }
    }
    regionsProcessed++;
  }

  const finished = {
    finished_at: new Date().toISOString(),
    status: errors.length > 0 ? "error" : "success",
    regions_processed: regionsProcessed,
    rows_upserted: rowsUpserted,
    error_message: errors.length > 0 ? errors.slice(0, 20).join("\n") : null,
  };

  if (run?.id) {
    await supabase.from("collect_runs").update(finished).eq("id", run.id);
  }

  return NextResponse.json({
    regionsProcessed,
    rowsUpserted,
    errorCount: errors.length,
    errors: errors.slice(0, 20),
  });
}
