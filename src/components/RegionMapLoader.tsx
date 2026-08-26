"use client";

import dynamic from "next/dynamic";

// Leaflet은 브라우저 전역(window)에 의존하므로 서버 렌더링 없이 클라이언트에서만 로드합니다.
const RegionMap = dynamic(() => import("@/components/RegionMap"), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-400"
      style={{ height: 420 }}
    >
      지도를 불러오는 중...
    </div>
  ),
});

export default RegionMap;
