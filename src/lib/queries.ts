import { getSupabaseAdmin } from "@/lib/supabase";
import { REGIONS } from "@/lib/regions";

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

export type RegionTradeDetail = {
  apt_name: string;
  dong: string;
  exclusive_area: number;
  floor: number | null;
  build_year: number | null;
  deal_date: string;
  deal_amount: number;
  historic_high: number;
  is_new_high: boolean;
  cancel_date: string | null;
  dealing_type: string | null;
  estate_agent_location: string | null;
};

export type RegionTradesPage = {
  trades: RegionTradeDetail[];
  totalCount: number;
  page: number;
  pageSize: number;
};

/**
 * 특정 지역(법정동코드)의 거래 목록 — 신고가 여부, 해제 여부, 거래유형,
 * 중개사무소 소재지까지 포함한 상세 정보 + 기간 검색 + 페이지네이션 (DB에서 한 번에 계산).
 */
export async function getRegionRecentTrades(
  regionCode: string,
  opts: {
    page?: number;
    pageSize?: number;
    startDate?: string; // YYYY-MM-DD
    endDate?: string; // YYYY-MM-DD
  } = {}
): Promise<RegionTradesPage> {
  const { page = 1, pageSize = 50, startDate, endDate } = opts;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("region_recent_trades_detailed", {
    p_region: regionCode,
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
    p_start_date: startDate ?? null,
    p_end_date: endDate ?? null,
  });
  if (error) throw new Error(error.message);

  const rows = (data as (RegionTradeDetail & { total_count: number })[]) ?? [];
  const totalCount = rows[0]?.total_count ?? 0;
  const trades: RegionTradeDetail[] = rows.map(
    ({ total_count: _total_count, ...rest }) => rest
  );

  return { trades, totalCount, page, pageSize };
}

/** CSV 내보내기용: 페이지네이션 없이 조건에 맞는 전체 거래를 가져옵니다 (1000행 제한을 range()로 우회) */
export async function getRegionTradesForExport(
  regionCode: string,
  startDate?: string,
  endDate?: string
): Promise<RegionTradeDetail[]> {
  const supabase = getSupabaseAdmin();
  const CHUNK = 1000;
  let offset = 0;
  const all: RegionTradeDetail[] = [];

  for (;;) {
    let q = supabase
      .from("apt_trades")
      .select(
        "apt_name, dong, exclusive_area, floor, build_year, deal_date, deal_amount, cancel_date, dealing_type, estate_agent_location"
      )
      .eq("region_code", regionCode)
      .order("deal_date", { ascending: false })
      .range(offset, offset + CHUNK - 1);
    if (startDate) q = q.gte("deal_date", startDate);
    if (endDate) q = q.lte("deal_date", endDate);

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all.push(
      ...data.map((r) => ({ ...r, historic_high: 0, is_new_high: false }))
    );
    if (data.length < CHUNK) break;
    offset += CHUNK;
  }

  return all;
}

export type RegionRanking = {
  regionCode: string;
  city: string;
  district: string;
  count: number;
  avgPricePerPyeong: number;
  changePct: number | null;
};

