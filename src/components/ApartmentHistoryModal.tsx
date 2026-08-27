"use client";

import { useEffect, useMemo, useState } from "react";
import TrendChart, { type TrendPoint } from "@/components/TrendChart";
import type { ApartmentHistory } from "@/lib/queries";

const PYEONG = 3.3058;

function formatEok(manwon: number): string {
  return `${(manwon / 10000).toFixed(1)}억`;
}

function toPyeong(area: number): number {
  return Math.round(area / PYEONG);
}

function formatPricePerPyeong(dealAmount: number, exclusiveArea: number): string {
  const pricePerPyeong = dealAmount / (exclusiveArea / PYEONG);
  return `${Math.round(pricePerPyeong).toLocaleString()}만원/평`;
}

/** 선택된(또는 전체) 거래 목록으로 월별 평균 평당가 추이를 다시 계산 */
function computeTrend(
  trades: { deal_date: string; deal_amount: number; exclusive_area: number }[]
): TrendPoint[] {
  const buckets = new Map<string, { total: number; count: number }>();
  for (const t of trades) {
    const month = t.deal_date.slice(0, 7);
    const pricePerPyeong = t.deal_amount / (t.exclusive_area / PYEONG);
    const b = buckets.get(month) ?? { total: 0, count: 0 };
    b.total += pricePerPyeong;
    b.count += 1;
    buckets.set(month, b);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, b]) => ({
      month,
      avgPricePerPyeong: Math.round(b.total / b.count),
      count: b.count,
    }));
}

export default function ApartmentHistoryModal({
  regionCode,
  dong,
  aptName,
  onClose,
}: {
  regionCode: string;
  dong: string;
  aptName: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<ApartmentHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [areaFilter, setAreaFilter] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(
      `/api/apartment-history?region=${encodeURIComponent(regionCode)}&dong=${encodeURIComponent(
        dong
      )}&aptName=${encodeURIComponent(aptName)}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setAreaFilter(null);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [regionCode, dong, aptName]);

  // 이 단지에 존재하는 평형 목록(거래 많은 순) — 전용면적이 조금씩 달라도
  // 같은 평형으로 반올림되면 하나로 묶습니다.
  const pyeongOptions = useMemo(() => {
    if (!data) return [];
    const counts = new Map<number, number>();
    for (const t of data.trades) {
      const p = toPyeong(t.exclusive_area);
      counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([pyeong, count]) => ({ pyeong, count }));
  }, [data]);

  const filteredTrades = useMemo(() => {
    if (!data) return [];
    if (areaFilter === null) return data.trades;
    return data.trades.filter((t) => toPyeong(t.exclusive_area) === areaFilter);
  }, [data, areaFilter]);

  const trend = useMemo(() => computeTrend(filteredTrades), [filteredTrades]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{aptName}</h3>
            <p className="text-xs text-gray-400">{dong}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-gray-400">불러오는 중...</p>
        ) : !data || data.trades.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            거래 이력이 없습니다.
          </p>
        ) : (
          <>
            {pyeongOptions.length > 1 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                <button
                  onClick={() => setAreaFilter(null)}
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    areaFilter === null
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  전체
                </button>
                {pyeongOptions.map(({ pyeong, count }) => (
                  <button
                    key={pyeong}
                    onClick={() => setAreaFilter(pyeong)}
                    className={`rounded-full px-2.5 py-1 text-xs ${
                      areaFilter === pyeong
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {pyeong}평 ({count})
                  </button>
                ))}
              </div>
            )}

            <h4 className="mb-1 text-xs font-medium text-gray-400">
              {areaFilter !== null ? `${areaFilter}평 ` : ""}
              평당가 추이 ({trend.length}개월, 막대는 거래건수)
            </h4>
            <TrendChart data={trend} height={200} showVolume />

            <h4 className="mb-2 mt-5 text-xs font-medium text-gray-400">
              {areaFilter !== null ? `${areaFilter}평 ` : "전체 "}
              거래 이력 ({filteredTrades.length}건)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-400">
                    <th className="py-1.5 pr-3">계약일</th>
                    <th className="py-1.5 pr-3">건물동</th>
                    <th className="py-1.5 pr-3">전용면적</th>
                    <th className="py-1.5 pr-3">층</th>
                    <th className="py-1.5 pr-3 text-right">거래금액</th>
                    <th className="py-1.5 pr-3 text-right">평단가</th>
                    <th className="py-1.5 pr-3">거래유형</th>
                    <th className="py-1.5 pr-3">해제</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map((t, i) => (
                    <tr
                      key={i}
                      className={`border-b border-gray-100 ${
                        t.cancel_date ? "opacity-50" : ""
                      }`}
                    >
                      <td className="py-1.5 pr-3 text-gray-500">{t.deal_date}</td>
                      <td className="py-1.5 pr-3 text-gray-500">
                        {t.building_no ? `${t.building_no}동` : "-"}
                      </td>
                      <td className="py-1.5 pr-3 text-gray-500">{t.exclusive_area}m²</td>
                      <td className="py-1.5 pr-3 text-gray-500">{t.floor ?? "-"}</td>
                      <td className="py-1.5 pr-3 text-right font-medium text-gray-800">
                        {formatEok(t.deal_amount)}
                      </td>
                      <td className="py-1.5 pr-3 text-right text-blue-600">
                        {formatPricePerPyeong(t.deal_amount, t.exclusive_area)}
                      </td>
                      <td className="py-1.5 pr-3 text-gray-500">
                        {t.dealing_type ?? "-"}
                      </td>
                      <td className="py-1.5 pr-3">
                        {t.cancel_date ? (
                          <span className="text-red-500">{t.cancel_date}</span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
