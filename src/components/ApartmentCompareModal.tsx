"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ApartmentHistory } from "@/lib/queries";

const PYEONG = 3.3058;
const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#d97706"];

export type CompareTarget = {
  regionCode: string;
  dong: string;
  aptName: string;
  label: string; // 범례에 표시할 이름
};

function computeMonthlyTrend(
  trades: { deal_date: string; deal_amount: number; exclusive_area: number }[]
) {
  const buckets = new Map<string, { total: number; count: number }>();
  for (const t of trades) {
    const month = t.deal_date.slice(0, 7);
    const pricePerPyeong = t.deal_amount / (t.exclusive_area / PYEONG);
    const b = buckets.get(month) ?? { total: 0, count: 0 };
    b.total += pricePerPyeong;
    b.count += 1;
    buckets.set(month, b);
  }
  const map = new Map<string, number>();
  for (const [month, b] of buckets) {
    map.set(month, Math.round(b.total / b.count));
  }
  return map;
}

export default function ApartmentCompareModal({
  targets,
  onClose,
}: {
  targets: CompareTarget[];
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<Record<string, string | number>[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all(
      targets.map((t) =>
        fetch(
          `/api/apartment-history?region=${encodeURIComponent(
            t.regionCode
          )}&dong=${encodeURIComponent(t.dong)}&aptName=${encodeURIComponent(t.aptName)}`
        ).then((r) => r.json() as Promise<ApartmentHistory>)
      )
    ).then((results) => {
      if (cancelled) return;

      const trendMaps = results.map((r) => computeMonthlyTrend(r.trades));
      const allMonths = Array.from(new Set(trendMaps.flatMap((m) => Array.from(m.keys())))).sort();

      const merged = allMonths.map((month) => {
        const row: Record<string, string | number> = { month };
        targets.forEach((t, i) => {
          const v = trendMaps[i].get(month);
          if (v !== undefined) row[t.label] = v;
        });
        return row;
      });

      setChartData(merged);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [targets]);

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
            <h3 className="text-base font-semibold text-gray-900">단지 비교</h3>
            <p className="text-xs text-gray-400">평당가 추이를 겹쳐서 비교합니다</p>
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
        ) : chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">비교할 데이터가 없습니다.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}억`}
                width={60}
              />
              <Tooltip
                formatter={(value) => `${Number(value).toLocaleString()}만원/평`}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {targets.map((t, i) => (
                <Line
                  key={t.label}
                  type="monotone"
                  dataKey={t.label}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
