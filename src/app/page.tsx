import { REGIONS } from "@/lib/regions";
import {
  getCitySummary,
  getRegionRecentTrades,
  getRegionMonthlyTrend,
  getLatestCollectRun,
  getAllRegionsSummary,
  getFavoritesWithLatest,
} from "@/lib/queries";
import RegionSelect from "@/components/RegionSelect";
import TrendChart from "@/components/TrendChart";
import LogoutButton from "@/components/LogoutButton";
import RegionMap from "@/components/RegionMapLoader";
import FavoritesList from "@/components/FavoritesList";
import SearchBox from "@/components/SearchBox";
import RecentTradesTable from "@/components/RecentTradesTable";

function formatEok(manwon: number): string {
  return `${(manwon / 10000).toFixed(1)}억`;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const selectedRegion =
    (typeof params.region === "string" ? params.region : undefined) ??
    REGIONS[0].code;

  const [citySummary, recentTrades, trend, lastRun, regionsSummary, favorites] =
    await Promise.all([
      getCitySummary(),
      getRegionRecentTrades(selectedRegion, 20),
      getRegionMonthlyTrend(selectedRegion, 6),
      getLatestCollectRun(),
      getAllRegionsSummary(),
      getFavoritesWithLatest(),
    ]);

  const regionInfo = REGIONS.find((r) => r.code === selectedRegion);
  const favoriteKeys = favorites.map(
    (f) => `${f.region_code}|${f.dong}|${f.apt_name}`
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold text-gray-900">
            🏠 부동산 실거래가 대시보드
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">
              마지막 갱신:{" "}
              {lastRun?.finished_at
                ? new Date(lastRun.finished_at).toLocaleString("ko-KR")
                : "아직 없음"}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        {/* 시/도별 요약 카드 */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-gray-500">
            시/도별 이번달 평균 평당가 (전월 대비)
          </h2>
          {citySummary.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-400">
              아직 수집된 데이터가 없습니다. /api/collect 를 한 번 실행해보세요.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {citySummary.map((c) => (
                <div
                  key={c.city}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <p className="text-sm text-gray-500">{c.city}</p>
                  <p className="mt-1 text-xl font-semibold text-gray-900">
                    {formatEok(c.avgPricePerPyeong)}
                    <span className="text-xs font-normal text-gray-400"> /평</span>
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className="text-gray-400">거래 {c.count}건</span>
                    {c.changePct !== null && (
                      <span
                        className={
                          c.changePct >= 0 ? "text-red-500" : "text-blue-500"
                        }
                      >
                        {c.changePct >= 0 ? "▲" : "▼"} {Math.abs(c.changePct)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 지도 시각화 */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-gray-500">
            지역별 지도 (원 크기 = 거래량, 색 = 평당가 — 클릭하면 아래 상세로 이동)
          </h2>
          <RegionMap summary={regionsSummary} selectedRegion={selectedRegion} />
        </section>

        {/* 관심 단지 즐겨찾기 */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-500">⭐ 관심 단지</h2>
          </div>
          <div className="mb-4">
            <SearchBox />
          </div>
          <FavoritesList favorites={favorites} />
        </section>

        {/* 지역 상세 */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-500">
              지역별 상세 —{" "}
              <span className="font-semibold text-gray-800">
                {regionInfo?.city} {regionInfo?.district}
              </span>
            </h2>
            <RegionSelect selected={selectedRegion} />
          </div>

          <h3 className="mb-2 text-xs font-medium text-gray-400">
            최근 6개월 평당가 추이
          </h3>
          <TrendChart data={trend} />

          <h3 className="mb-2 mt-6 text-xs font-medium text-gray-400">
            최근 거래 내역
          </h3>
          <RecentTradesTable
            trades={recentTrades}
            regionCode={selectedRegion}
            city={regionInfo?.city ?? ""}
            district={regionInfo?.district ?? ""}
            favoriteKeys={favoriteKeys}
          />
        </section>
      </main>
    </div>
  );
}
