"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function formatEok(manwon: number): string {
  return `${(manwon / 10000).toFixed(1)}억`;
}

export type WatchedRegion = {
  regionCode: string;
  city: string;
  district: string;
  avgPricePerPyeong: number | null;
  changePct: number | null;
};

export default function MyRegionWatchlist({ items }: { items: WatchedRegion[] }) {
  const router = useRouter();
  const [removingCode, setRemovingCode] = useState<string | null>(null);

  async function onRemove(regionCode: string) {
    setRemovingCode(regionCode);
    await fetch(`/api/favorite-regions/${regionCode}`, { method: "DELETE" });
    setRemovingCode(null);
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        아직 관심 지역이 없습니다. 아래 &quot;지역별 상세&quot;에서 ☆ 관심 지역 버튼을 눌러보세요.
      </p>
    );
  }

  return (
    <ol className="space-y-1.5">
      {items.map((r) => (
        <li key={r.regionCode} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm">
          <Link href={`/?region=${r.regionCode}`} className="flex-1 text-gray-700 hover:underline">
            {r.city} {r.district}
          </Link>
          <span className="flex items-center gap-2">
            {r.avgPricePerPyeong !== null ? (
              <>
                <span className="text-xs text-gray-400">
                  {formatEok(r.avgPricePerPyeong)}/평
                </span>
                {r.changePct !== null ? (
                  <span
                    className={`font-medium ${
                      r.changePct >= 0 ? "text-red-500" : "text-blue-500"
                    }`}
                  >
                    {r.changePct >= 0 ? "▲" : "▼"} {Math.abs(r.changePct)}%
                  </span>
                ) : (
                  <span className="text-xs text-gray-300">전월 데이터 없음</span>
                )}
              </>
            ) : (
              <span className="text-xs text-gray-300">데이터 없음</span>
            )}
            <button
              onClick={() => onRemove(r.regionCode)}
              disabled={removingCode === r.regionCode}
              title="관심 지역에서 제거"
              className="text-xs text-gray-300 hover:text-red-500"
            >
              ✕
            </button>
          </span>
        </li>
      ))}
    </ol>
  );
}
