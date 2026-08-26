import Link from "next/link";
import type { RegionRanking } from "@/lib/queries";

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

export default function RegionRankings({ rankings }: { rankings: RegionRanking[] }) {
  const sorted = [...rankings].sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0));
  const gainers = sorted.slice(0, 5);
  const losers = sorted.slice(-5).reverse();

  if (rankings.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-400">
        전월 대비 비교할 데이터가 아직 부족합니다.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
