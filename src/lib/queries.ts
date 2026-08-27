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
  building_no: string | null;
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
    query?: string; // 단지명·동 검색어 (전체 데이터 대상)
    minArea?: number; // 전용면적(m²) 하한
    maxArea?: number; // 전용면적(m²) 상한 (미만)
    excludeDirect?: boolean; // 직거래 제외 (가족간 거래 등으로 시세 왜곡 방지)
  } = {}
): Promise<RegionTradesPage> {
  const { page = 1, pageSize = 50, startDate, endDate, query, minArea, maxArea, excludeDirect } =
    opts;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("region_recent_trades_detailed", {
    p_region: regionCode,
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
    p_start_date: startDate ?? null,
    p_end_date: endDate ?? null,
    p_query: query ?? null,
    p_min_area: minArea ?? null,
    p_max_area: maxArea ?? null,
    p_exclude_direct: excludeDirect ?? false,
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
  endDate?: string,
  searchQuery?: string,
  minArea?: number,
  maxArea?: number,
  excludeDirect?: boolean
): Promise<RegionTradeDetail[]> {
  const supabase = getSupabaseAdmin();
  const CHUNK = 1000;
  let offset = 0;
  const all: RegionTradeDetail[] = [];

  for (;;) {
    let q = supabase
      .from("apt_trades")
      .select(
        "apt_name, dong, exclusive_area, floor, build_year, deal_date, deal_amount, cancel_date, dealing_type, estate_agent_location, building_no"
      )
      .eq("region_code", regionCode)
      .order("deal_date", { ascending: false })
      .range(offset, offset + CHUNK - 1);
    if (startDate) q = q.gte("deal_date", startDate);
    if (endDate) q = q.lte("deal_date", endDate);
    if (minArea !== undefined) q = q.gte("exclusive_area", minArea);
    if (maxArea !== undefined) q = q.lt("exclusive_area", maxArea);
    if (searchQuery) {
      const escaped = searchQuery.replace(/[%,]/g, "");
      q = q.or(`apt_name.ilike.%${escaped}%,dong.ilike.%${escaped}%`);
    }
    // .neq()는 NULL 행까지 걸러버리므로, null이거나 직거래가 아닌 행만 남기도록 or로 처리
    if (excludeDirect) q = q.or("dealing_type.is.null,dealing_type.neq.직거래");

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
    });
  // 거래량이 너무 적으면 변동률이 튀는 노이즈일 뿐이라 TOP5 랭킹에서는 제외하지만,
  // 사용자가 직접 즐겨찾기한 지역은 걸러지면 안 되므로 필터링은 화면(컴포넌트)에서 처리합니다.
}

export type FavoriteRegion = {
  id: number;
  region_code: string;
  city: string;
  district: string;
  created_at: string;
};

export async function getFavoriteRegions(): Promise<FavoriteRegion[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("favorite_regions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as FavoriteRegion[]) ?? [];
}

export async function addFavoriteRegion(input: {
  regionCode: string;
  city: string;
  district: string;
}) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("favorite_regions").upsert(
    { region_code: input.regionCode, city: input.city, district: input.district },
    { onConflict: "region_code", ignoreDuplicates: true }
  );
  if (error) throw new Error(error.message);
}

export async function removeFavoriteRegion(regionCode: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("favorite_regions")
    .delete()
    .eq("region_code", regionCode);
  if (error) throw new Error(error.message);
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

export type DongRanking = {
  dong: string;
  count: number;
  avgPricePerPyeong: number;
};

/** 최근 N개월 동안 이 지역 안에서 거래량이 가장 많았던 동(법정동) 순위 */
export async function getRegionDongRanking(
  regionCode: string,
  months = 3,
  limit = 5
): Promise<DongRanking[]> {
  const supabase = getSupabaseAdmin();
  const { start } = monthRange(months - 1);
  const { data, error } = await supabase.rpc("region_dong_ranking", {
    p_region: regionCode,
    p_start: toISODate(start),
    p_limit: limit,
  });
  if (error) throw new Error(error.message);

  return ((data as { dong: string; cnt: number; avg_price_per_pyeong: number }[]) ?? []).map(
    (r) => ({
      dong: r.dong,
      count: r.cnt,
      avgPricePerPyeong: Math.round(r.avg_price_per_pyeong),
    })
  );
}

export type PeriodSummary = {
  period: string; // 연도("2026") 또는 월("2026-08")
  count: number;
  avgPricePerPyeong: number;
  maxDealAmount: number;
  changePct: number | null; // 이전 기간 대비
};

/** 연도별 거래건수·평균 평당가·최고가·전년대비 변동률 */
export async function getRegionYearlySummary(regionCode: string): Promise<PeriodSummary[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("region_yearly_summary", {
    p_region: regionCode,
  });
  if (error) throw new Error(error.message);

  const rows =
    (data as { year: string; cnt: number; avg_price_per_pyeong: number; max_deal_amount: number }[]) ??
    [];

  return rows.map((r, i) => {
    const prev = rows[i - 1];
    const changePct =
      prev && prev.avg_price_per_pyeong > 0
        ? ((r.avg_price_per_pyeong - prev.avg_price_per_pyeong) / prev.avg_price_per_pyeong) * 100
        : null;
    return {
      period: r.year,
      count: r.cnt,
      avgPricePerPyeong: Math.round(r.avg_price_per_pyeong),
      maxDealAmount: r.max_deal_amount,
      changePct: changePct !== null ? Math.round(changePct * 10) / 10 : null,
    };
  });
}

/** 월별 거래건수·평균 평당가·최고가·전월대비 변동률 (최근 N개월) */
export async function getRegionMonthlySummary(
  regionCode: string,
  months = 24
): Promise<PeriodSummary[]> {
  const supabase = getSupabaseAdmin();
  const { start } = monthRange(months - 1);
  const { data, error } = await supabase.rpc("region_monthly_summary", {
    p_region: regionCode,
    p_start: toISODate(start),
  });
  if (error) throw new Error(error.message);

  const rows =
    (data as { period: string; cnt: number; avg_price_per_pyeong: number; max_deal_amount: number }[]) ??
    [];

  return rows.map((r, i) => {
    const prev = rows[i - 1];
    const changePct =
      prev && prev.avg_price_per_pyeong > 0
        ? ((r.avg_price_per_pyeong - prev.avg_price_per_pyeong) / prev.avg_price_per_pyeong) * 100
        : null;
    return {
      period: r.period,
      count: r.cnt,
      avgPricePerPyeong: Math.round(r.avg_price_per_pyeong),
      maxDealAmount: r.max_deal_amount,
      changePct: changePct !== null ? Math.round(changePct * 10) / 10 : null,
    };
  });
}

export type PyeongSummary = {
  pyeongBucket: string;
  count: number;
  avgPricePerPyeong: number;
};

/** 지역 내 평형대별(10평 이하 ~ 50평 이상) 평균 평당가 비교 (최근 N개월) */
export async function getRegionPyeongSummary(
  regionCode: string,
  months = 6
): Promise<PyeongSummary[]> {
  const supabase = getSupabaseAdmin();
  const { start } = monthRange(months - 1);
  const { data, error } = await supabase.rpc("region_pyeong_summary", {
    p_region: regionCode,
    p_start: toISODate(start),
  });
  if (error) throw new Error(error.message);

  return (
    (data as { pyeong_bucket: string; cnt: number; avg_price_per_pyeong: number }[]) ?? []
  ).map((r) => ({
    pyeongBucket: r.pyeong_bucket,
    count: r.cnt,
    avgPricePerPyeong: Math.round(r.avg_price_per_pyeong),
  }));
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
  sort_order: number | null;
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
  // sort_order가 설정된(=사용자가 한 번이라도 드래그로 정렬한) 항목은 그 순서를 따르고,
  // 아직 안 정해진 항목(null)은 지역(시/구)별로 묶어서 자연스럽게 기본 정렬됩니다.
  const { data: favorites, error } = await supabase
    .from("favorites")
    .select("*")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("city", { ascending: true })
    .order("district", { ascending: true })
    .order("apt_name", { ascending: true });
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

/** 드래그로 정한 새 순서를 저장합니다. orderedIds는 화면에 보이는 순서 그대로. */
export async function reorderFavorites(orderedIds: number[]) {
  const supabase = getSupabaseAdmin();
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("favorites").update({ sort_order: index }).eq("id", id)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
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

export type ApartmentTrade = {
  deal_date: string;
  deal_amount: number;
  exclusive_area: number;
  floor: number | null;
  cancel_date: string | null;
  dealing_type: string | null;
  building_no: string | null;
};

export type ApartmentHistory = {
  trades: ApartmentTrade[];
  trend: { month: string; avgPricePerPyeong: number; count: number }[];
};

/** 특정 단지(지역+동+단지명)의 전체 과거 거래 이력 + 월별 평당가 추이 */
export async function getApartmentHistory(
  regionCode: string,
  dong: string,
  aptName: string
): Promise<ApartmentHistory> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("apt_trades")
    .select("deal_date, deal_amount, exclusive_area, floor, cancel_date, dealing_type, building_no")
    .eq("region_code", regionCode)
    .eq("dong", dong)
    .eq("apt_name", aptName)
    .order("deal_date", { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);

  const trades = (data as ApartmentTrade[]) ?? [];

  const buckets = new Map<string, { total: number; count: number }>();
  for (const t of trades) {
    const ym = t.deal_date.slice(0, 7);
    const pricePerPyeong = t.deal_amount / (t.exclusive_area / PYEONG);
    const b = buckets.get(ym) ?? { total: 0, count: 0 };
    b.total += pricePerPyeong;
    b.count += 1;
    buckets.set(ym, b);
  }
  const trend = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, b]) => ({
      month,
      avgPricePerPyeong: Math.round(b.total / b.count),
      count: b.count,
    }));

  return { trades, trend };
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
