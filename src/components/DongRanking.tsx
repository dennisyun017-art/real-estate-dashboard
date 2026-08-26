import type { DongRanking as DongRankingType } from "@/lib/queries";

function formatEok(manwon: number): string {
  return `${(manwon / 10000).toFixed(1)}억`;
}

export default function DongRanking({ items }: { items: DongRankingType[] }) {
  if (items.length === 0) {
    return <p className="text-xs text-gray-400">최근 거래 데이터가 부족합니다.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((d, i) => (
        <span
          key={d.dong}
          className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600"
        >
          <span className="font-medium text-gray-400">{i + 1}</span>
          <span className="font-medium text-gray-800">{d.dong}</span>
          <span className="text-gray-400">거래 {d.count}건</span>
          <span className="text-gray-400">· {formatEok(d.avgPricePerPyeong)}/평</span>
        </span>
      ))}
    </div>
  );
}
