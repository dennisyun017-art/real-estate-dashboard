"use client";

import { useState } from "react";
import type { PeriodSummary } from "@/lib/queries";

function formatEok(manwon: number): string {
  return `${(manwon / 10000).toFixed(1)}억`;
}

function Table({ items, periodLabel }: { items: PeriodSummary[]; periodLabel: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400">데이터가 없습니다.</p>;
  }

  return (
    <div className="max-h-72 overflow-y-auto overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-gray-200 text-xs text-gray-400">
            <th className="py-1.5 pr-4">{periodLabel}</th>
            <th className="py-1.5 pr-4 text-right">거래건수</th>
            <th className="py-1.5 pr-4 text-right">평균 평당가</th>
            <th className="py-1.5 pr-4 text-right">이전대비</th>
            <th className="py-1.5 pr-4 text-right">최고가 거래</th>
          </tr>
        </thead>
        <tbody>
          {[...items].reverse().map((p) => (
            <tr key={p.period} className="border-b border-gray-100">
              <td className="py-1.5 pr-4 font-medium text-gray-800">{p.period}</td>
              <td className="py-1.5 pr-4 text-right text-gray-500">
                {p.count.toLocaleString()}건
              </td>
              <td className="py-1.5 pr-4 text-right text-gray-800">
                {(p.avgPricePerPyeong / 10000).toFixed(1)}억/평
              </td>
              <td className="py-1.5 pr-4 text-right">
                {p.changePct === null ? (
                  <span className="text-gray-300">-</span>
                ) : (
                  <span className={p.changePct >= 0 ? "text-red-500" : "text-blue-500"}>
                    {p.changePct >= 0 ? "▲" : "▼"} {Math.abs(p.changePct)}%
                  </span>
                )}
              </td>
              <td className="py-1.5 pr-4 text-right text-gray-500">
                {formatEok(p.maxDealAmount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PeriodSummaryTable({
  yearly,
  monthly,
}: {
  yearly: PeriodSummary[];
  monthly: PeriodSummary[];
}) {
  const [tab, setTab] = useState<"year" | "month">("year");

  return (
    <div>
      <div className="mb-2 flex gap-1.5">
        <button
          onClick={() => setTab("year")}
          className={`rounded-full px-2.5 py-1 text-xs ${
            tab === "year" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          연도별
        </button>
        <button
          onClick={() => setTab("month")}
          className={`rounded-full px-2.5 py-1 text-xs ${
            tab === "month" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          월별
        </button>
      </div>
      {tab === "year" ? (
        <Table items={yearly} periodLabel="연도" />
      ) : (
        <Table items={monthly} periodLabel="월" />
      )}
    </div>
  );
}
