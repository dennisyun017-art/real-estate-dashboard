import type { YearlySummary } from "@/lib/queries";

function formatEok(manwon: number): string {
  return `${(manwon / 10000).toFixed(1)}억`;
}

export default function YearlySummaryTable({ items }: { items: YearlySummary[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400">데이터가 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs text-gray-400">
            <th className="py-1.5 pr-4">연도</th>
            <th className="py-1.5 pr-4 text-right">거래건수</th>
            <th className="py-1.5 pr-4 text-right">평균 평당가</th>
            <th className="py-1.5 pr-4 text-right">전년대비</th>
            <th className="py-1.5 pr-4 text-right">최고가 거래</th>
          </tr>
        </thead>
        <tbody>
          {[...items].reverse().map((y) => (
            <tr key={y.year} className="border-b border-gray-100">
              <td className="py-1.5 pr-4 font-medium text-gray-800">{y.year}</td>
              <td className="py-1.5 pr-4 text-right text-gray-500">
                {y.count.toLocaleString()}건
              </td>
              <td className="py-1.5 pr-4 text-right text-gray-800">
                {(y.avgPricePerPyeong / 10000).toFixed(1)}억/평
              </td>
              <td className="py-1.5 pr-4 text-right">
                {y.changePct === null ? (
                  <span className="text-gray-300">-</span>
                ) : (
                  <span className={y.changePct >= 0 ? "text-red-500" : "text-blue-500"}>
                    {y.changePct >= 0 ? "▲" : "▼"} {Math.abs(y.changePct)}%
                  </span>
                )}
              </td>
              <td className="py-1.5 pr-4 text-right text-gray-500">
                {formatEok(y.maxDealAmount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
