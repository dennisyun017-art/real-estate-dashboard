"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { PyeongSummary } from "@/lib/queries";

export default function PyeongSummaryChart({ items }: { items: PyeongSummary[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400">최근 거래 데이터가 부족합니다.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={items} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="pyeongBucket" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => `${(v / 10000).toFixed(1)}억`}
          width={50}
        />
        <Tooltip
          formatter={(value, name) =>
            name === "count"
              ? [`${value}건`, "거래건수"]
              : [`${Number(value).toLocaleString()}만원/평`, "평균 평당가"]
          }
        />
        <Bar dataKey="avgPricePerPyeong" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
