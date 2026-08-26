"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export type TrendPoint = {
  month: string;
  avgPricePerPyeong: number;
  count: number;
};

export default function TrendChart({
  data,
  height = 280,
  compact = false,
}: {
  data: TrendPoint[];
  height?: number;
  compact?: boolean;
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-400">아직 표시할 데이터가 없습니다.</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={
          compact
            ? { top: 4, right: 4, left: 4, bottom: 0 }
            : { top: 10, right: 20, left: 0, bottom: 0 }
        }
      >
        {!compact && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
        <XAxis
          dataKey="month"
          tick={compact ? false : { fontSize: 12 }}
          hide={compact}
        />
        <YAxis
          tick={compact ? false : { fontSize: 12 }}
          tickFormatter={(v) => `${(v / 1000).toFixed(1)}억`}
          width={compact ? 0 : 60}
          hide={compact}
          domain={compact ? ["auto", "auto"] : undefined}
        />
        <Tooltip
          formatter={(value) => [`${Number(value).toLocaleString()}만원/평`, "평당가"]}
        />
        <Line
          type="monotone"
          dataKey="avgPricePerPyeong"
          stroke="#2563eb"
          strokeWidth={2}
          dot={compact ? false : { r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
