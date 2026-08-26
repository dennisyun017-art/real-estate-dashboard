"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import { useRouter } from "next/navigation";
import { REGIONS } from "@/lib/regions";
import type { RegionSummary } from "@/lib/queries";

function formatEok(manwon: number): string {
  return `${(manwon / 10000).toFixed(1)}억`;
}

// 평당가에 따라 파랑(저가) → 빨강(고가)으로 보간
function priceColor(value: number, min: number, max: number): string {
  if (max <= min) return "#3b82f6";
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const r = Math.round(59 + t * (239 - 59));
  const g = Math.round(130 + t * (68 - 130));
  const b = Math.round(246 + t * (68 - 246));
  return `rgb(${r},${g},${b})`;
}

export default function RegionMap({
  summary,
  selectedRegion,
}: {
  summary: RegionSummary[];
  selectedRegion: string;
}) {
  const router = useRouter();
  const summaryMap = new Map(summary.map((s) => [s.regionCode, s]));

  const prices = summary.map((s) => s.avgPricePerPyeong).filter((v) => v > 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 1;
  const maxCount = Math.max(1, ...summary.map((s) => s.count));

  return (
    <div className="h-[280px] w-full overflow-hidden rounded-xl sm:h-[420px]">
    <MapContainer
      center={[36.6, 127.3]}
      zoom={7}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {REGIONS.map((region) => {
        const s = summaryMap.get(region.code);
        const count = s?.count ?? 0;
        const price = s?.avgPricePerPyeong ?? 0;
        const radius = count > 0 ? 4 + Math.sqrt(count / maxCount) * 16 : 3;
        const color = count > 0 ? priceColor(price, minPrice, maxPrice) : "#d1d5db";
        const isSelected = region.code === selectedRegion;

        return (
          <CircleMarker
            key={region.code}
            center={[region.lat, region.lng]}
            radius={radius}
            pathOptions={{
              color: isSelected ? "#111827" : color,
              weight: isSelected ? 2 : 1,
              fillColor: color,
              fillOpacity: 0.6,
            }}
            eventHandlers={{
              click: () => router.push(`/?region=${region.code}`),
            }}
          >
            <Tooltip direction="top" offset={[0, -4]}>
              <div className="text-xs">
                <strong>
                  {region.city} {region.district}
                </strong>
                <br />
                {count > 0 ? (
                  <>
                    {formatEok(price)}/평 · 거래 {count}건
                  </>
                ) : (
                  "이번달 거래 없음"
                )}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
    </div>
  );
}
