import Link from "next/link";
import type { FavoriteRegion, RegionRanking } from "@/lib/queries";
import MyRegionWatchlist from "@/components/MyRegionWatchlist";

function formatEok(manwon: number): string {
  return `${(manwon / 10000).toFixed(1)}억`;
}

function RankingList({ items }: { items: RegionRanking[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400">데이터가 부족합니다.</p>;
  }
  return (
    <ol className="space-y-1.5">
      {items.map((r, i) => (
        <li key={r.regionCode}>
          <Link
            href={`/?region=${r.regionCode}`}
            className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50"
          >
            <span className="text-gray-700">
              <span className="mr-2 text-xs text-gray-400">{i + 1}</span>
              {r.city} {r.district}
            </span>
            <span className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{formatEok(r.avgPricePerPyeong)}/평</span>
              <span
                className={`font-medium ${
                  (r.changePct ?? 0) >= 0 ? "text-red-500" : "text-blue-500"
                }`}
              >
                {(r.changePct ?? 0) >= 0 ? "▲" : "▼"} {Math.abs(r.changePct ?? 0)}%
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export default function RegionRankings({
  rankings,
  favoriteRegions,
}: {
  rankings: RegionRanking[];
  favoriteRegions: FavoriteRegion[];
}) {
  // 거래량이 너무 적으면 변동률이 튀는 노이즈일 뿐이라 TOP5 순위에서는 제외
  const rankable = rankings.filter((r) => r.count >= 3 && r.changePct !== null);
  const sorted = [...rankable].sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0));
  const gainers = sorted.slice(0, 5);
  const losers = sorted.slice(-5).reverse();

  const rankingMap = new Map(rankings.map((r) => [r.regionCode, r]));
  const watchedItems = favoriteRegions.map((fr) => {
    const r = rankingMap.get(fr.region_code);
    return {
      regionCode: fr.region_code,
      city: fr.city,
      district: fr.district,
      avgPricePerPyeong: r?.avgPricePerPyeong ?? null,
      changePct: r?.changePct ?? null,
    };
  });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-xs font-medium text-gray-400">⭐ 내 관심 지역</h3>
        <MyRegionWatchlist items={watchedItems} />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-xs font-medium text-gray-400">📈 상승 TOP 5</h3>
        <RankingList items={gainers} />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-xs font-medium text-gray-400">📉 하락 TOP 5</h3>
        <RankingList items={losers} />
      </div>
    </div>
  );
}
