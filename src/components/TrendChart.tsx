"use client";

import {
  ComposedChart,
  Line,
  Bar,
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
  showVolume = false,
}: {
  data: TrendPoint[];
  height?: number;
  compact?: boolean;
  /** 월별 거래건수를 막대로 함께 표시 (해당 달 평균의 신뢰도를 가늠하는 용도) */
  showVolume?: boolean;
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-400">아직 표시할 데이터가 없습니다.</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={data}
        margin={
          compact
            ? { top: 4, right: 4, left: 4, bottom: 0 }
            : { top: 10, right: showVolume ? 40 : 20, left: 0, bottom: 0 }
        }
      >
        {!compact && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
        <XAxis
          dataKey="month"
          tick={compact ? false : { fontSize: 12 }}
          hide={compact}
        />
        <YAxis
          yAxisId="price"
          tick={compact ? false : { fontSize: 12 }}
          tickFormatter={(v) => `${(v / 1000).toFixed(1)}억`}
          width={compact ? 0 : 60}
          hide={compact}
          domain={compact ? ["auto", "auto"] : undefined}
        />
        {showVolume && !compact && (
          <YAxis
            yAxisId="count"
            orientation="right"
            tick={{ fontSize: 12 }}
            width={32}
            allowDecimals={false}
          />
        )}
        <Tooltip
          formatter={(value, name) =>
            name === "count"
              ? [`${value}건`, "거래건수"]
              : [`${Number(value).toLocaleString()}만원/평`, "평당가"]
          }
        />
        {showVolume && (
          <Bar
            yAxisId="count"
            dataKey="count"
            fill="#bfdbfe"
            radius={[2, 2, 0, 0]}
            barSize={compact ? 4 : 16}
          />
        )}
        <Line
          yAxisId="price"
          type="monotone"
          dataKey="avgPricePerPyeong"
          stroke="#2563eb"
          strokeWidth={2}
          dot={compact ? false : { r: 3 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
