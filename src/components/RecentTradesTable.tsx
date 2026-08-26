"use client";

import { useMemo, useState } from "react";
import FavoriteStar from "@/components/FavoriteStar";
import type { RegionTradeDetail } from "@/lib/queries";

const PYEONG = 3.3058;

function formatEok(manwon: number): string {
  return `${(manwon / 10000).toFixed(1)}억`;
}

function toPyeong(area: number): string {
  return `${Math.round(area / PYEONG)}평`;
}

export default function RecentTradesTable({
  trades,
  regionCode,
  city,
  district,
  favoriteKeys,
}: {
  trades: RegionTradeDetail[];
  regionCode: string;
  city: string;
  district: string;
  favoriteKeys: string[];
}) {
  const [query, setQuery] = useState("");
  const [onlyNewHigh, setOnlyNewHigh] = useState(false);
  const favSet = useMemo(() => new Set(favoriteKeys), [favoriteKeys]);

  const filtered = trades.filter((t) => {
    if (onlyNewHigh && !t.is_new_high) return false;
    if (query.trim() === "") return true;
    const q = query.trim();
    return t.apt_name.includes(q) || t.dong.includes(q);
  });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="단지명·동 검색"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={onlyNewHigh}
            onChange={(e) => setOnlyNewHigh(e.target.checked)}
          />
          신고가만
        </label>
        <span className="text-xs text-gray-400">{filtered.length}건</span>
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">
          데이터가 없습니다.
        </p>
      ) : (
        <>
          {/* 모바일: 카드 목록 (컬럼이 많아 테이블은 가로로 좁은 화면에 부적합) */}
          <div className="flex flex-col gap-2 sm:hidden">
            {filtered.map((t, i) => (
              <div
                key={i}
                className={`rounded-lg border border-gray-200 p-3 ${
                  t.cancel_date ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-800">
                      {t.apt_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {t.dong} · {toPyeong(t.exclusive_area)} ({t.exclusive_area}m²) ·{" "}
                      {t.floor ?? "-"}층
                    </p>
                  </div>
                  <FavoriteStar
                    regionCode={regionCode}
                    city={city}
                    district={district}
                    dong={t.dong}
                    aptName={t.apt_name}
                    initiallyFavorited={favSet.has(
                      `${regionCode}|${t.dong}|${t.apt_name}`
                    )}
                  />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-semibold text-gray-900">
                      {formatEok(t.deal_amount)}
                    </span>
                    {t.is_new_high && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                        신고가
                      </span>
                    )}
                    <span className="text-xs text-blue-600">
                      최고 {formatEok(t.historic_high)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{t.deal_date}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-400">
                  <span>{t.dealing_type ?? "-"}</span>
                  <span>·</span>
                  <span>{t.estate_agent_location ?? "-"}</span>
                  {t.cancel_date && (
                    <span className="text-red-500">해제 {t.cancel_date}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 데스크톱: 전체 컬럼 테이블 */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-400">
                  <th className="py-2 pr-2"></th>
                  <th className="py-2 pr-4">동</th>
                  <th className="py-2 pr-4">단지명</th>
                  <th className="py-2 pr-4">전용면적</th>
                  <th className="py-2 pr-4">평형</th>
                  <th className="py-2 pr-4">층</th>
                  <th className="py-2 pr-4 text-right">실거래가</th>
                  <th className="py-2 pr-4 text-right">최고가</th>
                  <th className="py-2 pr-4">계약일</th>
                  <th className="py-2 pr-4">해제</th>
                  <th className="py-2 pr-4">거래유형</th>
                  <th className="py-2 pr-4">중개소재지</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr
                    key={i}
                    className={`border-b border-gray-100 ${
                      t.cancel_date ? "opacity-50" : ""
                    }`}
                  >
                    <td className="py-2 pr-2">
                      <FavoriteStar
                        regionCode={regionCode}
                        city={city}
                        district={district}
                        dong={t.dong}
                        aptName={t.apt_name}
                        initiallyFavorited={favSet.has(
                          `${regionCode}|${t.dong}|${t.apt_name}`
                        )}
                      />
                    </td>
                    <td className="py-2 pr-4 text-gray-500">{t.dong}</td>
                    <td className="py-2 pr-4 font-medium text-gray-800">
                      {t.apt_name}
                    </td>
                    <td className="py-2 pr-4 text-gray-500">
                      {t.exclusive_area}m²
                    </td>
                    <td className="py-2 pr-4 text-gray-500">
                      {toPyeong(t.exclusive_area)}
                    </td>
                    <td className="py-2 pr-4 text-gray-500">{t.floor ?? "-"}</td>
                    <td className="py-2 pr-4 text-right font-semibold text-gray-900">
                      {formatEok(t.deal_amount)}
                      {t.is_new_high && (
                        <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                          신고가
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-right text-blue-600">
                      {formatEok(t.historic_high)}
                    </td>
                    <td className="py-2 pr-4 text-gray-500">{t.deal_date}</td>
                    <td className="py-2 pr-4">
                      {t.cancel_date ? (
                        <span className="text-red-500">해제 {t.cancel_date}</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-gray-500">
                      {t.dealing_type ?? "-"}
                    </td>
                    <td className="py-2 pr-4 text-gray-500">
                      {t.estate_agent_location ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
