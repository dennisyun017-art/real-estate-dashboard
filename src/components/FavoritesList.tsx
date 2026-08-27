"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import type { FavoriteWithLatest } from "@/lib/queries";
import FavoriteCard from "@/components/FavoriteCard";
import ApartmentHistoryModal from "@/components/ApartmentHistoryModal";
import ApartmentCompareModal, {
  type CompareTarget,
} from "@/components/ApartmentCompareModal";

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
  const [items, setItems] = useState(favorites);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [historyTarget, setHistoryTarget] = useState<{
    regionCode: string;
    dong: string;
    aptName: string;
  } | null>(null);
  const [compareKeys, setCompareKeys] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);

  // 서버에서 새로 내려온 목록(즐겨찾기 추가/삭제 등)과 동기화
  useEffect(() => {
    setItems(favorites);
  }, [favorites]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

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

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((f) => f.id === active.id);
    const newIndex = items.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered); // 낙관적 업데이트 — 바로 화면에 반영

    await fetch("/api/favorites/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((f) => f.id) }),
    });
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-400">
        아직 즐겨찾기한 단지가 없습니다. 아래 최근 거래 내역에서 ☆ 을 눌러 추가해보세요.
      </p>
    );
  }

  const compareTargets: CompareTarget[] = items
    .filter((f) => compareKeys.has(favKey(f)))
    .map((f) => ({
      regionCode: f.region_code,
      dong: f.dong,
      aptName: f.apt_name,
      label: `${f.district} ${f.apt_name}`,
    }));

  return (
    <div>
      <p className="mb-2 text-xs text-gray-400">
        ⠿ 을 드래그하면 원하는 순서로 바꿀 수 있어요. 기본은 지역별로 묶어서 보여줍니다.
      </p>

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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((f) => f.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((fav) => {
              const key = favKey(fav);
              const checked = compareKeys.has(key);
              return (
                <FavoriteCard
                  key={fav.id}
                  fav={fav}
                  checked={checked}
                  compareDisabled={compareKeys.size >= MAX_COMPARE}
                  onToggleCompare={() => toggleCompare(key)}
                  onOpenHistory={() =>
                    setHistoryTarget({
                      regionCode: fav.region_code,
                      dong: fav.dong,
                      aptName: fav.apt_name,
                    })
                  }
                  onRemove={() => onRemove(fav.id)}
                  removing={removingId === fav.id}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

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
