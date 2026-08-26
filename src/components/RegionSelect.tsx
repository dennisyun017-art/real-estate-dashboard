"use client";

import { useRouter } from "next/navigation";
import { REGIONS } from "@/lib/regions";

export default function RegionSelect({ selected }: { selected: string }) {
  const router = useRouter();

  return (
    <select
      value={selected}
      onChange={(e) => router.push(`/?region=${e.target.value}`)}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:w-auto"
    >
      {REGIONS.map((r) => (
        <option key={r.code} value={r.code}>
          {r.city} {r.district}
        </option>
      ))}
    </select>
  );
}