/** 지역(시군구)별 이번달 평당가와 전월 대비 변동률 — 급등/급락 랭킹용 */
export async function getRegionRankings(): Promise<RegionRanking[]> {
  const supabase = getSupabaseAdmin();
  const thisMonth = monthRange(0);
  const prevMonth = monthRange(1);

  const [{ data: curRows, error: curErr }, { data: prevRows, error: prevErr }] =
    await Promise.all([
      supabase.rpc("all_regions_month_summary", {
        p_start: toISODate(thisMonth.start),
        p_end: toISODate(thisMonth.end),
      }),
      supabase.rpc("all_regions_month_summary", {
        p_start: toISODate(prevMonth.start),
        p_end: toISODate(prevMonth.end),
      }),
    ]);
  if (curErr) throw new Error(curErr.message);
  if (prevErr) throw new Error(prevErr.message);

  type Row = { region_code: string; cnt: number; avg_price_per_pyeong: number };
  const prevMap = new Map(((prevRows as Row[]) ?? []).map((r) => [r.region_code, r]));
  const regionInfoMap = new Map(REGIONS.map((r) => [r.code, r]));

  return ((curRows as Row[]) ?? [])
    .map((r): RegionRanking => {
      const info = regionInfoMap.get(r.region_code);
      const prev = prevMap.get(r.region_code);
      const changePct =
        prev && prev.avg_price_per_pyeong > 0
          ? ((r.avg_price_per_pyeong - prev.avg_price_per_pyeong) /
              prev.avg_price_per_pyeong) *
            100
          : null;
      return {
        regionCode: r.region_code,
        city: info?.city ?? "",
        district: info?.district ?? "",
        count: r.cnt,
        avgPricePerPyeong: Math.round(r.avg_price_per_pyeong),
        changePct: changePct !== null ? Math.round(changePct * 10) / 10 : null,
      };
    })
    // 거래량이 너무 적으면 변동률이 튀는 노이즈일 뿐이라 랭킹에서 제외
    .filter((r) => r.count >= 3 && r.changePct !== null);
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

export type RegionSummary = {
  regionCode: string;
  count: number;
  avgPricePerPyeong: number;
};

/** 지도 시각화용: 이번달 지역(시군구)별 요약을 한 번의 쿼리로 전부 가져옵니다 */
export async function getAllRegionsSummary(): Promise<RegionSummary[]> {
  const supabase = getSupabaseAdmin();
  const { start, end } = monthRange(0);
  const { data, error } = await supabase.rpc("all_regions_month_summary", {
    p_start: toISODate(start),
    p_end: toISODate(end),
  });
  if (error) throw new Error(error.message);

  return (
    (data as { region_code: string; cnt: number; avg_price_per_pyeong: number }[]) ?? []
  ).map((r) => ({
    regionCode: r.region_code,
    count: r.cnt,
    avgPricePerPyeong: Math.round(r.avg_price_per_pyeong),
  }));
}

export type Favorite = {
  id: number;
  region_code: string;
  city: string;
  district: string;
  dong: string;
  apt_name: string;
  created_at: string;
};

export type FavoriteTrendPoint = {
  month: string;
  avgPricePerPyeong: number;
  count: number;
};

export type FavoriteWithLatest = Favorite & {
  latestDealDate: string | null;
  latestDealAmount: number | null;
  latestExclusiveArea: number | null;
  trend: FavoriteTrendPoint[];
};

const PYEONG = 3.3058;

/** 즐겨찾기 목록 + 각 단지의 최근 거래 1건 + 최근 12개월 평당가 추이 */
export async function getFavoritesWithLatest(): Promise<FavoriteWithLatest[]> {
  const supabase = getSupabaseAdmin();
  const { data: favorites, error } = await supabase
    .from("favorites")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (!favorites || favorites.length === 0) return [];

  const { start } = monthRange(11); // 최근 12개월

  const withLatest = await Promise.all(
    (favorites as Favorite[]).map(async (fav) => {
      // 단지 하나의 거래는 오래 쌓여도 수백 건 수준이라 전체를 가져와 JS에서 집계합니다.
      const { data: trades } = await supabase
        .from("apt_trades")
        .select("deal_date, deal_amount, exclusive_area")
        .eq("region_code", fav.region_code)
        .eq("dong", fav.dong)
        .eq("apt_name", fav.apt_name)
        .order("deal_date", { ascending: false })
        .limit(500);

      const latest = trades?.[0];

      const buckets = new Map<string, { total: number; count: number }>();
      for (const t of trades ?? []) {
        if (t.deal_date < toISODate(start)) continue;
        const ym = t.deal_date.slice(0, 7);
        const pricePerPyeong = t.deal_amount / (t.exclusive_area / PYEONG);
        const bucket = buckets.get(ym) ?? { total: 0, count: 0 };
        bucket.total += pricePerPyeong;
        bucket.count += 1;
        buckets.set(ym, bucket);
      }
      const trend = Array.from(buckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, b]) => ({
          month,
          avgPricePerPyeong: Math.round(b.total / b.count),
          count: b.count,
        }));

      return {
        ...fav,
        latestDealDate: latest?.deal_date ?? null,
        latestDealAmount: latest?.deal_amount ?? null,
        latestExclusiveArea: latest?.exclusive_area ?? null,
        trend,
      };
    })
  );

  return withLatest;
}

export async function addFavorite(input: {
  regionCode: string;
  city: string;
  district: string;
  dong: string;
  aptName: string;
}) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("favorites").upsert(
    {
      region_code: input.regionCode,
      city: input.city,
      district: input.district,
      dong: input.dong,
      apt_name: input.aptName,
    },
    { onConflict: "region_code,dong,apt_name", ignoreDuplicates: true }
  );
  if (error) throw new Error(error.message);
}

export async function removeFavorite(id: number) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("favorites").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export type ApartmentSearchResult = {
  regionCode: string;
  city: string;
  district: string;
  dong: string;
  aptName: string;
  count: number;
  latestDealDate: string;
  latestDealAmount: number;
};

/** 이름으로 단지 검색 (현재 선택된 지역에 상관없이 전체 수집 범위에서 검색) */
export async function searchApartments(query: string): Promise<ApartmentSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 1) return [];

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("search_apartments", {
    p_query: trimmed,
    p_limit: 20,
  });
  if (error) throw new Error(error.message);

  return (
    (data as {
      region_code: string;
      city: string;
      district: string;
      dong: string;
      apt_name: string;
      cnt: number;
      latest_deal_date: string;
      latest_deal_amount: number;
    }[]) ?? []
  ).map((r) => ({
    regionCode: r.region_code,
    city: r.city,
    district: r.district,
    dong: r.dong,
    aptName: r.apt_name,
    count: r.cnt,
    latestDealDate: r.latest_deal_date,
    latestDealAmount: r.latest_deal_amount,
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
