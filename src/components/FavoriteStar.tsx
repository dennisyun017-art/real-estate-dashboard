"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FavoriteStar({
  regionCode,
  city,
  district,
  dong,
  aptName,
  initiallyFavorited = false,
}: {
  regionCode: string;
  city: string;
  district: string;
  dong: string;
  aptName: string;
  initiallyFavorited?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(initiallyFavorited);

  async function onClick() {
    setLoading(true);
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regionCode, city, district, dong, aptName }),
    });
    setLoading(false);
    if (res.ok) {
      setAdded(true);
      router.refresh();
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={loading || added}
      title={added ? "즐겨찾기에 추가됨" : "즐겨찾기에 추가"}
      className="text-base leading-none text-gray-300 hover:text-yellow-500 disabled:text-yellow-500"
    >
      {added ? "★" : "☆"}
    </button>
  );
}
