"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FavoriteRegionStar({
  regionCode,
  city,
  district,
  initiallyFavorited = false,
}: {
  regionCode: string;
  city: string;
  district: string;
  initiallyFavorited?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [favorited, setFavorited] = useState(initiallyFavorited);

  async function onClick() {
    setLoading(true);
    if (favorited) {
      await fetch(`/api/favorite-regions/${regionCode}`, { method: "DELETE" });
      setFavorited(false);
    } else {
      await fetch("/api/favorite-regions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regionCode, city, district }),
      });
      setFavorited(true);
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={favorited ? "관심 지역에서 제거" : "관심 지역으로 추가"}
      className="flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50"
    >
      <span className={favorited ? "text-yellow-500" : "text-gray-300"}>
        {favorited ? "★" : "☆"}
      </span>
      관심 지역
    </button>
  );
}
