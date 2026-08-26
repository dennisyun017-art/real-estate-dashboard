"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FavoriteStar from "@/components/FavoriteStar";
import type { RegionTradeDetail } from "@/lib/queries";
import { buildPageList } from "@/lib/pagination";
import ApartmentHistoryModal from "@/components/ApartmentHistoryModal";

const PYEONG = 3.3058;

function formatEok(manwon: number): string {
  return `${(manwon / 10000).toFixed(1)}억`;
}

function toPyeong(area: number): string {
  return `${Math.round(area / PYEONG)}평`;
}

function yearOf(dateStr: string): string {
  return dateStr.slice(0, 4);
}

export default function RecentTradesTable({
  trades,
  totalCount,
  page,
  pageSize,
  startDate,
  endDate,
  regionCode,
  city,
  district,
  favoriteKeys,
}: {
  trades: RegionTradeDetail[];
  totalCount: number;
  page: number;
  pageSize: number;
  startDate?: string;
  endDate?: string;
  regionCode: string;
  city: string;
  district: string;
  favoriteKeys: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [onlyNewHigh, setOnlyNewHigh] = useState(false);
  const [localStart, setLocalStart] = useState(startDate ?? "");
  const [localEnd, setLocalEnd] = useState(endDate ?? "");
  const [historyTarget, setHistoryTarget] = useState<{ dong: string; aptName: string } | null>(
    null
  );
  const favSet = useMemo(() => new Set(favoriteKeys), [favoriteKeys]);

  function pushParams(next: Record<string, string | undefined>) {
    const p = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) p.set(key, value);
      else p.delete(key);
    }
    router.push(`/?${p.toString()}`);
  }

  function applyDateRange() {
    pushParams({ start: localStart || undefined, end: localEnd || undefined, page: undefined });
  }

  function resetDateRange() {
    setLocalStart("");
    setLocalEnd("");
    pushParams({ start: undefined, end: undefined, page: undefined });
  }

  function goToPage(p: number) {
    pushParams({ page: p === 1 ? undefined : String(p) });
  }

  const filtered = trades.filter((t) => {
    if (onlyNewHigh && !t.is_new_high) return false;
    if (query.trim() === "") return true;
    const q = query.trim();
    return t.apt_name.includes(q) || t.dong.includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div>
      {/* 조회 기간 검색 */}
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="flex flex-col">
          <label className="text-xs text-gray-400">시작일</label>
          <input
            type="date"
            value={localStart}
            onChange={(e) => setLocalStart(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-400">종료일</label>
          <input
            type="date"
            value={localEnd}
            onChange={(e) => setLocalEnd(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <button
          onClick={applyDateRange}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          조회
        </button>
        {(startDate || endDate) && (
          <button
            onClick={resetDateRange}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50"
          >
            전체기간
          </button>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="현재 페이지 안에서 단지명·동 검색"
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
        <span className="text-xs text-gray-400">
          전체 {totalCount.toLocaleString()}건 중 {filtered.length}건 표시
        </span>
        <a
          href={`/api/export?region=${regionCode}${startDate ? `&start=${startDate}` : ""}${
            endDate ? `&end=${endDate}` : ""
          }`}
          className="ml-auto rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
        >
          ⬇ CSV 내보내기 (현재 조회기간 전체)
        </a>
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">
          데이터가 없습니다.
        </p>
      ) : (
        <>
          {/* 모바일: 연도별 그룹 카드 목록 */}
          <div className="flex flex-col gap-2 sm:hidden">
            {filtered.map((t, i) => {
              const showYearHeader = i === 0 || yearOf(t.deal_date) !== yearOf(filtered[i - 1].deal_date);
              return (
                <div key={i}>
                  {showYearHeader && (
                    <p className="mb-1 mt-3 text-xs font-semibold text-gray-400 first:mt-0">
                      {yearOf(t.deal_date)}년
                    </p>
                  )}
                  <div
                    className={`rounded-lg border border-gray-200 p-3 ${
                      t.cancel_date ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <button
                          onClick={() => setHistoryTarget({ dong: t.dong, aptName: t.apt_name })}
                          className="truncate text-left font-medium text-gray-800 hover:underline"
                        >
                          {t.apt_name}
                        </button>
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
                </div>
              );
            })}
          </div>

          {/* 데스크톱: 연도별 구분선이 있는 전체 컬럼 테이블 */}
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
                {filtered.map((t, i) => {
                  const showYearHeader =
                    i === 0 || yearOf(t.deal_date) !== yearOf(filtered[i - 1].deal_date);
                  return (
                    <FragmentRow
                      key={i}
                      trade={t}
                      showYearHeader={showYearHeader}
                      regionCode={regionCode}
                      city={city}
                      district={district}
                      isFavorited={favSet.has(`${regionCode}|${t.dong}|${t.apt_name}`)}
                      onSelectApt={() =>
                        setHistoryTarget({ dong: t.dong, aptName: t.apt_name })
                      }
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-sm">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-gray-600 disabled:opacity-30"
          >
            이전
          </button>
          {buildPageList(page, totalPages).map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="px-1 text-gray-300">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => goToPage(p)}
                className={`min-w-[2.25rem] rounded-lg px-2.5 py-1.5 ${
                  p === page
                    ? "bg-blue-600 font-medium text-white"
                    : "border border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-gray-600 disabled:opacity-30"
          >
            다음
          </button>
        </div>
      )}

      {historyTarget && (
        <ApartmentHistoryModal
          regionCode={regionCode}
          dong={historyTarget.dong}
          aptName={historyTarget.aptName}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  );
}

function FragmentRow({
  trade: t,
  showYearHeader,
  regionCode,
  city,
  district,
  isFavorited,
  onSelectApt,
}: {
  trade: RegionTradeDetail;
  showYearHeader: boolean;
  regionCode: string;
  city: string;
  district: string;
  isFavorited: boolean;
  onSelectApt: () => void;
}) {
  return (
    <>
      {showYearHeader && (
        <tr>
          <td colSpan={12} className="bg-gray-50 py-1.5 pl-1 text-xs font-semibold text-gray-400">
            {yearOf(t.deal_date)}년
          </td>
        </tr>
      )}
      <tr className={`border-b border-gray-100 ${t.cancel_date ? "opacity-50" : ""}`}>
        <td className="py-2 pr-2">
          <FavoriteStar
            regionCode={regionCode}
            city={city}
            district={district}
            dong={t.dong}
            aptName={t.apt_name}
            initiallyFavorited={isFavorited}
          />
        </td>
        <td className="py-2 pr-4 text-gray-500">{t.dong}</td>
        <td className="py-2 pr-4 font-medium text-gray-800">
          <button onClick={onSelectApt} className="text-left hover:underline">
            {t.apt_name}
          </button>
        </td>
        <td className="py-2 pr-4 text-gray-500">{t.exclusive_area}m²</td>
        <td className="py-2 pr-4 text-gray-500">{toPyeong(t.exclusive_area)}</td>
        <td className="py-2 pr-4 text-gray-500">{t.floor ?? "-"}</td>
        <td className="py-2 pr-4 text-right font-semibold text-gray-900">
          {formatEok(t.deal_amount)}
          {t.is_new_high && (
            <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
              신고가
            </span>
          )}
        </td>
        <td className="py-2 pr-4 text-right text-blue-600">{formatEok(t.historic_high)}</td>
        <td className="py-2 pr-4 text-gray-500">{t.deal_date}</td>
        <td className="py-2 pr-4">
          {t.cancel_date ? (
            <span className="text-red-500">해제 {t.cancel_date}</span>
          ) : (
            <span className="text-gray-300">-</span>
          )}
        </td>
        <td className="py-2 pr-4 text-gray-500">{t.dealing_type ?? "-"}</td>
        <td className="py-2 pr-4 text-gray-500">{t.estate_agent_location ?? "-"}</td>
      </tr>
    </>
  );
}
