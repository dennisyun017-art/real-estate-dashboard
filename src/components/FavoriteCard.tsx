"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TrendChart from "@/components/TrendChart";
import type { FavoriteWithLatest } from "@/lib/queries";

function formatEok(manwon: number): string {
  return `${(manwon / 10000).toFixed(1)}억`;
}

export default function FavoriteCard({
  fav,
  checked,
  onToggleCompare,
  compareDisabled,
  onOpenHistory,
  onRemove,
  removing,
}: {
  fav: FavoriteWithLatest;
  checked: boolean;
  onToggleCompare: () => void;
  compareDisabled: boolean;
  onOpenHistory: () => void;
  onRemove: () => void;
  removing: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: fav.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start justify-between rounded-xl border bg-white p-4 shadow-sm ${
        checked ? "border-blue-400 ring-1 ring-blue-400" : "border-gray-200"
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          title="드래그해서 순서 바꾸기"
          className="mt-1 cursor-grab touch-none text-gray-300 hover:text-gray-500 active:cursor-grabbing"
        >
          ⠿
        </button>
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggleCompare}
          disabled={!checked && compareDisabled}
          title="비교에 추가"
          className="mt-1"
        />
        <div>
          <p className="text-xs text-gray-400">
            {fav.city} {fav.district} {fav.dong}
          </p>
          <button
            onClick={onOpenHistory}
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
        onClick={onRemove}
        disabled={removing}
        title="즐겨찾기 삭제"
        className="text-xs text-gray-300 hover:text-red-500"
      >
        ✕
      </button>
    </div>
  );
}
