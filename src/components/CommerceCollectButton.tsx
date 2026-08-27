"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { REGIONS } from "@/lib/regions";

export default function CommerceCollectButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [failCount, setFailCount] = useState(0);

  async function run() {
    if (running) return;
    setRunning(true);
    setDone(0);
    setFailCount(0);
    setLog([]);

    let fails = 0;
    for (let i = 0; i < REGIONS.length; i++) {
      const region = REGIONS[i];
      try {
        const res = await fetch("/api/commerce-collect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ regionCode: region.code }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? `status ${res.status}`);
        setLog((prev) =>
          [`${region.city} ${region.district} — 업종 ${json.items?.length ?? 0}개`, ...prev].slice(0, 6)
        );
      } catch (e) {
        fails++;
        setFailCount(fails);
        setLog((prev) =>
          [
            `❌ ${region.city} ${region.district}: ${e instanceof Error ? e.message : String(e)}`,
            ...prev,
          ].slice(0, 6)
        );
      }
      setDone(i + 1);
    }

    setRunning(false);
    router.refresh();
  }

  return (
    <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-gray-500">
          전체 {REGIONS.length}개 지역을 다시 수집합니다. 지역마다 순차로 호출해서 몇 분 정도
          걸릴 수 있어요.
        </span>
        <button
          onClick={run}
          disabled={running}
          className="shrink-0 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {running ? `수집 중… (${done}/${REGIONS.length})` : "🔄 인프라 데이터 갱신"}
        </button>
      </div>

      {running && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${(done / REGIONS.length) * 100}%` }}
          />
        </div>
      )}

      {!running && done > 0 && (
        <p className="mt-2 text-xs text-gray-400">
          완료: {done}개 지역 처리{failCount > 0 ? ` (실패 ${failCount}건)` : ""}
        </p>
      )}

      {log.length > 0 && (
        <div className="mt-2 space-y-0.5 text-[11px] text-gray-400">
          {log.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
      )}
    </div>
  );
}
