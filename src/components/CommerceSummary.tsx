import type { CommerceCategory } from "@/lib/queries";

const CATEGORY_ICON: Record<string, string> = {
  "소매": "🛒",
  "음식": "🍽️",
  "보건의료": "🏥",
  "교육": "📚",
  "예술·스포츠": "🎨",
  "수리·개인": "💇",
  "과학·기술": "🔬",
  "시설관리·임대": "🏢",
  "부동산": "🏘️",
  "숙박": "🏨",
};

export default function CommerceSummary({
  items,
  collectedAt,
}: {
  items: CommerceCategory[];
  collectedAt: string | null;
}) {
  if (items.length === 0) {
    return (
      <p className="text-xs text-gray-400">
        아직 수집된 생활 인프라 데이터가 없습니다.
      </p>
    );
  }

  const max = Math.max(...items.map((i) => i.count));

  return (
    <div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.category} className="flex items-center gap-2 text-xs">
            <span className="w-24 shrink-0 truncate text-gray-600">
              {CATEGORY_ICON[item.category] ?? "📍"} {item.category}
            </span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-blue-400"
                style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right font-medium text-gray-800">
              {item.count.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-gray-300">
        구 중심좌표 기준 반경 3km 내 상가업소 수 (소상공인시장진흥공단 상권정보
        {collectedAt
          ? ` · ${new Date(collectedAt).toLocaleDateString("ko-KR")} 기준`
          : ""}
        )
      </p>
    </div>
  );
}
