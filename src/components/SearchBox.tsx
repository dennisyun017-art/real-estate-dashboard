"use client";

import { useEffect, useRef, useState } from "react";
import FavoriteStar from "@/components/FavoriteStar";
import type { ApartmentSearchResult } from "@/lib/queries";

function formatEok(manwon: number): string {
  return `${(manwon / 10000).toFixed(1)}억`;
}

export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ApartmentSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 1) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
      }
      setLoading(false);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="단지명으로 검색 (예: 래미안, 힐스테이트...)"
        className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {loading && <p className="mt-2 text-xs text-gray-400">검색 중...</p>}
      {results.length > 0 && (
        <div className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {results.map((r) => (
            <div
              key={`${r.regionCode}-${r.dong}-${r.aptName}`}
              className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
            >
              <div>
                <span className="font-medium text-gray-800">{r.aptName}</span>
                <span className="ml-2 text-xs text-gray-400">
                  {r.city} {r.district} {r.dong}
                </span>
                <div className="text-xs text-gray-400">
                  최근 {formatEok(r.latestDealAmount)} ({r.latestDealDate}) · 거래 {r.count}건
                </div>
              </div>
              <FavoriteStar
                regionCode={r.regionCode}
                city={r.city}
                district={r.district}
                dong={r.dong}
                aptName={r.aptName}
              />
            </div>
          ))}
        </div>
      )}
      {!loading && query.trim().length > 0 && results.length === 0 && (
        <p className="mt-2 text-xs text-gray-400">검색 결과가 없습니다.</p>
      )}
    </div>
  );
}
