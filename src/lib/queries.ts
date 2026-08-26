import { getSupabaseAdmin } from "@/lib/supabase";

const PYEONG = 3.3058; // 1평 = 3.3058 m^2

export type CitySummary = {
  city: string;
  count: number;
  avgPricePerPyeong: number; // 만원/평
  prevAvgPricePerPyeong: number | null;
  changePct: number | null; // 전월 대비 %
};

type TradeRow = {
  city: string;
  deal_amount: number;
  exclusive_area: number;
  deal_date: string;
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

function avgPricePerPyeong(rows: TradeRow[]): number {
  if (rows.length === 0) return 0;
  const total = rows.reduce(
    (sum, r) => sum + r.deal_amount / (r.exclusive_area / PYEONG),
    0
  );
  return Math.round(total / rows.length);
}

/** 시/도별 이번달 vs 전월 평균 평당가 요약 */
export async function getCitySummary(): Promise<CitySummary[]> {
  const supabase = getSupabaseAdmin();
  const thisMonth = monthRange(0);
  const prevMonth = monthRange(1);

  const { data: curRows, error: curErr } = await supabase
    .from("apt_trades")
    .select("city, deal_amount, exclusive_area, deal_date")
    .gte("deal_date", toISODate(thisMonth.start))
    .lt("deal_date", toISODate(thisMonth.end));
  if (curErr) throw new Error(curErr.message);

  const { data: prevRows, error: prevErr } = await supabase
    .from("apt_trades")
    .select("city, deal_amount, exclusive_area, deal_date")
    .gte("deal_date", toISODate(prevMonth.start))
    .lt("deal_date", toISODate(prevMonth.end));
  if (prevErr) throw new Error(prevErr.message);

  const cities = Array.from(
    new Set([...(curRows ?? []), ...(prevRows ?? [])].map((r) => r.city))
  ).sort();

  return cities.map((city) => {
    const cur = (curRows ?? []).filter((r) => r.city === city);
    const prev = (prevRows ?? []).filter((r) => r.city === city);
    const curAvg = avgPricePerPyeong(cur);
    const prevAvg = prev.length > 0 ? avgPricePerPyeong(prev) : null;
    const changePct =
      prevAvg && prevAvg > 0 ? ((curAvg - prevAvg) / prevAvg) * 100 : null;
    return {
      city,
      count: cur.length,
      avgPricePerPyeong: curAvg,
      prevAvgPricePerPyeong: prevAvg,
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

/** 특정 지역의 최근 N개월 월별 평균 평당가 추이 */
export async function getRegionMonthlyTrend(regionCode: string, months = 6) {
  const supabase = getSupabaseAdmin();
  const { start } = monthRange(months - 1);
  const { data, error } = await supabase
    .from("apt_trades")
    .select("deal_amount, exclusive_area, deal_date")
    .eq("region_code", regionCode)
    .gte("deal_date", toISODate(start));
  if (error) throw new Error(error.message);

  const buckets = new Map<string, TradeRow[]>();
  for (const row of data ?? []) {
    const ym = row.deal_date.slice(0, 7); // YYYY-MM
    if (!buckets.has(ym)) buckets.set(ym, []);
    buckets.get(ym)!.push({ ...row, city: "" });
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, rows]) => ({
      month,
      avgPricePerPyeong: avgPricePerPyeong(rows),
      count: rows.length,
    }));
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
