"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FavoriteWithLatest } from "@/lib/queries";
import TrendChart from "@/components/TrendChart";
import ApartmentHistoryModal from "@/components/ApartmentHistoryModal";
import ApartmentCompareModal, {
  type CompareTarget,
} from "@/components/ApartmentCompareModal";

function formatEok(manwon: number): string {
  return `${(manwon / 10000).toFixed(1)}억`;
}

function favKey(f: { region_code: string; dong: string; apt_name: string }): string {
  return `${f.region_code}|${f.dong}|${f.apt_name}`;
}

const MAX_COMPARE = 4;

export default function FavoritesList({
  favorites,
}: {
  favorites: FavoriteWithLatest[];
}) {
  const router = useRouter();
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [historyTarget, setHistoryTarget] = useState<{
    regionCode: string;
    dong: string;
    aptName: string;
  } | null>(null);
  const [compareKeys, setCompareKeys] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);

  async function onRemove(id: number) {
    setRemovingId(id);
    await fetch(`/api/favorites/${id}`, { method: "DELETE" });
    setRemovingId(null);
    router.refresh();
  }

  function toggleCompare(key: string) {
    setCompareKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else if (next.size < MAX_COMPARE) {
        next.add(key);
      }
      return next;
    });
  }

  if (favorites.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-400">
        아직 즐겨찾기한 단지가 없습니다. 아래 최근 거래 내역에서 ☆ 을 눌러 추가해보세요.
      </p>
    );
  }

  const compareTargets: CompareTarget[] = favorites
    .filter((f) => compareKeys.has(favKey(f)))
    .map((f) => ({
      regionCode: f.region_code,
      dong: f.dong,
      aptName: f.apt_name,
      label: `${f.district} ${f.apt_name}`,
    }));

  return (
    <div>
      {compareKeys.size > 0 && (
        <div className="mb-3 flex items-center gap-2 text-sm">
          <span className="text-gray-500">{compareKeys.size}개 단지 선택됨</span>
          <button
            onClick={() => setShowCompare(true)}
            disabled={compareKeys.size < 2}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            비교하기
          </button>
          <button
            onClick={() => setCompareKeys(new Set())}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
          >
            선택 해제
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {favorites.map((fav) => {
          const key = favKey(fav);
          const checked = compareKeys.has(key);
          return (
            <div
              key={fav.id}
              className={`flex items-start justify-between rounded-xl border bg-white p-4 shadow-sm ${
                checked ? "border-blue-400 ring-1 ring-blue-400" : "border-gray-200"
              }`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCompare(key)}
                  disabled={!checked && compareKeys.size >= MAX_COMPARE}
                  title="비교에 추가"
                  className="mt-1"
                />
                <div>
                  <p className="text-xs text-gray-400">
                    {fav.city} {fav.district} {fav.dong}
                  </p>
                  <button
                    onClick={() =>
                      setHistoryTarget({
                        regionCode: fav.region_code,
                        dong: fav.dong,
                        aptName: fav.apt_name,
                      })
                    }
                    className="mt-0.5 text-left font-medium text-gray-900 hover:underline"
                  >
                    {fav.apt_name}
                  </button>
                  {fav.latestDealAmount ? (
                    <p className="mt-1 text-sm text-gray-600">
                      최근 {formatEok(fav.latestDealAmount)}
                      <span className="text-xs text-gray-400">
                        {" "}
                        ({fav.latestExclusiveArea}m², {fav.latestDealDate})
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-gray-400">아직 수집된 거래 없음</p>
                  )}
                  {fav.trend.length > 1 && (
                    <div className="mt-2 w-40">
                      <TrendChart data={fav.trend} height={48} compact />
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => onRemove(fav.id)}
                disabled={removingId === fav.id}
                title="즐겨찾기 삭제"
                className="text-xs text-gray-300 hover:text-red-500"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {historyTarget && (
        <ApartmentHistoryModal
          regionCode={historyTarget.regionCode}
          dong={historyTarget.dong}
          aptName={historyTarget.aptName}
          onClose={() => setHistoryTarget(null)}
        />
      )}

      {showCompare && compareTargets.length >= 2 && (
        <ApartmentCompareModal targets={compareTargets} onClose={() => setShowCompare(false)} />
      )}
    </div>
  );
}
