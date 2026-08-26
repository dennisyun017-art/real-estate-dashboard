"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FavoriteWithLatest } from "@/lib/queries";
import TrendChart from "@/components/TrendChart";

function formatEok(manwon: number): string {
  return `${(manwon / 10000).toFixed(1)}억`;
}

export default function FavoritesList({
  favorites,
}: {
  favorites: FavoriteWithLatest[];
}) {
  const router = useRouter();
  const [removingId, setRemovingId] = useState<number | null>(null);

  async function onRemove(id: number) {
    setRemovingId(id);
    await fetch(`/api/favorites/${id}`, { method: "DELETE" });
    setRemovingId(null);
    router.refresh();
  }

  if (favorites.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-400">
        아직 즐겨찾기한 단지가 없습니다. 아래 최근 거래 내역에서 ☆ 을 눌러 추가해보세요.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {favorites.map((fav) => (
        <div
          key={fav.id}
          className="flex items-start justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div>
            <p className="text-xs text-gray-400">
              {fav.city} {fav.district} {fav.dong}
            </p>
            <p className="mt-0.5 font-medium text-gray-900">{fav.apt_name}</p>
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
          <button
            onClick={() => onRemove(fav.id)}
            disabled={removingId === fav.id}
            title="즐겨찾기 삭제"
            className="text-xs text-gray-300 hover:text-red-500"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
