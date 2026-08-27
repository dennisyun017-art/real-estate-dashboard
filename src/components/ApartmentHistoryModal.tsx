"use client";

import { useEffect, useState } from "react";
import TrendChart from "@/components/TrendChart";
import type { ApartmentHistory } from "@/lib/queries";

const PYEONG = 3.3058;

function formatEok(manwon: number): string {
  return `${(manwon / 10000).toFixed(1)}억`;
}

function formatPricePerPyeong(dealAmount: number, exclusiveArea: number): string {
  const pricePerPyeong = dealAmount / (exclusiveArea / PYEONG);
  return `${Math.round(pricePerPyeong).toLocaleString()}만원/평`;
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
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [regionCode, dong, aptName]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
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
            <h4 className="mb-1 text-xs font-medium text-gray-400">
              전체 기간 평당가 추이 ({data.trend.length}개월)
            </h4>
            <TrendChart data={data.trend} height={200} />

            <h4 className="mb-2 mt-5 text-xs font-medium text-gray-400">
              전체 거래 이력 ({data.trades.length}건)
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
                  {data.trades.map((t, i) => (
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
