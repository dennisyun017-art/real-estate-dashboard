import { getSupabaseAdmin } from "@/lib/supabase";

export type CitySummary = {
  city: string;
  count: number;
  avgPricePerPyeong: number; // 만원/평
  prevAvgPricePerPyeong: number | null;
  changePct: number | null; // 전월 대비 %
};

function monthRange(monthsAgo: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 1);
  return { start, end };
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

type CityMonthRow = { city: string; cnt: number; avg_price_per_pyeong: number };

/** 시/도별 이번달 vs 전월 평균 평당가 요약 (DB에서 GROUP BY로 집계 — 1000행 제한 영향 없음) */
export async function getCitySummary(): Promise<CitySummary[]> {
  const supabase = getSupabaseAdmin();
  const thisMonth = monthRange(0);
  const prevMonth = monthRange(1);

  const { data: curRows, error: curErr } = await supabase.rpc(
    "city_month_summary",
    { p_start: toISODate(thisMonth.start), p_end: toISODate(thisMonth.end) }
  );
  if (curErr) throw new Error(curErr.message);

  const { data: prevRows, error: prevErr } = await supabase.rpc(
    "city_month_summary",
    { p_start: toISODate(prevMonth.start), p_end: toISODate(prevMonth.end) }
  );
  if (prevErr) throw new Error(prevErr.message);

  const curMap = new Map((curRows as CityMonthRow[] ?? []).map((r) => [r.city, r]));
  const prevMap = new Map((prevRows as CityMonthRow[] ?? []).map((r) => [r.city, r]));

  const cities = Array.from(new Set([...curMap.keys(), ...prevMap.keys()])).sort();

  return cities.map((city) => {
    const cur = curMap.get(city);
    const prev = prevMap.get(city);
    const curAvg = cur?.avg_price_per_pyeong ?? 0;
    const prevAvg = prev?.avg_price_per_pyeong ?? null;
    const changePct =
      prevAvg && prevAvg > 0 ? ((curAvg - prevAvg) / prevAvg) * 100 : null;
    return {
      city,
      count: cur?.cnt ?? 0,
      avgPricePerPyeong: Math.round(curAvg),
      prevAvgPricePerPyeong: prevAvg !== null ? Math.round(prevAvg) : null,
      changePct: changePct !== null ? Math.round(changePct * 10) / 10 : null,
    };
  });
}

/** 특정 지역(법정동코드)의 최근 거래 목록 */
export async function getRegionRecentTrades(regionCode: string, limit = 30) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("apt_trades")
    .select(
      "apt_name, dong, exclusive_area, floor, build_year, deal_date, deal_amount"
    )
    .eq("region_code", regionCode)
    .order("deal_date", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** 특정 지역의 최근 N개월 월별 평균 평당가 추이 (DB에서 GROUP BY로 집계) */
export async function getRegionMonthlyTrend(regionCode: string, months = 6) {
  const supabase = getSupabaseAdmin();
  const { start } = monthRange(months - 1);
  const { data, error } = await supabase.rpc("region_monthly_trend", {
    p_region: regionCode,
    p_start: toISODate(start),
  });
  if (error) throw new Error(error.message);

  return ((data as { month: string; cnt: number; avg_price_per_pyeong: number }[]) ?? []).map(
    (r) => ({
      month: r.month,
      avgPricePerPyeong: Math.round(r.avg_price_per_pyeong),
      count: r.cnt,
    })
  );
}

export async function getLatestCollectRun() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("collect_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}
